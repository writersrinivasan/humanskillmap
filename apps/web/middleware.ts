import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

const PUBLIC_ROUTES = ['/login', '/verify-otp']
const ADMIN_ROUTES = ['/admin']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Create Supabase client that reads/writes cookies on the response
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          )
        },
      },
    }
  )

  // Refresh session (extends expiry if valid)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // If accessing a public auth route while already logged in, send to app
  if (PUBLIC_ROUTES.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/upload', request.url))
  }

  // If accessing a protected route without auth, send to login
  const isProtected =
    !PUBLIC_ROUTES.includes(pathname) &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api') &&
    pathname !== '/'

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin route guard
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && user) {
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userRow || !['admin', 'super_admin'].includes(userRow.role)) {
      return NextResponse.redirect(new URL('/profile', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
