import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes (no auth required)
  const isPublicRoute = request.nextUrl.pathname.startsWith('/shop') ||
                        request.nextUrl.pathname.startsWith('/order-success') ||
                        request.nextUrl.pathname.startsWith('/api/orders') ||
                        request.nextUrl.pathname.startsWith('/api/shop') ||
                        request.nextUrl.pathname.startsWith('/api/webhooks') ||
                        request.nextUrl.pathname.startsWith('/api/verify-payment')

  // Auth pages
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register')

  // Protected routes (vendor dashboard)
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                           request.nextUrl.pathname === '/' ||
                           request.nextUrl.pathname.startsWith('/orders') ||
                           request.nextUrl.pathname.startsWith('/products') ||
                           request.nextUrl.pathname.startsWith('/analyze') ||
                           request.nextUrl.pathname.startsWith('/stats') ||
                           request.nextUrl.pathname.startsWith('/settings') ||
                           request.nextUrl.pathname.startsWith('/marketing') ||
                           request.nextUrl.pathname.startsWith('/subscription') ||
                           request.nextUrl.pathname.startsWith('/categories') ||
                           request.nextUrl.pathname.startsWith('/promos') ||
                           request.nextUrl.pathname.startsWith('/admin')

  // Skip auth check for public routes
  if (isPublicRoute) {
    return supabaseResponse
  }

  if (!user && isProtectedRoute && !request.nextUrl.pathname.startsWith('/api')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
