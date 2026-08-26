import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  REMEMBER_COOKIE,
  authCookieOptions,
  hostnameFromHeader,
  isLoopbackHost,
  mergeAuthCookieOptions,
} from '@/lib/supabase/cookie-options'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // ── ix-cookiesecure ────────────────────────────────────────────────────────
  // This is the write that actually decides the cookie's lifetime. It runs on
  // EVERY request and it runs last, so whatever lib/supabase/client.ts set at
  // sign-in is overwritten here seconds later. Before this, it built a client
  // with no cookieOptions at all — no `secure`, and @supabase/ssr's 400-day
  // default maxAge, which is where the expiry contradicting "remember me" came
  // from.
  //
  // The intent cannot be read back off the auth cookie (a request carries only
  // name=value, never its maxAge), so it travels in a companion cookie. Absent
  // is read as "no", which is the safe default.
  const rememberMe = request.cookies.get(REMEMBER_COOKIE)?.value === '1'
  // From the Host HEADER, not nextUrl.hostname — see hostnameFromHeader. In dev
  // nextUrl.hostname is always 'localhost' regardless of the requested host, so
  // deciding Secure from it would key the flag on the server's binding.
  // Unrecognised or absent host → secure, which is the safe direction.
  const requestHost = hostnameFromHeader(request.headers.get('host'))
  const secure = requestHost === null || !isLoopbackHost(requestHost)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions(rememberMe, secure),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            // Merged rather than passed through: cookieOptions above covers the
            // library's own writes, but this callback receives per-cookie
            // options that can still carry a maxAge/expires of their own.
            // Merging ours last is what guarantees one answer.
            response.cookies.set(name, value, mergeAuthCookieOptions(options, rememberMe, secure))
          )
        },
      },
      // @supabase/realtime-js v2.108+ explicitly detects Cloudflare Workers
      // (via WebSocketPair being defined) and throws from WebSocketFactory
      // .getWebSocketConstructor() when no transport is provided. Middleware
      // never uses Realtime — providing globalThis.WebSocket as the transport
      // bypasses the factory check entirely.
      realtime: {
        transport: globalThis.WebSocket,
      },
    }
  )

  // Refreshes the session token on every request. Must not have any logic
  // between createServerClient and getUser() — doing so risks session bugs.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Protected routes — redirect unauthenticated users to login.
  // /intake is here as well as checking its own claims: the page redirects an
  // employee to /dashboard, but an anonymous visitor should never reach a
  // server component that resolves a firm at all.
  const isProtected =
    path.startsWith('/dashboard') ||
    path.startsWith('/update-password') ||
    path.startsWith('/intake')
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Auth pages — redirect already-authenticated users to dashboard
  const isAuthPage = path === '/login' || path === '/forgot-password'
  if (isAuthPage && user) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    // `training-content/` is the static SCORM package (~325 files: html/js/css/
    // json/fonts/audio). Without this exclusion every asset request would run
    // middleware and pay a supabase.auth.getUser() round-trip.
    //
    // `verify/` is public by definition — a regulator or client scanning a QR
    // code has no session and never will. Running middleware there would spend
    // a getUser() round-trip on every scan to learn nothing, on the one route
    // whose latency is measured while someone stands holding a piece of paper.
    '/((?!_next/static|_next/image|favicon.ico|api/|training-content/|verify|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
