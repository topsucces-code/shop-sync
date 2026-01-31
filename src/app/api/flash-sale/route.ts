import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/evolution-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { title, message, imageUrl, discountPercent, validUntil } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Titre et message requis' },
        { status: 400 }
      )
    }

    // Get vendor profile for shop link
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_name, slug')
      .eq('id', user.id)
      .single()

    const shopLink = profile?.slug
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://shop-sync.app'}/shop/${profile.slug}`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'https://shop-sync.app'}/shop/${user.id}`

    // Create flash sale record
    const { data: flashSale, error: saleError } = await supabase
      .from('flash_sales')
      .insert({
        vendor_id: user.id,
        title,
        message,
        image_url: imageUrl,
        discount_percent: discountPercent,
        valid_until: validUntil,
      } as never)
      .select()
      .single()

    if (saleError) {
      console.error('Error creating flash sale:', saleError)
      return NextResponse.json(
        { error: 'Erreur lors de la création' },
        { status: 500 }
      )
    }

    // Get all opted-in customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('phone, name, whatsapp_id')
      .eq('vendor_id', user.id)
      .eq('opted_in', true)

    if (customersError || !customers || customers.length === 0) {
      return NextResponse.json({
        success: true,
        flashSale,
        sentCount: 0,
        message: 'Vente flash créée mais aucun client à notifier',
      })
    }

    // Build the promotional message
    let promoMessage = `🔥 *${title}* 🔥\n\n`
    promoMessage += `${message}\n\n`

    if (discountPercent) {
      promoMessage += `💰 *-${discountPercent}%* sur votre commande!\n\n`
    }

    if (validUntil) {
      const validDate = new Date(validUntil)
      promoMessage += `⏰ Offre valable jusqu'au ${validDate.toLocaleDateString('fr-CI')}\n\n`
    }

    promoMessage += `👉 Commandez maintenant: ${shopLink}\n\n`
    promoMessage += `_${profile?.shop_name || 'Votre boutique'}_`

    // Send to all customers
    let sentCount = 0
    const errors: string[] = []

    for (const customer of customers) {
      try {
        // Format phone number for WhatsApp
        let phone = (customer as { phone: string }).phone.replace(/\s/g, '')
        if (!phone.startsWith('+') && !phone.startsWith('225')) {
          phone = '225' + phone
        }
        if (phone.startsWith('+')) {
          phone = phone.substring(1)
        }

        // Send via Evolution API
        await sendWhatsAppMessage(phone, promoMessage, imageUrl)
        sentCount++
      } catch (err) {
        errors.push(`${(customer as { phone: string }).phone}: ${err}`)
      }
    }

    // Update sent count
    await supabase
      .from('flash_sales')
      .update({ sent_count: sentCount } as never)
      .eq('id', (flashSale as { id: string }).id)

    // Create notification for vendor
    await supabase
      .from('notifications')
      .insert({
        vendor_id: user.id,
        type: 'flash_sale',
        title: 'Vente Flash envoyée',
        message: `"${title}" envoyé à ${sentCount} client${sentCount > 1 ? 's' : ''}`,
        data: { flash_sale_id: (flashSale as { id: string }).id, sent_count: sentCount },
      } as never)

    return NextResponse.json({
      success: true,
      flashSale,
      sentCount,
      totalCustomers: customers.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Vente flash envoyée à ${sentCount}/${customers.length} clients`,
    })
  } catch (error) {
    console.error('Error in flash sale:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Get flash sale history
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: flashSales, error } = await supabase
      .from('flash_sales')
      .select('*')
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors du chargement' },
        { status: 500 }
      )
    }

    return NextResponse.json({ flashSales })
  } catch (error) {
    console.error('Error fetching flash sales:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
