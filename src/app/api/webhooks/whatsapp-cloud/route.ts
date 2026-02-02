import { NextRequest, NextResponse } from 'next/server'

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const VERIFY_TOKEN = 'shopsync2024'

// Verification endpoint (GET) - Meta sends this to verify the webhook
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// Message handler (POST) - Meta sends messages here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('WhatsApp Cloud Webhook received:', JSON.stringify(body, null, 2))

    // Extract message data
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages

    if (messages && messages.length > 0) {
      const message = messages[0]
      const from = message.from // sender phone number
      const messageType = message.type
      const text = message.text?.body || ''

      console.log(`Message from ${from}: ${text}`)

      // Auto-reply based on message content
      const replyText = generateReply(text)

      if (replyText) {
        await sendWhatsAppMessage(from, replyText)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp Cloud Webhook Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Generate reply based on message
function generateReply(text: string): string | null {
  const lowerText = text.toLowerCase().trim()

  if (lowerText.includes('bonjour') || lowerText.includes('salut') || lowerText.includes('hello')) {
    return `Bonjour et bienvenue chez Shop-Sync!

Pour voir notre catalogue et passer commande:
https://shop-sync-ten.vercel.app/shop/aa6be8ad-3216-480c-8758-9e0735d434c4

Tapez "aide" pour plus d'options.`
  }

  if (lowerText.includes('aide') || lowerText.includes('help')) {
    return `Comment puis-je vous aider?

- Tapez "catalogue" pour voir nos produits
- Tapez "commande" pour passer une commande
- Tapez "contact" pour nous joindre

Visitez: https://shop-sync-ten.vercel.app`
  }

  if (lowerText.includes('catalogue') || lowerText.includes('produit') || lowerText.includes('menu')) {
    return `Decouvrez notre catalogue:
https://shop-sync-ten.vercel.app/shop/aa6be8ad-3216-480c-8758-9e0735d434c4

Passez commande directement en ligne!`
  }

  // Default reply for first message
  if (text.length > 0) {
    return `Merci pour votre message!

Visitez notre boutique: https://shop-sync-ten.vercel.app/shop/aa6be8ad-3216-480c-8758-9e0735d434c4

Tapez "aide" pour plus d'options.`
  }

  return null
}

// Send message via WhatsApp Cloud API
async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.error('WhatsApp credentials not configured')
    return
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: text }
        }),
      }
    )

    const result = await response.json()
    console.log('Message sent:', result)
    return result
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error)
  }
}
