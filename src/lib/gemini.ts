import { GoogleGenerativeAI } from '@google/generative-ai'
import { ReceiptAnalysis } from '@/types/database'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const RECEIPT_ANALYSIS_PROMPT = `Analyse ce reçu de paiement Mobile Money de Côte d'Ivoire.
Extrais les informations suivantes au format JSON strict:
{
  "amount": number (montant en FCFA, sans symbole ni espace),
  "date": "YYYY-MM-DD HH:mm:ss" (format ISO),
  "transaction_id": "string (ex: PP260130..., TXN..., etc.)",
  "network": "wave" | "orange" | "mtn" | "other",
  "sender_name": "string (nom de l'expéditeur)",
  "sender_phone": "string (numéro de téléphone)",
  "confidence": number (0 à 1, niveau de confiance de l'extraction)
}

Instructions:
- Si une information n'est pas lisible ou absente, utilise null
- Pour le réseau, identifie par le logo ou le format du reçu:
  - Wave: logo bleu, format "PP..." pour transaction_id
  - Orange Money: logo orange
  - MTN Mobile Money: logo jaune
- Le montant doit être un nombre sans formatage (ex: 5000 et non "5 000 FCFA")
- La confiance doit refléter la lisibilité globale de l'image

Réponds UNIQUEMENT avec le JSON, sans texte additionnel.`

export async function analyzeReceipt(imageBase64: string): Promise<ReceiptAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      RECEIPT_ANALYSIS_PROMPT,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ])

    const response = result.response
    const text = response.text()

    // Clean up the response - remove markdown code blocks if present
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const analysis: ReceiptAnalysis = JSON.parse(cleanedText)

    return {
      amount: analysis.amount,
      date: analysis.date,
      transaction_id: analysis.transaction_id,
      network: analysis.network,
      sender_name: analysis.sender_name,
      sender_phone: analysis.sender_phone,
      confidence: analysis.confidence ?? 0.5,
    }
  } catch (error) {
    console.error('Error analyzing receipt:', error)
    return {
      amount: null,
      date: null,
      transaction_id: null,
      network: null,
      sender_name: null,
      sender_phone: null,
      confidence: 0,
      raw_text: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
