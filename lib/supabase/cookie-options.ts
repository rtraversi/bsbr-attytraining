// =============================================================================
// Auth-cookie options — ONE definition, used by BOTH places that write them.
//
// ix-cookiesecure. Two defects, and they are entangled:
//
//  1. `secure` was never set anywhere. Any plain-HTTP request to the domain
//     carried the session token in the clear, before the HTTPS redirect fires.
//     A redirect does not protect the request that triggered it.
//
//  2. The "remember me" intent did not survive. lib/supabase/client.ts set
//     `maxAge` at sign-in, but middleware.ts builds its OWN createServerClient
//     with no cookieOptions at all and refreshes the session on EVERY request,
//     rewriting the cookie with whatever @supabase/ssr defaults to (400 days).
//     So the browser client's intent was overwritten seconds later, and a
//     "don't remember me" session persisted anyway.
//
// Fixing only client.ts would not have held — the middleware write always wins,
// because it happens last and happens constantly. Both paths import from here.
//
// ⚠️ httpOnly is deliberately NOT set. @supabase/ssr requires the BROWSER client
// to read this cookie; setting httpOnly breaks authentication outright. It is
// not an oversight and it is not a finding.
// =============================================================================

/** Long-lived choice: 30 days, matching the copy on the login form. */
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30

/**
 * Companion cookie recording the learner's "remember me" choice.
 *
 * Middleware cannot recover the intent from the auth cookie itself — a request
 * carries only `name=value`, never the maxAge it was written with. So the choice
 * is recorded separately, and middleware reads it on every refresh.
 *
 * Its own lifetime mirrors the choice: persistent for "remember me", a session
 * cookie otherwise. That matters — a PERSISTENT companion saying "no" would
 * outlive the browser and be indistinguishable from a real choice on the next
 * launch. Absent is therefore read as "no", which is the safe default.
 */
export const REMEMBER_COOKIE = 'ix-remember'

/**
 * Whether cookies for this hostname must carry `Secure`.
 *
 * Keyed on the hostname being loopback rather than on NEXT_PUBLIC_APP_URL or
 * NODE_ENV. `.env.local` sets NEXT_PUBLIC_APP_URL to the live https:// domain
 * even for local development, so deriving it from that would mark cookies
 * Secure on http://localhost and break sign-in for everyone working locally.
 *
 * The test is inverted on purpose: everything that is NOT loopback gets Secure.
 * An unrecognised host therefore fails SECURE rather than failing open.
 */
export function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h === '[::1]' ||
    h.endsWith('.localhost')
  )
}

/**
 * Pull a bare hostname out of a `Host` header value (strips the port).
 *
 * ⚠️ Read this before "simplifying" it back to `request.nextUrl.hostname`.
 *
 * `nextUrl.hostname` is NOT the host the client asked for. Next's dev server
 * normalises it to the address it is bound to: a request carrying
 * `Host: iurixaccreditation.com` still reports `nextUrl.hostname === 'localhost'`
 * (measured 2026-08-07). Deciding `Secure` from that means the flag is decided
 * by the server's binding rather than by the request, which is exactly the sort
 * of thing that silently ships without `Secure` in production.
 *
 * The `Host` header is trustworthy for this: a browser sets it from the URL it
 * is loading and page JavaScript cannot override it. `X-Forwarded-Host` is
 * deliberately NOT consulted — it is proxy-supplied, and honouring it would let
 * an intermediary DOWNGRADE the cookie by claiming the request was for
 * localhost.
 */
export function hostnameFromHeader(hostHeader: string | null | undefined): string | null {
  if (!hostHeader) return null
  const value = hostHeader.trim()
  if (!value) return null
  // Bracketed IPv6 literal, e.g. "[::1]:3000" — the colons inside the brackets
  // are part of the address, so a naive split on ':' would mangle it.
  if (value.startsWith('[')) {
    const end = value.indexOf(']')
    return end === -1 ? value.toLowerCase() : value.slice(0, end + 1).toLowerCase()
  }
  return value.split(':')[0].toLowerCase()
}

export interface AuthCookieOptions {
  path: string
  sameSite: 'lax'
  secure: boolean
  /** Omitted entirely for a session cookie — see mergeAuthCookieOptions. */
  maxAge?: number
}

/**
 * The options every auth-cookie write should carry.
 *
 * `sameSite: 'lax'` is @supabase/ssr's own default, restated here so the two
 * write paths cannot drift apart silently.
 */
export function authCookieOptions(rememberMe: boolean, secure: boolean): AuthCookieOptions {
  return {
    path: '/',
    sameSite: 'lax',
    secure,
    ...(rememberMe ? { maxAge: REMEMBER_MAX_AGE } : {}),
  }
}

/**
 * Merge our options OVER whatever @supabase/ssr handed the setAll callback.
 *
 * Spreading is not sufficient on its own. When the learner did NOT ask to be
 * remembered, `authCookieOptions` omits `maxAge` — and an omitted key does not
 * overwrite the library's 400-day `maxAge`, it inherits it. That is the exact
 * clobber this function exists to stop, so `maxAge` and `expires` are set to
 * `undefined` EXPLICITLY in that branch. Both are dropped during serialisation,
 * which is what produces a session cookie.
 */
/**
 * The shape produced by mergeAuthCookieOptions.
 *
 * The overridden keys are stripped off `T` before being re-added, rather than
 * intersected onto it. An intersection would collapse to `never` the moment the
 * base carried a conflicting type — e.g. `expires: Date` meeting
 * `expires?: undefined` — which is a compile error at the call site rather than
 * anything meaningful about the value.
 */
export type MergedAuthCookieOptions<T> = Omit<
  T,
  'path' | 'sameSite' | 'secure' | 'maxAge' | 'expires'
> & {
  path: string
  sameSite: 'lax'
  secure: boolean
  maxAge?: number
  expires?: Date
}

export function mergeAuthCookieOptions<T extends object>(
  base: T,
  rememberMe: boolean,
  secure: boolean
): MergedAuthCookieOptions<T> {
  const ours = authCookieOptions(rememberMe, secure)
  return {
    ...base,
    ...ours,
    ...(rememberMe ? {} : { maxAge: undefined, expires: undefined }),
  } as MergedAuthCookieOptions<T>
}

/* ── Browser-only helpers ──────────────────────────────────────────────────── */

/** Read the recorded choice. Absent → not remembered. */
export function readRememberCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie
    .split('; ')
    .some(c => c === `${REMEMBER_COOKIE}=1` || c.startsWith(`${REMEMBER_COOKIE}=1;`))
}

/**
 * Record the choice, immediately before signing in, so the first middleware
 * refresh after the redirect already sees it.
 */
export function writeRememberCookie(rememberMe: boolean): void {
  if (typeof document === 'undefined') return
  const secure = !isLoopbackHost(window.location.hostname)
  const parts = [
    `${REMEMBER_COOKIE}=${rememberMe ? '1' : '0'}`,
    'path=/',
    'samesite=lax',
    ...(rememberMe ? [`max-age=${REMEMBER_MAX_AGE}`] : []),
    ...(secure ? ['secure'] : []),
  ]
  document.cookie = parts.join('; ')
}
