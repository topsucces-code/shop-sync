/**
 * Evolution API Client for WhatsApp Integration
 * Documentation: https://doc.evolution-api.com/
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || ''

interface SendMessageOptions {
  to: string
  text: string
}

interface SendButtonsOptions {
  to: string
  title: string
  description: string
  footer?: string
  buttons: Array<{
    type: 'reply'
    reply: {
      id: string
      title: string
    }
  }>
}

interface SendMediaOptions {
  to: string
  mediaType: 'image' | 'video' | 'audio' | 'document'
  url?: string
  base64?: string
  caption?: string
  fileName?: string
}

export class EvolutionAPI {
  private baseUrl: string
  private apiKey: string
  private instance: string

  constructor() {
    this.baseUrl = EVOLUTION_API_URL
    this.apiKey = EVOLUTION_API_KEY
    this.instance = EVOLUTION_INSTANCE
  }

  private async request(endpoint: string, method: string = 'POST', body?: unknown) {
    const url = `${this.baseUrl}/${endpoint}`

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Evolution API Error:', error)
        throw new Error(`Evolution API Error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Evolution API Request Failed:', error)
      throw error
    }
  }

  /**
   * Send a text message
   */
  async sendText({ to, text }: SendMessageOptions) {
    return this.request(`message/sendText/${this.instance}`, 'POST', {
      number: this.formatPhoneNumber(to),
      text,
    })
  }

  /**
   * Send buttons message
   */
  async sendButtons({ to, title, description, footer, buttons }: SendButtonsOptions) {
    return this.request(`message/sendButtons/${this.instance}`, 'POST', {
      number: this.formatPhoneNumber(to),
      title,
      description,
      footer,
      buttons,
    })
  }

  /**
   * Send media (image, video, audio, document)
   */
  async sendMedia({ to, mediaType, url, base64, caption, fileName }: SendMediaOptions) {
    return this.request(`message/sendMedia/${this.instance}`, 'POST', {
      number: this.formatPhoneNumber(to),
      mediatype: mediaType,
      media: url || base64,
      caption,
      fileName,
    })
  }

  /**
   * Send a link with preview
   */
  async sendLink(to: string, url: string, caption: string) {
    return this.request(`message/sendText/${this.instance}`, 'POST', {
      number: this.formatPhoneNumber(to),
      text: `${caption}\n\n🔗 ${url}`,
      linkPreview: true,
    })
  }

  /**
   * Get media (image/audio/document) as base64
   */
  async getMediaBase64(messageId: string): Promise<string | null> {
    try {
      const response = await this.request(
        `chat/getBase64FromMediaMessage/${this.instance}`,
        'POST',
        { message: { key: { id: messageId } } }
      )
      return response?.base64 || null
    } catch {
      return null
    }
  }

  /**
   * Format phone number for WhatsApp
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')

    // Add country code if missing (default to Ivory Coast +225)
    if (!cleaned.startsWith('225') && cleaned.length === 10) {
      cleaned = '225' + cleaned
    }

    return cleaned
  }
}

// Singleton instance
export const evolutionAPI = new EvolutionAPI()

/**
 * Helper function to send WhatsApp message
 * Used by flash-sale and other modules
 */
export async function sendWhatsAppMessage(phone: string, message: string, imageUrl?: string | null) {
  if (imageUrl) {
    return evolutionAPI.sendMedia({
      to: phone,
      mediaType: 'image',
      url: imageUrl,
      caption: message,
    })
  }
  return evolutionAPI.sendText({
    to: phone,
    text: message,
  })
}

// Message templates
export const WhatsAppMessages = {
  welcome: (shopName: string, catalogUrl: string) => `
👋 Bienvenue chez *${shopName}* !

Pour voir notre catalogue et passer commande, cliquez sur le lien ci-dessous :

🛒 ${catalogUrl}

📱 Après votre commande, envoyez-nous la capture d'écran de votre paiement Mobile Money ici pour validation automatique.
`.trim(),

  catalogLink: (catalogUrl: string) => `
🛍️ *Notre Catalogue*

Découvrez tous nos produits et passez commande en ligne :

👉 ${catalogUrl}

💡 Paiement accepté : Wave, Orange Money, MTN MoMo
`.trim(),

  paymentReceived: (orderId: string) => `
✅ *Paiement Vérifié !*

Votre paiement a été confirmé avec succès.

📦 Référence : *${orderId}*

Votre commande est en cours de préparation. Nous vous contacterons pour la livraison.

Merci pour votre confiance ! 🙏
`.trim(),

  paymentFailed: (reason: string) => `
❌ *Erreur de Paiement*

Nous n'avons pas pu vérifier votre paiement.

📝 Raison : ${reason}

💬 Veuillez contacter le vendeur ou réessayer avec une image plus claire du reçu.
`.trim(),

  paymentFraud: () => `
⚠️ *Alerte*

Ce reçu a déjà été utilisé pour une autre commande.

Veuillez effectuer un nouveau paiement et envoyer le nouveau reçu.
`.trim(),

  askForOrder: () => `
📋 Pour vérifier votre paiement, j'ai besoin de connaître votre commande.

Veuillez d'abord passer commande sur notre site, puis envoyez la capture de votre paiement avec votre *numéro de commande*.

Exemple : "Commande ABC123"
`.trim(),

  help: (shopName: string) => `
🤖 *Bot ${shopName}*

Commandes disponibles :
• Envoyez "catalogue" pour voir nos produits
• Envoyez "aide" pour ce message
• Envoyez une image de reçu Mobile Money pour vérifier un paiement

📞 Besoin d'aide ? Tapez "humain" pour parler à un conseiller.
`.trim(),
}
