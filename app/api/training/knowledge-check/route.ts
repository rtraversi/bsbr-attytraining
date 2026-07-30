import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PASS_THRESHOLD, READINESS_LESSON } from '@/lib/training/lessons'
import { QUESTION_POOL } from '@/lib/training/questions'
import { canAttempt, deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'

interface AnswerPayload {
  questionId: string
  selectedIndex: number
}

interface RequestBody {
  lesson?: unknown
  answers?: unknown
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user.id
  const firmId = user.app_metadata?.firm_id as string | undefined
  if (!firmId) return NextResponse.json({ error: 'No firm associated with this account' }, { status: 403 })

  // ── Parse + validate body ──────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const lesson = typeof body.lesson === 'number' ? body.lesson : Number(body.lesson)
  if (!Number.isInteger(lesson) || lesson < 1 || lesson > READINESS_LESSON) {
    return NextResponse.json({ error: 'Invalid lesson' }, { status: 400 })
  }

  const pool = QUESTION_POOL[lesson] ?? []
  if (pool.length === 0) {
    return NextResponse.json({ error: 'No questions for this lesson' }, { status: 400 })
  }

  const rawAnswers = Array.isArray(body.answers) ? body.answers : []
  const answers: AnswerPayload[] = rawAnswers
    .filter(
      (a): a is AnswerPayload =>
        typeof (a as Record<string, unknown>)?.questionId === 'string' &&
        typeof (a as Record<string, unknown>)?.selectedIndex === 'number'
    )
    .map(a => ({ questionId: a.questionId, selectedIndex: a.selectedIndex }))

  if (answers.length === 0) {
    return NextResponse.json({ error: 'No answers submitted' }, { status: 400 })
  }

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

  // ── Load prior knowledge-check events + content completion → derive state ───
  const [{ data: rows, error: eventsErr }, { data: contentRow }] = await Promise.all([
    admin
      .from('training_events')
      .select('metadata, event_timestamp')
      .eq('firm_member_id', member.id)
      .eq('event_type', 'knowledge_check_completed')
      .order('event_timestamp', { ascending: true }),
    // Same existence check as content-progress/route.ts: a driver-reported
    // video_completed event means the training content is verifiably finished.
    // Gates the lesson-5 shortcut only — checks 1–4 are unaffected.
    admin
      .from('training_events')
      .select('id')
      .eq('firm_member_id', member.id)
      .eq('event_type', 'video_completed')
      .limit(1)
      .maybeSingle(),
  ])

  if (eventsErr) {
    console.error('[knowledge-check] events fetch failed:', eventsErr)
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 })
  }

  const events: KnowledgeCheckEvent[] = (rows ?? [])
    .map(r => {
      const m = (r.metadata ?? {}) as Record<string, unknown>
      return {
        lesson: Number(m.lesson),
        score: Number(m.score),
        passed: m.passed === true,
        attemptNumber: Number(m.attemptNumber ?? 0),
        created_at: r.event_timestamp as string,
      }
    })
    .filter(e => Number.isInteger(e.lesson) && e.lesson >= 1 && e.lesson <= READINESS_LESSON)

  const contentViewed = contentRow !== null

  // ── Gate: lesson-5 shortcut lock + attempt limits (server-side) ─────────────
  const gate = canAttempt(events, lesson, contentViewed)
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason ?? 'Not allowed' }, { status: 403 })
  }

  // ── Score server-side — client never received correct_index ─────────────────
  let correct = 0
  for (const a of answers) {
    const q = pool.find(q => q.id === a.questionId)
    if (q && q.correct_index === a.selectedIndex) correct++
  }
  const score = Math.round((correct / pool.length) * 100)

  // Lessons 1–4 clear on completion (any score); lesson 5 needs the threshold.
  const passed = lesson === READINESS_LESSON ? score >= PASS_THRESHOLD : true
  const attemptNumber = events.filter(e => e.lesson === lesson).length + 1

  // ── Record the attempt (append-only) ────────────────────────────────────────
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const { error: insErr } = await admin.from('training_events').insert({
    firm_id: firmId,
    firm_member_id: member.id,
    event_type: 'knowledge_check_completed',
    ip_address: ip,
    user_agent: userAgent,
    metadata: { lesson, score, passed, attemptNumber },
  })

  if (insErr) {
    console.error('[knowledge-check] insert failed:', insErr)
    return NextResponse.json(
      { error: 'Failed to record attempt (has migration 0009_lesson_checks been applied?)' },
      { status: 500 }
    )
  }

  // ── Return the updated progress (client also router.refresh()es for truth) ──
  const progress = deriveProgress(
    [...events, { lesson, score, passed, attemptNumber, created_at: new Date().toISOString() }],
    contentViewed
  )

  return NextResponse.json({ score, passed, passThreshold: PASS_THRESHOLD, progress })
}
