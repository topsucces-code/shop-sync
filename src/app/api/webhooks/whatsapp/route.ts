import { NextRequest, NextResponse } from 'next/server'
import { evolutionAPI, WhatsAppMessages } from '@/lib/evolution-api'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Evolution API Webhook Event Types
interface WebhookMessage {
  event: string
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    pushName?: string
    message?: {
      conversation?: string
      extendedTextMessage?: {
        text: string
      }
      imageMessage?: {
        url?: string
        mimetype?: string
        caption?: string
      }
    }
    messageType?: string
  }
}

// Extract phone number from WhatsApp JID
function extractPhone(jid: string): string {
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

// Get text from message
function getMessageText(message: WebhookMessage['data']['message']): string | null {
  if (!message) return null
  return message.conversation || message.extendedTextMessage?.text || null
}

// Check if message is an image
function isImageMessage(message: WebhookMessage['data']['message']): boolean {
  return !!message?.imageMessage
}

// Find vendor by phone number
async function findVendorByPhone(phone: string) {
  // Try to find a vendor whose WhatsApp is connected to this number
  // For now, we'll use a config-based approach
  const vendorId = process.env.DEFAULT_VENDOR_ID

  if (vendorId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', vendorId)
      .single()
    return data
  }

  // Fallback: try to find vendor by phone
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', phone)
    .single()

  return data
}

// Find recent pending order for customer
async function findPendingOrder(customerPhone: string, vendorId: string) {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('customer_phone', customerPhone)
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

// Parse order ID from message caption
function extractOrderId(text: string | null | undefined): string | null {
  if (!text) return null

  // Try to match patterns like "Commande ABC123", "Ref: ABC123", etc.
  const patterns = [
    /commande\s*[:#]?\s*([A-Za-z0-9-]+)/i,
    /ref(?:erence)?\s*[:#]?\s*([A-Za-z0-9-]+)/i,
    /order\s*[:#]?\s*([A-Za-z0-9-]+)/i,
    /([a-f0-9]{8})/i, // UUID first 8 chars
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }

  return null
}

// Verify payment via internal API
async function verifyPayment(orderId: string, imageBase64: string, network: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      imageBase64,
      paymentNetwork: network,
    }),
  })

  return await response.json()
}

export async function POST(request: NextRequest) {
  try {
    const webhook: WebhookMessage = await request.json()

    console.log('WhatsApp Webhook received:', JSON.stringify(webhook, null, 2))

    // Only process incoming messages (not from ourselves)
    if (webhook.event !== 'messages.upsert' || webhook.data.key.fromMe) {
      return NextResponse.json({ success: true })
    }

    const phone = extractPhone(webhook.data.key.remoteJid)
    const messageId = webhook.data.key.id
    const customerName = webhook.data.pushName || 'Client'

    // Find the vendor (shop owner)
    const vendor = await findVendorByPhone(phone)

    if (!vendor) {
      console.log('No vendor found for this WhatsApp instance')
      return NextResponse.json({ success: true })
    }

    const shopUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/${vendor.id}`

    // Handle IMAGE MESSAGE → Payment verification
    if (isImageMessage(webhook.data.message)) {
      console.log('Processing image message for payment verification')

      // Get image as base64
      const imageBase64 = await evolutionAPI.getMediaBase64(messageId)

      if (!imageBase64) {
        await evolutionAPI.sendText({
          to: phone,
          text: WhatsAppMessages.paymentFailed('Impossible de télécharger l\'image. Veuillez réessayer.'),
        })
        return NextResponse.json({ success: true })
      }

      // Try to find order ID from caption
      const caption = webhook.data.message?.imageMessage?.caption
      let orderId = extractOrderId(caption)

      // If no order ID in caption, look for recent pending order
      if (!orderId) {
        const pendingOrder = await findPendingOrder(phone, vendor.id)
        if (pendingOrder) {
          orderId = pendingOrder.id
        }
      }

      if (!orderId) {
        await evolutionAPI.sendText({
          to: phone,
          text: WhatsAppMessages.askForOrder(),
        })
        return NextResponse.json({ success: true })
      }

      // Verify the payment
      const result = await verifyPayment(orderId, imageBase64, 'other')

      if (result.success) {
        await evolutionAPI.sendText({
          to: phone,
          text: WhatsAppMessages.paymentReceived(orderId.slice(0, 8).toUpperCase()),
        })
      } else if (result.fraud) {
        await evolutionAPI.sendText({
          to: phone,
          text: WhatsAppMessages.paymentFraud(),
        })
      } else {
        await evolutionAPI.sendText({
          to: phone,
          text: WhatsAppMessages.paymentFailed(result.error || 'Erreur de vérification'),
        })
      }

      return NextResponse.json({ success: true })
    }

    // Handle TEXT MESSAGE
    const text = getMessageText(webhook.data.message)?.toLowerCase().trim()

    if (!text) {
      return NextResponse.json({ success: true })
    }

    // Command: Catalog / Products / Menu
    if (
      text.includes('catalogue') ||
      text.includes('catalog') ||
      text.includes('produit') ||
      text.includes('menu') ||
      text.includes('commander') ||
      text.includes('acheter')
    ) {
      await evolutionAPI.sendText({
        to: phone,
        text: WhatsAppMessages.catalogLink(shopUrl),
      })
      return NextResponse.json({ success: true })
    }

    // Command: Help
    if (text.includes('aide') || text.includes('help') || text === '?') {
      await evolutionAPI.sendText({
        to: phone,
        text: WhatsAppMessages.help(vendor.shop_name),
      })
      return NextResponse.json({ success: true })
    }

    // Command: Human support
    if (text.includes('humain') || text.includes('support') || text.includes('conseiller')) {
      await evolutionAPI.sendText({
        to: phone,
        text: `🙋 Un conseiller va vous répondre sous peu.\n\nEn attendant, vous pouvez consulter notre catalogue : ${shopUrl}`,
      })
      return NextResponse.json({ success: true })
    }

    // Default: Welcome message with catalog
    // Only for greetings or unknown messages
    if (
      text.includes('bonjour') ||
      text.includes('salut') ||
      text.includes('hello') ||
      text.includes('hi') ||
      text.includes('bonsoir') ||
      text.length < 20 // Short messages are likely greetings
    ) {
      await evolutionAPI.sendText({
        to: phone,
        text: WhatsAppMessages.welcome(vendor.shop_name, shopUrl),
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('WhatsApp Webhook Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// GET endpoint for webhook verification (some services require this)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get('hub.challenge')

  if (challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ status: 'WhatsApp webhook is active' })
}
