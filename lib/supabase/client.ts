import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// `rememberMe` controls auth-cookie persistence:
//   true  → 30-day cookie (survives browser restarts)
//   false → session cookie (maxAge omitted, clears when the browser closes)
// Callers that don't care about persistence can call createClient() with no args.
export function createClient(rememberMe?: boolean) {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: rememberMe ? 60 * 60 * 24 * 30 : undefined,
      },
    }
  )
}
