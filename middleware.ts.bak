import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const OWNER_EMAIL = process.env.OWNER_EMAIL?.toLowerCase().trim() || null;

function isOwnerEmail(email: string | null | undefined): boolean {
  if (!OWNER_EMAIL || !email) return false;
  return email.toLowerCase().trim() === OWNER_EMAIL;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes check
  const protectedRoutes = ['/dashboard', '/operator', '/buyer', '/referrer']
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // OWNER EMAIL HARDENING: Force owner to /operator, block other portals
  if (user && isOwnerEmail(user.email)) {
    const path = request.nextUrl.pathname;
    // If owner tries to access buyer or referrer portals, redirect to operator
    if (path.startsWith('/buyer') || path.startsWith('/referrer')) {
      return NextResponse.redirect(new URL('/operator', request.url));
    }
    // Owner can always access /operator regardless of role in database
    if (path.startsWith('/operator')) {
      return response;
    }
  }

  // Role-based access control (for non-owner users)
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      const path = request.nextUrl.pathname
      if (path.startsWith('/operator') && profile.role !== 'operator') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      if (path.startsWith('/buyer') && profile.role !== 'buyer') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      if (path.startsWith('/referrer') && profile.role !== 'referrer') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
