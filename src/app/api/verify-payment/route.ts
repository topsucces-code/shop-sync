import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/evolution-api'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const VERIFICATION_PROMPT = `Tu es un expert comptable ivoirien spécialisé dans la vérification des reçus Mobile Money (Wave, Orange Money, MTN MoMo).

Analyse cette capture d'écran de reçu de paiement et extrais les informations suivantes au format JSON strict:

{
  "is_valid_receipt": boolean (true si c'est un vrai reçu Mobile Money),
  "amount": number (montant exact en FCFA, sans symbole ni espace),
  "transaction_id": "string" (identifiant unique de la transaction, ex: PP260130..., TXN..., etc.),
  "network": "wave" | "orange" | "mtn" | "other",
  "date": "YYYY-MM-DD HH:mm:ss" (date et heure de la transaction),
  "sender_phone": "string" (numéro de l'expéditeur si visible),
  "confidence": number (0 à 1, niveau de confiance)
}

IMPORTANT:
- Si ce n'est pas un reçu Mobile Money valide, retourne is_valid_receipt: false
- L'ID de transaction doit être EXACT, caractère par caractère
- Le montant doit être un nombre entier (pas de décimales pour FCFA)
- Si une information n'est pas lisible, utilise null

Réponds UNIQUEMENT avec le JSON, sans texte additionnel.`

interface VerificationResult {
  is_valid_receipt: boolean
  amount: number | null
  transaction_id: string | null
  network: 'wave' | 'orange' | 'mtn' | 'other' | null
  date: string | null
  sender_phone: string | null
  confidence: number
}

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface OrderItems {
  products: OrderItem[]
  subtotal: number
  delivery_fee: number
  commune: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, imageBase64, paymentNetwork } = body

    if (!orderId || !imageBase64) {
      return NextResponse.json(
        { error: 'Order ID et image requis' },
        { status: 400 }
      )
    }

    // 1. Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que la commande n'est pas déjà payée
    if (order.payment_status === 'verified') {
      return NextResponse.json(
        { error: 'Cette commande est déjà payée' },
        { status: 400 }
      )
    }

    // 2. Analyser le reçu avec Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      VERIFICATION_PROMPT,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ])

    const responseText = result.response.text()
    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let verification: VerificationResult
    try {
      verification = JSON.parse(cleanedText)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Impossible de lire le reçu. Veuillez réessayer avec une image plus claire.',
        details: { raw: cleanedText }
      }, { status: 400 })
    }

    // 3. Vérifications anti-fraude

    // 3a. Vérifier que c'est un reçu valide
    if (!verification.is_valid_receipt) {
      return NextResponse.json({
        success: false,
        error: 'Ce n\'est pas un reçu Mobile Money valide.',
        verification
      }, { status: 400 })
    }

    // 3b. Vérifier que l'ID de transaction existe
    if (!verification.transaction_id) {
      return NextResponse.json({
        success: false,
        error: 'ID de transaction non trouvé sur le reçu.',
        verification
      }, { status: 400 })
    }

    // 3c. Vérifier que l'ID de transaction n'a pas déjà été utilisé
    const { data: existingTxn } = await supabase
      .from('used_transactions')
      .select('id, order_id')
      .eq('transaction_id', verification.transaction_id)
      .single()

    if (existingTxn) {
      return NextResponse.json({
        success: false,
        error: '⚠️ FRAUDE DÉTECTÉE: Ce reçu a déjà été utilisé pour une autre commande!',
        fraud: true,
        verification
      }, { status: 400 })
    }

    // 3d. Vérifier que le montant correspond
    if (!verification.amount) {
      return NextResponse.json({
        success: false,
        error: 'Montant non lisible sur le reçu.',
        verification
      }, { status: 400 })
    }

    const expectedAmount = Number(order.total_amount)
    const receivedAmount = verification.amount

    // Tolérance de 100 FCFA pour les arrondis
    const amountDifference = Math.abs(expectedAmount - receivedAmount)
    if (amountDifference > 100) {
      return NextResponse.json({
        success: false,
        error: `Le montant ne correspond pas. Attendu: ${expectedAmount} FCFA, Reçu: ${receivedAmount} FCFA`,
        verification,
        expected: expectedAmount,
        received: receivedAmount
      }, { status: 400 })
    }

    // 3e. Vérifier le niveau de confiance
    if (verification.confidence < 0.5) {
      return NextResponse.json({
        success: false,
        error: 'Image de mauvaise qualité. Veuillez reprendre une photo plus nette.',
        verification
      }, { status: 400 })
    }

    // 4. Tout est valide! Enregistrer la transaction et mettre à jour la commande

    // 4a. Upload de l'image
    const fileName = `${order.vendor_id}/${orderId}-${Date.now()}.jpg`
    const buffer = Buffer.from(imageBase64, 'base64')

    await supabase.storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)

    // 4b. Enregistrer l'ID de transaction comme utilisé
    await supabase
      .from('used_transactions')
      .insert({
        transaction_id: verification.transaction_id,
        order_id: orderId,
        vendor_id: order.vendor_id,
        amount: verification.amount,
        network: verification.network || paymentNetwork,
      })

    // 4c. Mettre à jour la commande
    await supabase
      .from('orders')
      .update({
        payment_status: 'verified',
        payment_proof_url: urlData.publicUrl,
        payment_network: verification.network || paymentNetwork,
        transaction_id: verification.transaction_id,
        transaction_date: verification.date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    // 4d. Diminuer le stock des produits
    const orderItems = order.items as OrderItems
    if (orderItems?.products) {
      for (const item of orderItems.products) {
        // Récupérer le stock actuel
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single()

        if (product) {
          const newStock = Math.max(0, (product.stock || 0) - item.quantity)
          await supabase
            .from('products')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', item.id)
        }
      }
    }

    // 4e. Sauvegarder l'analyse dans receipt_analyses
    await supabase
      .from('receipt_analyses')
      .insert({
        vendor_id: order.vendor_id,
        order_id: orderId,
        image_url: urlData.publicUrl,
        extracted_data: verification,
        confidence_score: verification.confidence,
      })

    // 4f. Calculer et enregistrer la commission
    const { data: vendorProfile } = await supabase
      .from('profiles')
      .select('plan, orders_this_month')
      .eq('id', order.vendor_id)
      .single()

    const vendorPlan = (vendorProfile as { plan: string } | null)?.plan || 'free'
    let commissionRate = 0.03 // Default 3%
    if (vendorPlan === 'pro') commissionRate = 0.015
    else if (vendorPlan === 'business') commissionRate = 0.005

    const commissionAmount = Math.round(verification.amount * commissionRate)

    // Record commission
    await supabase
      .from('commissions')
      .insert({
        vendor_id: order.vendor_id,
        order_id: orderId,
        order_amount: verification.amount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending',
      })

    // Update monthly order count
    const currentMonthOrders = (vendorProfile as { orders_this_month: number } | null)?.orders_this_month || 0
    await supabase
      .from('profiles')
      .update({ orders_this_month: currentMonthOrders + 1 } as never)
      .eq('id', order.vendor_id)

    // 5. WHATSAPP AUTO NOTIFICATION TO CUSTOMER
    if (order.customer_phone) {
      try {
        // Get vendor info for message
        const { data: vendorInfo } = await supabase
          .from('profiles')
          .select('shop_name, phone')
          .eq('id', order.vendor_id)
          .single()

        const shopName = (vendorInfo as { shop_name: string } | null)?.shop_name || 'La boutique'
        const vendorPhone = (vendorInfo as { phone: string } | null)?.phone || ''

        const confirmationMessage = `✅ *Paiement Confirmé!*

Merci pour votre achat chez *${shopName}*!

📦 Commande: #${orderId.slice(0, 8).toUpperCase()}
💰 Montant: ${verification.amount?.toLocaleString()} FCFA
🧾 Transaction: ${verification.transaction_id}

Votre commande est en cours de préparation.
${vendorPhone ? `📞 Contact: ${vendorPhone}` : ''}

Merci pour votre confiance! 🙏`

        // Format phone number
        let customerPhone = order.customer_phone.replace(/\s/g, '')
        if (!customerPhone.startsWith('+') && !customerPhone.startsWith('225')) {
          customerPhone = '225' + customerPhone
        }
        if (customerPhone.startsWith('+')) {
          customerPhone = customerPhone.substring(1)
        }

        await sendWhatsAppMessage(customerPhone, confirmationMessage)

        // Log the message
        await supabase
          .from('whatsapp_messages')
          .insert({
            vendor_id: order.vendor_id,
            order_id: orderId,
            customer_phone: order.customer_phone,
            message_type: 'payment_verified',
            message_content: confirmationMessage,
            status: 'sent',
            sent_at: new Date().toISOString(),
          } as never)
      } catch (whatsappError) {
        console.error('WhatsApp notification failed:', whatsappError)
        // Don't fail the payment verification if WhatsApp fails
      }
    }

    // 6. CHECK LOW STOCK ALERTS
    if (orderItems?.products) {
      for (const item of orderItems.products) {
        const { data: product } = await supabase
          .from('products')
          .select('name, stock, low_stock_threshold')
          .eq('id', item.id)
          .single()

        if (product) {
          const productData = product as { name: string; stock: number; low_stock_threshold: number }
          const threshold = productData.low_stock_threshold || 5

          if (productData.stock <= threshold && productData.stock > 0) {
            // Create stock alert notification
            await supabase
              .from('notifications')
              .insert({
                vendor_id: order.vendor_id,
                type: 'stock',
                title: '⚠️ Stock bas',
                message: `${productData.name} n'a plus que ${productData.stock} unité(s) en stock`,
                data: { product_id: item.id, current_stock: productData.stock },
              } as never)
          } else if (productData.stock === 0) {
            // Create out of stock notification
            await supabase
              .from('notifications')
              .insert({
                vendor_id: order.vendor_id,
                type: 'stock',
                title: '🚨 Rupture de stock',
                message: `${productData.name} est en rupture de stock!`,
                data: { product_id: item.id, current_stock: 0 },
              } as never)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Paiement vérifié avec succès!',
      verification: {
        amount: verification.amount,
        transaction_id: verification.transaction_id,
        network: verification.network,
        date: verification.date,
      },
      commission: {
        rate: `${(commissionRate * 100).toFixed(1)}%`,
        amount: commissionAmount,
      }
    })

  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du paiement' },
      { status: 500 }
    )
  }
}
