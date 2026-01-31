import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for payment proof upload
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const body = await request.json()
    const { imageBase64, paymentNetwork } = body

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Image requise' },
        { status: 400 }
      )
    }

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, vendor_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    // Upload image to storage
    const fileName = `${order.vendor_id}/${orderId}-${Date.now()}.jpg`
    const buffer = Buffer.from(imageBase64, 'base64')

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)

    // Update order with payment proof
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_proof_url: urlData.publicUrl,
        payment_network: paymentNetwork || 'other',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Preuve de paiement envoyée avec succès',
    })
  } catch (error) {
    console.error('Error uploading payment proof:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
