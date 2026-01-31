import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Check if string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Code promo requis' },
        { status: 400 }
      )
    }

    // Get vendor ID (if slug was provided)
    let actualVendorId = vendorId
    if (!isUUID(vendorId)) {
      const { data: vendor } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', vendorId)
        .single()

      if (!vendor) {
        return NextResponse.json(
          { error: 'Boutique non trouvée' },
          { status: 404 }
        )
      }
      actualVendorId = (vendor as { id: string }).id
    }

    // Check promo code
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('id, code, discount_type, discount_value, min_order_amount, max_uses, uses_count, valid_until, is_active')
      .eq('vendor_id', actualVendorId)
      .eq('code', code.toUpperCase())
      .single()

    if (error || !promo) {
      return NextResponse.json(
        { error: 'Code promo invalide' },
        { status: 404 }
      )
    }

    const promoData = promo as {
      id: string
      code: string
      discount_type: string
      discount_value: number
      min_order_amount: number
      max_uses: number | null
      uses_count: number
      valid_until: string | null
      is_active: boolean
    }

    // Check if active
    if (!promoData.is_active) {
      return NextResponse.json(
        { error: 'Ce code promo n\'est plus actif' },
        { status: 400 }
      )
    }

    // Check expiration
    if (promoData.valid_until && new Date(promoData.valid_until) < new Date()) {
      return NextResponse.json(
        { error: 'Ce code promo a expiré' },
        { status: 400 }
      )
    }

    // Check usage limit
    if (promoData.max_uses && promoData.uses_count >= promoData.max_uses) {
      return NextResponse.json(
        { error: 'Ce code promo a atteint sa limite d\'utilisation' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      promo: {
        id: promoData.id,
        code: promoData.code,
        discount_type: promoData.discount_type,
        discount_value: promoData.discount_value,
        min_order_amount: promoData.min_order_amount,
      }
    })
  } catch (error) {
    console.error('Error checking promo:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
