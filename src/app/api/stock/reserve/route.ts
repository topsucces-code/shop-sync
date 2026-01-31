import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Reserve stock for 30 minutes
const RESERVATION_DURATION_MINUTES = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, orderId } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array required' },
        { status: 400 }
      )
    }

    // First release any expired reservations
    await supabase.rpc('release_expired_reservations')

    const expiresAt = new Date(Date.now() + RESERVATION_DURATION_MINUTES * 60 * 1000)
    const reservations = []
    const insufficientStock = []

    for (const item of items) {
      // Check available stock using the function
      const { data: availableStock } = await supabase
        .rpc('get_available_stock', { p_product_id: item.id })

      if (availableStock < item.quantity) {
        // Get product name for error message
        const { data: product } = await supabase
          .from('products')
          .select('name')
          .eq('id', item.id)
          .single()

        insufficientStock.push({
          id: item.id,
          name: product?.name || 'Produit inconnu',
          requested: item.quantity,
          available: availableStock,
        })
        continue
      }

      // Create reservation
      const { data: reservation, error } = await supabase
        .from('stock_reservations')
        .insert({
          product_id: item.id,
          order_id: orderId || null,
          quantity: item.quantity,
          expires_at: expiresAt.toISOString(),
          status: 'active',
        } as never)
        .select()
        .single()

      if (!error && reservation) {
        reservations.push(reservation)
      }
    }

    if (insufficientStock.length > 0) {
      // Rollback any reservations made
      for (const res of reservations) {
        await supabase
          .from('stock_reservations')
          .delete()
          .eq('id', (res as { id: string }).id)
      }

      return NextResponse.json(
        {
          error: 'Stock insuffisant',
          insufficientStock,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      reservations,
      expiresAt: expiresAt.toISOString(),
      message: `Stock réservé pour ${RESERVATION_DURATION_MINUTES} minutes`,
    })
  } catch (error) {
    console.error('Error reserving stock:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Confirm reservations (when payment is verified)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required' },
        { status: 400 }
      )
    }

    // Update reservations to confirmed
    const { error } = await supabase
      .from('stock_reservations')
      .update({ status: 'confirmed' } as never)
      .eq('order_id', orderId)
      .eq('status', 'active')

    if (error) {
      console.error('Error confirming reservations:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la confirmation' },
        { status: 500 }
      )
    }

    // Reduce actual stock
    const { data: reservations } = await supabase
      .from('stock_reservations')
      .select('product_id, quantity')
      .eq('order_id', orderId)
      .eq('status', 'confirmed')

    if (reservations) {
      for (const res of reservations) {
        const productId = (res as { product_id: string }).product_id
        const quantity = (res as { quantity: number }).quantity

        // Try using RPC, fallback to manual update
        const { error: rpcError } = await supabase.rpc('decrement_stock', {
          p_product_id: productId,
          p_quantity: quantity,
        })

        if (rpcError) {
          // Fallback if RPC doesn't exist
          const { data } = await supabase
            .from('products')
            .select('stock')
            .eq('id', productId)
            .single()

          if (data) {
            await supabase
              .from('products')
              .update({ stock: Math.max(0, (data.stock || 0) - quantity) } as never)
              .eq('id', productId)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Réservations confirmées',
    })
  } catch (error) {
    console.error('Error confirming stock:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Cancel/release reservations
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('stock_reservations')
      .update({ status: 'cancelled' } as never)
      .eq('order_id', orderId)
      .eq('status', 'active')

    if (error) {
      console.error('Error cancelling reservations:', error)
      return NextResponse.json(
        { error: 'Erreur lors de l\'annulation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Réservations annulées',
    })
  } catch (error) {
    console.error('Error releasing stock:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
