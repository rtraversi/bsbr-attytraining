import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import {
  authCookieOptions,
  isLoopbackHost,
  readRememberCookie,
} from '@/lib/supabase/cookie-options'

// `rememberMe` controls auth-cookie persistence:
//   true  → 30-day cookie (survives browser restarts)
//   false → session cookie (maxAge omitted, clears when the browser closes)
//
// Callers that don't care about persistence call createClient() with no args.
// Those now INHERIT the recorded choice rather than defaulting to "session
// cookie": settings-client, update-form and forgot-form all build a client that
// can trigger a token refresh, and a refresh writing session-scoped cookies
// would silently downgrade a learner who did tick "remember me".
//
// `secure` is set here and identically in middleware.ts — see the header of
// lib/supabase/cookie-options.ts for why fixing only this file would not hold.
export function createClient(rememberMe?: boolean) {
  const remember = rememberMe ?? readRememberCookie()
  const secure =
    typeof window === 'undefined' ? true : !isLoopbackHost(window.location.hostname)

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions(remember, secure),
    }
  )
}
