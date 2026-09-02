import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isFirmNameBlank } from '@/lib/firm-name'
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
  //
  // ⚠️ There is deliberately NO intake gate here any more. Batch 4 put one in
  // this file — a per-request query that redirected an admin with no submitted
  // intake to /intake. Katy reversed the decision behind it on 2026-08-26 12:11:
  // "The problem is that the intake is time consuming. People will want to
  // explore without having to fill it all in." Nothing redirects now, so nothing
  // here should pay a database round-trip on every request to find out. The same
  // question is asked once, in app/dashboard/page.tsx, where the answer drives a
  // notice instead. See lib/intake/gate.ts.
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

  // ── The blank-firm-name gate ───────────────────────────────────────────────
  //
  // 🔴 THIS MUST LIVE IN MIDDLEWARE, NOT IN A LAYOUT. A shared layout does not
  // re-render on a soft navigation, so a gate written there passes on the first
  // request and is then silently absent for every client-side link the user
  // clicks afterwards. That is exactly how the 2026-08-26 gate was got wrong.
  // Middleware runs on every navigation, hard and soft alike.
  //
  // ⚠️ This is NOT a revival of the intake gate Katy killed on 2026-08-26 12:11
  // ("People will want to explore without having to fill it all in"). That gate
  // demanded a SUBMITTED 31-question intake before the dashboard would open.
  // This demands ONE field, and the firm explores freely the moment it is
  // answered. The distinction is the whole reason this is allowed to exist —
  // do not widen it to any other condition.
  //
  // ── The cost, stated honestly ───────────────────────────────────────────────
  //
  // One indexed single-row read, and only for a signed-in ADMIN on a gated
  // path. Anonymous visitors, employees, public pages, /api/*, static assets and
  // the SCORM package all pay nothing — role and firm_id come off app_metadata
  // in the token this request already fetched, so the cheap checks happen first
  // and the query only runs when every one of them passes. Once a name exists
  // the gate never fires again for that firm.
  //
  // 🔴 It reuses the SSR client above and does NOT build a service-role client.
  // Three reasons, and the second one is a real bug avoided rather than a
  // preference:
  //
  //   1. RLS already scopes it. 0001's `firm_admin_own_firm` grants a firm
  //      admin their own row via app_metadata in the JWT, so the query can only
  //      ever see this firm — the scoping is enforced by the database rather
  //      than by the .eq() below remembering to be right.
  //   2. createAdminClient() does NOT pass `realtime: { transport }`. That
  //      workaround exists ten lines above because @supabase/realtime-js throws
  //      from its constructor when it detects Cloudflare Workers, which is what
  //      made every request 500 in June 2026. It would not reproduce under
  //      `next dev` — only in workerd and production.
  //   3. It keeps SUPABASE_SERVICE_ROLE_KEY out of the middleware bundle, which
  //      runs on every request.
  const role = user?.app_metadata?.role as string | undefined
  const firmId = user?.app_metadata?.firm_id as string | undefined

  // Employees are deliberately NOT gated: the firm name is the admin's field,
  // so gating staff would trap them behind something they cannot fix.
  if (user && role === 'admin' && firmId && !isNameGateExempt(path)) {
    try {
      const { data: firm } = await supabase
        .from('firms')
        .select('name')
        .eq('id', firmId)
        .maybeSingle()

      if (isFirmNameBlank(firm?.name)) {
        const url = new URL('/onboarding/firm-name', request.url)
        // Carried so the firm resumes where it was aiming rather than being
        // dumped somewhere generic. The destination re-validates it — never
        // trust a path off a URL into a redirect.
        url.searchParams.set('next', path)
        return NextResponse.redirect(url)
      }
    } catch (err) {
      // FAILS OPEN. A database hiccup must not lock every admin out of the
      // product behind a name step whose own save would be failing too. The
      // consequence of failing open is a blank name for one page load; the
      // consequence of failing closed is an outage.
      console.error('[middleware] firm-name gate check failed:', err)
    }
  }

  return response
}

/**
 * Paths the blank-name gate must never fire on.
 *
 * Everything here would either break a flow the firm needs in order to reach
 * the name step at all, or loop.
 */
function isNameGateExempt(path: string): boolean {
  return (
    // The name step itself, and its /api write — gating either is an infinite
    // redirect the firm cannot escape. (/api/* is already outside the matcher;
    // named anyway so the exemption survives a matcher change.)
    path.startsWith('/onboarding') ||
    path.startsWith('/api/') ||
    // Sign-in must be allowed to COMPLETE before anything reads a session. The
    // callback and confirm routes are mid-handshake; redirecting out of them
    // drops the code or token and strands the user on the login page.
    path.startsWith('/auth/') ||
    // A password reset, and an invited member's first visit. An admin locked
    // out of their own account cannot reach the name step to clear the gate,
    // so the recovery path has to stay open.
    path.startsWith('/update-password') ||
    path.startsWith('/forgot-password') ||
    // Signing out. The form POSTs to /api/auth/logout (already exempt above),
    // and the sign-out landing is '/', which is public and ungated anyway —
    // but an admin must always be able to leave rather than be held by a gate.
    path === '/login' ||
    // Legal pages are reachable without an account and must stay reachable
    // with one: a firm being asked for a name is entitled to read the terms it
    // accepted first.
    path === '/terms' ||
    path === '/privacy' ||
    path === '/cookies'
  )
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
