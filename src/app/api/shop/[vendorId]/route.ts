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

    // Get vendor profile - support both UUID and slug
    let query = supabase
      .from('profiles')
      .select('id, shop_name, phone, address, logo_url, description, slug')

    if (isUUID(vendorId)) {
      query = query.eq('id', vendorId)
    } else {
      query = query.eq('slug', vendorId)
    }

    const { data: vendor, error: vendorError } = await query.single()

    if (vendorError || !vendor) {
      return NextResponse.json(
        { error: 'Boutique non trouvée' },
        { status: 404 }
      )
    }

    // Use actual vendor ID for related queries
    const actualVendorId = (vendor as { id: string }).id

    // Get vendor products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, stock, image_url, category_id')
      .eq('vendor_id', actualVendorId)
      .gt('stock', 0)
      .order('name')

    if (productsError) {
      console.error('Products error:', productsError)
      return NextResponse.json(
        { error: 'Erreur lors du chargement des produits' },
        { status: 500 }
      )
    }

    // Get vendor categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, icon')
      .eq('vendor_id', actualVendorId)
      .order('sort_order', { ascending: true })

    return NextResponse.json({
      vendor,
      products: products || [],
      categories: categories || [],
    })
  } catch (error) {
    console.error('Error in shop API:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
