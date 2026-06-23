import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface AnswerPayload {
  questionId: string
  selectedIndex: number
}

interface RequestBody {
  courseId?: unknown
  answers?: unknown
  attestation?: unknown
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id
  const firmId = user.app_metadata?.firm_id as string | undefined
  if (!firmId) {
    return NextResponse.json({ error: 'No firm associated with this account' }, { status: 403 })
  }

  // ── Parse + validate body ────────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const courseId = typeof body.courseId === 'string' ? body.courseId : ''
  const attestation = body.attestation === true
  const rawAnswers = Array.isArray(body.answers) ? body.answers : []

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }
  if (!attestation) {
    return NextResponse.json({ error: 'Identity attestation is required' }, { status: 400 })
  }
  if (rawAnswers.length === 0) {
    return NextResponse.json({ error: 'No answers submitted' }, { status: 400 })
  }

  const answers: AnswerPayload[] = rawAnswers
    .filter(
      (a): a is { questionId: string; selectedIndex: number } =>
        typeof (a as Record<string, unknown>).questionId === 'string' &&
        typeof (a as Record<string, unknown>).selectedIndex === 'number'
    )
    .map(a => ({ questionId: a.questionId, selectedIndex: a.selectedIndex }))

  if (answers.length === 0) {
    return NextResponse.json({ error: 'Invalid answer format' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Fetch course + pass threshold ────────────────────────────────────────────
  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('id, pass_threshold')
    .eq('id', courseId)
    .single()

  if (courseErr || !course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const passThreshold = course.pass_threshold ?? 80

  // ── Fetch correct answers for submitted question IDs ──────────────────────────
  const questionIds = answers.map(a => a.questionId)

  // quiz_questions isn't in generated types yet — re-run `supabase gen types` after db push
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dbQuestions, error: qErr } = await (admin as any)
    .from('quiz_questions')
    .select('id, correct_index')
    .eq('course_id', courseId)
    .eq('is_active', true)
    .in('id', questionIds)

  if (qErr) {
    console.error('[quiz/attempt] question fetch error:', qErr)
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
  }

  type DBQuestion = { id: string; correct_index: number }
  const questions = (dbQuestions ?? []) as unknown as DBQuestion[]

  if (questions.length === 0) {
    return NextResponse.json({ error: 'No valid questions found for this submission' }, { status: 400 })
  }

  // ── Score server-side — client never received correct_index ──────────────────
  let correct = 0
  for (const answer of answers) {
    const q = questions.find(q => q.id === answer.questionId)
    if (q && q.correct_index === answer.selectedIndex) correct++
  }
  const score = (correct / questions.length) * 100
  const passed = score >= passThreshold

  // ── Get or create enrollment ──────────────────────────────────────────────────
  let { data: enrollment } = await admin
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!enrollment) {
    const { data: newEnrollment, error: enrollErr } = await admin
      .from('enrollments')
      .insert({ user_id: userId, course_id: courseId, firm_id: firmId, status: 'in_progress' })
      .select('id, status')
      .single()

    if (enrollErr || !newEnrollment) {
      console.error('[quiz/attempt] enrollment insert failed:', enrollErr)
      return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 })
    }
    enrollment = newEnrollment
  }

  // ── Idempotency: if already passed, return success ───────────────────────────
  if (enrollment.status === 'passed') {
    return NextResponse.json({ passed: true, score: 100, passThreshold })
  }

  // ── Insert quiz attempt ───────────────────────────────────────────────────────
  const { data: attempt, error: attemptErr } = await admin
    .from('quiz_attempts')
    .insert({
      enrollment_id: enrollment.id,
      user_id: userId,
      firm_id: firmId,
      passed,
      score: Math.round(score),
      answers: answers as unknown as import('@/types/supabase').Json,
    })
    .select('id')
    .single()

  if (attemptErr || !attempt) {
    console.error('[quiz/attempt] quiz_attempts insert failed:', attemptErr)
    return NextResponse.json({ error: 'Failed to record attempt' }, { status: 500 })
  }

  // ── Record training events (non-fatal) ───────────────────────────────────────
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const { data: firmMember } = await admin
    .from('firm_members')
    .select('id')
    .eq('user_id', userId)
    .eq('firm_id', firmId)
    .maybeSingle()

  if (firmMember) {
    try {
      await admin.from('training_events').insert([
        {
          firm_id: firmId,
          firm_member_id: firmMember.id,
          event_type: 'quiz_attempt',
          ip_address: ip,
          user_agent: userAgent,
          metadata: { score: Math.round(score * 100) / 100, passed, question_count: questions.length },
        },
        {
          firm_id: firmId,
          firm_member_id: firmMember.id,
          event_type: 'identity_attestation',
          ip_address: ip,
          user_agent: userAgent,
          metadata: { attested: true, quiz_attempt_id: attempt.id },
        },
      ])
    } catch (err) {
      console.error('[quiz/attempt] training_events insert failed:', err)
    }
  }

  // ── On pass: mark enrollment + enqueue cert ──────────────────────────────────
  if (passed) {
    await admin
      .from('enrollments')
      .update({ status: 'passed', completed_at: new Date().toISOString() })
      .eq('id', enrollment.id)

    const { data: queueRow, error: queueErr } = await admin
      .from('cert_generation_queue')
      .insert({
        enrollment_id: enrollment.id,
        firm_id: firmId,
        quiz_attempt_id: attempt.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (queueErr) {
      console.error('[quiz/attempt] cert_generation_queue insert failed:', queueErr)
    }

    if (queueRow) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const secret = process.env.CERT_WEBHOOK_SECRET ?? ''
      after(async () => {
        try {
          await fetch(`${appUrl}/api/certs/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-webhook-secret': secret },
            body: JSON.stringify({
              type: 'INSERT',
              table: 'cert_generation_queue',
              record: {
                id: queueRow.id,
                firm_id: firmId,
                enrollment_id: enrollment!.id,
                quiz_attempt_id: attempt.id,
                status: 'pending',
                attempt_count: 0,
              },
            }),
          })
        } catch (err) {
          console.error('[quiz/attempt] cert trigger failed:', err)
        }
      })
    }
  }

  return NextResponse.json({ passed, score: Math.round(score), passThreshold })
}
