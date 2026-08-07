/**
 * ix-cookiesecure — auth-cookie option resolution.
 *
 * Two defects, entangled: `secure` was never set anywhere, and middleware.ts
 * rebuilt its own client with no cookieOptions and overwrote the browser
 * client's "remember me" intent with @supabase/ssr's 400-day default on every
 * single request.
 *
 * 🔴 The test that earns its keep is `hostnameFromHeader`. The first version of
 * this fix keyed `secure` on `request.nextUrl.hostname` — which Next's dev
 * server normalises to 'localhost' REGARDLESS of the Host header. Measured
 * 2026-08-07: a request carrying `Host: iurixaccreditation.com` reported
 * `nextUrl.hostname === 'localhost'`, so `Secure` was silently omitted for
 * every host. It looked correct, typechecked, and was wrong.
 */

import { describe, it, expect } from 'vitest'
import {
  REMEMBER_MAX_AGE,
  authCookieOptions,
  hostnameFromHeader,
  isLoopbackHost,
  mergeAuthCookieOptions,
} from '@/lib/supabase/cookie-options'

describe('hostnameFromHeader', () => {
  it('strips the port', () => {
    expect(hostnameFromHeader('localhost:3000')).toBe('localhost')
    expect(hostnameFromHeader('iurixaccreditation.com:443')).toBe('iurixaccreditation.com')
  })

  it('handles a bare host', () => {
    expect(hostnameFromHeader('iurixaccreditation.com')).toBe('iurixaccreditation.com')
  })

  it('lowercases, since Host is case-insensitive', () => {
    expect(hostnameFromHeader('IurixAccreditation.COM')).toBe('iurixaccreditation.com')
  })

  it('keeps a bracketed IPv6 literal intact rather than splitting on its colons', () => {
    expect(hostnameFromHeader('[::1]:3000')).toBe('[::1]')
    expect(hostnameFromHeader('[::1]')).toBe('[::1]')
  })

  it('returns null for absent or empty input, so the caller can fail secure', () => {
    expect(hostnameFromHeader(null)).toBeNull()
    expect(hostnameFromHeader(undefined)).toBeNull()
    expect(hostnameFromHeader('   ')).toBeNull()
  })
})

describe('isLoopbackHost — the inverse decides Secure, so it fails secure', () => {
  it('recognises loopback', () => {
    for (const h of ['localhost', '127.0.0.1', '::1', '[::1]', 'app.localhost', 'LOCALHOST']) {
      expect(isLoopbackHost(h)).toBe(true)
    }
  })

  it('treats every real host as non-loopback', () => {
    for (const h of ['iurixaccreditation.com', 'www.iurixaccreditation.com', 'example.workers.dev']) {
      expect(isLoopbackHost(h)).toBe(false)
    }
  })

  it('does not match a domain that merely CONTAINS localhost', () => {
    // `notlocalhost.com` must not be treated as dev — endsWith('.localhost')
    // is the check, not includes('localhost').
    expect(isLoopbackHost('notlocalhost.com')).toBe(false)
    expect(isLoopbackHost('localhost.evil.com')).toBe(false)
  })
})

describe('authCookieOptions', () => {
  it('sets a 30-day maxAge when remembered', () => {
    expect(authCookieOptions(true, true)).toEqual({
      path: '/',
      sameSite: 'lax',
      secure: true,
      maxAge: REMEMBER_MAX_AGE,
    })
  })

  it('OMITS maxAge entirely when not remembered — that is what makes it a session cookie', () => {
    const opts = authCookieOptions(false, true)
    expect('maxAge' in opts).toBe(false)
  })

  it('never sets httpOnly — @supabase/ssr needs the browser to read this cookie', () => {
    expect('httpOnly' in authCookieOptions(true, true)).toBe(false)
    expect('httpOnly' in authCookieOptions(false, false)).toBe(false)
  })
})

describe('mergeAuthCookieOptions — the clobber guard', () => {
  // What @supabase/ssr hands the setAll callback.
  const libraryDefaults = { path: '/', sameSite: 'lax' as const, maxAge: 34560000 }

  it('overrides the library 400-day maxAge with 30 days when remembered', () => {
    expect(mergeAuthCookieOptions(libraryDefaults, true, true).maxAge).toBe(REMEMBER_MAX_AGE)
  })

  it('🔴 CLEARS the library maxAge when not remembered, rather than inheriting it', () => {
    // The whole reason this function exists. A plain spread of options that
    // simply OMIT maxAge leaves the library's 34560000 in place — which is the
    // 400-day expiry that contradicted "remember me". Both maxAge and expires
    // must be explicitly undefined.
    const merged = mergeAuthCookieOptions({ ...libraryDefaults, expires: new Date() }, false, true)
    expect(merged.maxAge).toBeUndefined()
    expect(merged.expires).toBeUndefined()
  })

  it('applies secure in both remember states', () => {
    expect(mergeAuthCookieOptions(libraryDefaults, true, true).secure).toBe(true)
    expect(mergeAuthCookieOptions(libraryDefaults, false, true).secure).toBe(true)
  })

  it('leaves secure off for loopback, so http://localhost dev still signs in', () => {
    expect(mergeAuthCookieOptions(libraryDefaults, true, false).secure).toBe(false)
  })
})

describe('the end-to-end decision, as middleware makes it', () => {
  // Mirrors middleware.ts: hostnameFromHeader(host) → isLoopbackHost → secure.
  const decide = (hostHeader: string | null) => {
    const h = hostnameFromHeader(hostHeader)
    return h === null || !isLoopbackHost(h)
  }

  it('the live domain gets Secure', () => {
    expect(decide('iurixaccreditation.com')).toBe(true)
  })

  it('a preview Worker URL gets Secure', () => {
    expect(decide('branch-worker.iurix.workers.dev')).toBe(true)
  })

  it('localhost dev does not', () => {
    expect(decide('localhost:3000')).toBe(false)
    expect(decide('127.0.0.1:3000')).toBe(false)
  })

  it('a MISSING Host header fails secure', () => {
    expect(decide(null)).toBe(true)
  })
})
