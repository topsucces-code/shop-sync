import { NextRequest, NextResponse } from 'next/server'
import { analyzeReceipt } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'
import { Json } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { image, imageUrl } = body

    if (!image && !imageUrl) {
      return NextResponse.json(
        { error: 'Image requise (base64 ou URL)' },
        { status: 400 }
      )
    }

    let imageBase64 = image

    // If URL provided, fetch and convert to base64
    if (imageUrl && !image) {
      const imageResponse = await fetch(imageUrl)
      const arrayBuffer = await imageResponse.arrayBuffer()
      imageBase64 = Buffer.from(arrayBuffer).toString('base64')
    }

    // Analyze the receipt
    const analysis = await analyzeReceipt(imageBase64)

    // Optionally save to database
    if (body.saveToDb) {
      const { error: dbError } = await supabase
        .from('receipt_analyses')
        .insert({
          vendor_id: user.id,
          image_url: imageUrl || 'base64-upload',
          extracted_data: analysis as unknown as Json,
          confidence_score: analysis.confidence,
        } as never)

      if (dbError) {
        console.error('Error saving analysis:', dbError)
      }
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    console.error('Error in analyze-receipt:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse du reçu' },
      { status: 500 }
    )
  }
}
