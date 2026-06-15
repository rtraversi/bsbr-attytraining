import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
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
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
