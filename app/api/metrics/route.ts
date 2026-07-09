// Consumed by BetterStack uptime/telemetry and the future iurisdesk.com central hub —
// keep the response shape stable.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // Fail-closed secret gate — run BEFORE any query. Never log the secret value.
  const provided = req.headers.get('x-metrics-secret')
  const expected = process.env.METRICS_SECRET
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  // training_events has no user_id column, so distinct firm_member_id proxies
  // distinct active users; supabase-js has no COUNT(DISTINCT), and pre-launch
  // volume is small, so a JS Set reduce over the windowed rows is the simplest
  // correct approach.
  const { data, error } = await createAdminClient()
    .from('training_events')
    .select('firm_member_id')
    .gte('event_timestamp', since)

  if (error) {
    console.error('[metrics] training_events query failed', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const activeSessions = new Set(data.map((row) => row.firm_member_id)).size

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    windowMinutes: 5,
    activeSessions,
  })
}
