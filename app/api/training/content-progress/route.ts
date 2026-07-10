import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LESSONS, lessonNumberFromLocation } from '@/lib/training/lessons'

const STATUS_EVENT_TYPE = {
  started: 'video_started',
  completed: 'video_completed',
} as const

interface RequestBody {
  event?: unknown
  location?: unknown
  deltaSeconds?: unknown
}

/**
 * Records SCORM content progress for the embedded Rise course.
 *
 * The SCORM package is the *verified* half of the training gate: `video_completed`
 * is written only when the course driver reports `cmi.core.lesson_status` as
 * completed/passed. Nothing here is self-reported by the employee.
 *
 * Four event kinds, all driver-reported:
 *  - started / completed  → append a video_started / video_completed event
 *    (event_type values predate this route; see migrations 0002/0009).
 *  - lesson_location      → append a 'lesson_location_changed' event at each
 *    lesson boundary (deduped against the member's last one). Migration 0011.
 *  - session_time         → accumulate the elapsed delta into the enrollment's
 *    total_training_seconds counter via an atomic RPC. Pure telemetry, gates
 *    nothing; see the rationale in migration 0011.
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
  if (
    event !== 'started' &&
    event !== 'completed' &&
    event !== 'lesson_location' &&
    event !== 'session_time'
  ) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── session_time: pure telemetry, keyed to the enrollment (not a member row) ─
  if (event === 'session_time') {
    const delta = Number(body.deltaSeconds)
    // Guard the same bounds the client caps to — never trust the wire.
    if (!Number.isFinite(delta) || delta <= 0 || delta > 60) {
      return NextResponse.json({ error: 'Invalid deltaSeconds' }, { status: 400 })
    }

    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('firm_id', firmId)
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!enrollment) {
      // No enrollment yet — nothing to accumulate against. Not an error.
      return NextResponse.json({ ok: true, recorded: false })
    }

    // total_training_seconds + the RPC aren't in generated types yet — regenerate
    // with `supabase gen types` after this migration is pushed to drop the cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcErr } = await (admin as any).rpc('increment_training_seconds', {
      p_enrollment_id: enrollment.id,
      p_delta: Math.round(delta),
    })

    if (rpcErr) {
      console.error('[content-progress] increment_training_seconds failed:', rpcErr)
      return NextResponse.json({ error: 'Failed to record time' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, recorded: true })
  }

  // ── Everything else is a training_events append keyed to the firm member ─────
  const { data: member } = await admin
    .from('firm_members')
    .select('id')
    .eq('user_id', userId)
    .eq('firm_id', firmId)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'Firm membership not found' }, { status: 403 })
  }

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  // ── lesson_location: append a boundary event, deduped against the last one ───
  if (event === 'lesson_location') {
    const location = typeof body.location === 'string' ? body.location : ''
    const lessonNumber = location ? lessonNumberFromLocation(location) : null
    if (!lessonNumber) {
      // Unknown/malformed location — nothing meaningful to record. Not an error.
      return NextResponse.json({ ok: true, recorded: false })
    }

    // Dedupe: suspend_data + location can be written close together, and Rise may
    // re-report the same location. Skip if the member is already on this lesson.
    const { data: last } = await admin
      .from('training_events')
      .select('metadata')
      .eq('firm_member_id', member.id)
      .eq('event_type', 'lesson_location_changed')
      .order('event_timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastLesson = (last?.metadata as Record<string, unknown> | null)?.lessonNumber
    if (lastLesson === lessonNumber) {
      return NextResponse.json({ ok: true, recorded: false, lessonNumber })
    }

    const lessonId = LESSONS.find(l => l.number === lessonNumber)?.id ?? null
    const { error: insErr } = await admin.from('training_events').insert({
      firm_id: firmId,
      firm_member_id: member.id,
      event_type: 'lesson_location_changed',
      ip_address: ip,
      user_agent: userAgent,
      metadata: { lessonNumber, lessonId, location },
    })

    if (insErr) {
      console.error('[content-progress] lesson_location insert failed:', insErr)
      return NextResponse.json({ error: 'Failed to record lesson' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, recorded: true, lessonNumber })
  }

  // ── started / completed ──────────────────────────────────────────────────────
  const eventType = STATUS_EVENT_TYPE[event]

  // Idempotency: completion is course-level, exactly one row is enough.
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
