import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// This route is public, and every uncached hit is a database query. Remember
// the last result per isolate for a few seconds so a flood of requests can't
// turn into a flood of queries; a monitor polling every minute or so still
// sees fresh state.
const CACHE_MS = 10_000
let last: { at: number; ok: boolean } | null = null

function respond(ok: boolean) {
  return ok
    ? Response.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() })
    : Response.json(
        { status: 'degraded', db: 'error', timestamp: new Date().toISOString() },
        { status: 503 }
      )
}

export async function GET() {
  if (last && Date.now() - last.at < CACHE_MS) return respond(last.ok)

  let ok = false
  try {
    const { error } = await createAdminClient()
      .from('courses')
      .select('id', { head: true, count: 'exact' })

    if (error) console.error('[health] db check failed', error)
    else ok = true
  } catch (err) {
    console.error('[health] db check failed', err)
  }

  last = { at: Date.now(), ok }
  return respond(ok)
}
