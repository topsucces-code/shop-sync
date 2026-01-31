import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDeliveryFee } from '@/lib/delivery-fees'

// Use service role for public order creation (no auth required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      vendorId,
      customerName,
      customerPhone,
      commune,
      items
    } = body

    // Validate required fields
    if (!vendorId || !customerName || !customerPhone || !commune || !items?.length) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) =>
      sum + (item.price * item.quantity), 0
    )
    const deliveryFee = getDeliveryFee(commune)
    const totalAmount = subtotal + deliveryFee

    // Create the order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        vendor_id: vendorId,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_amount: totalAmount,
        payment_status: 'pending',
        items: {
          products: items,
          subtotal,
          delivery_fee: deliveryFee,
          commune,
        },
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating order:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la commande' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      totalAmount,
    })
  } catch (error) {
    console.error('Error in orders API:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
