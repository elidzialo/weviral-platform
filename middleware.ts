import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/admin', '/influencer', '/marketer']
const AUTH_ROUTES = ['/login', '/signup']

const ROLE_PORTALS: Record<string, string> = {
  admin: '/admin',
  influencer: '/influencer',
  marketer: '/marketer',
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
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session — required for Server Components to pick up auth state
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Unauthenticated user trying to access a protected route → redirect to /login
  if (!session && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user trying to access /login or /signup → redirect to their portal
  if (session && isAuthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = profile?.role as string | undefined
    const portalPath = role ? (ROLE_PORTALS[role] ?? '/') : '/'

    const portalUrl = request.nextUrl.clone()
    portalUrl.pathname = portalPath
    portalUrl.search = ''
    return NextResponse.redirect(portalUrl)
  }

  // Authenticated user accessing a protected route for a different role → redirect to own portal
  if (session && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = profile?.role as string | undefined

    if (role) {
      const allowedPrefix = ROLE_PORTALS[role]
      // If the route doesn't start with the user's own portal prefix, redirect them
      if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
        const portalUrl = request.nextUrl.clone()
        portalUrl.pathname = allowedPrefix
        portalUrl.search = ''
        return NextResponse.redirect(portalUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - api routes
     * - public files with an extension (e.g. .png, .svg)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
