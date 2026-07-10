import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ContentEvent = 'started' | 'completed'

const EVENT_TYPE: Record<ContentEvent, 'video_started' | 'video_completed'> = {
  started: 'video_started',
  completed: 'video_completed',
}

interface RequestBody {
  event?: unknown
}

/**
 * Records SCORM content progress for the embedded Rise course.
 *
 * The SCORM package is the *verified* half of the training gate: `video_completed`
 * is written only when the course driver reports `cmi.core.lesson_status` as
 * completed/passed. Nothing here is self-reported by the employee.
 *
 * `video_started` / `video_completed` are pre-existing values in the
 * training_events event_type CHECK constraint (migration 0009) — no migration needed.
 */
export async function POST(req: NextRequest) {
  // ── Auth (same pattern as /api/training/knowledge-check) ────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user.id
  const firmId = user.app_metadata?.firm_id as string | undefined
  if (!firmId) {
    return NextResponse.json({ error: 'No firm associated with this account' }, { status: 403 })
  }

  // ── Parse + validate body ──────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const event = body.event
  if (event !== 'started' && event !== 'completed') {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  const eventType = EVENT_TYPE[event]
  const admin = createAdminClient()

  // ── Resolve firm member (training_events links firm_member_id, not user_id) ──
  const { data: member } = await admin
    .from('firm_members')
    .select('id')
    .eq('user_id', userId)
    .eq('firm_id', firmId)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'Firm membership not found' }, { status: 403 })
  }

  // ── Idempotency: completion is course-level, exactly one row is enough ───────
  // `started` is intentionally NOT deduped — one row per launch is real audit
  // signal (when did this employee open the course, and how often).
  if (eventType === 'video_completed') {
    const { data: existing, error: existingErr } = await admin
      .from('training_events')
      .select('id')
      .eq('firm_member_id', member.id)
      .eq('event_type', 'video_completed')
      .limit(1)
      .maybeSingle()

    if (existingErr) {
      console.error('[content-progress] completion lookup failed:', existingErr)
      return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ ok: true, recorded: false, contentViewed: true })
    }
  }

  // ── Record the event (append-only) ──────────────────────────────────────────
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const { error: insErr } = await admin.from('training_events').insert({
    firm_id: firmId,
    firm_member_id: member.id,
    event_type: eventType,
    ip_address: ip,
    user_agent: userAgent,
    metadata: { source: 'scorm', package: 'scorm-v1' },
  })

  if (insErr) {
    console.error('[content-progress] insert failed:', insErr)
    return NextResponse.json({ error: 'Failed to record content progress' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    recorded: true,
    contentViewed: eventType === 'video_completed',
  })
}
