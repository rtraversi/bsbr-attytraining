import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCertifiableMember, isCertifiableMember } from '@/lib/seats'
import { recordQuizAttempt, type SubmittedAnswer } from '@/lib/training/assessment'

/**
 * Grade a certification attempt.
 *
 * ix-quizforge: this route used to take the question ids OUT OF THE REQUEST
 * BODY, load exactly those, and score `correct / submitted.length`. One answer
 * the caller knew scored 100 and issued a real certificate. It now takes a
 * sessionId minted by /api/quiz/start and grades against the question set the
 * server recorded there — see lib/training/assessment.ts, which holds the
 * grading and the single-use claim so both are testable outside Next.
 */
interface RequestBody {
  courseId?: unknown
  sessionId?: unknown
  answers?: unknown
  attestation?: unknown
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
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

  // ── Parse + validate body ────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const courseId = typeof body.courseId === 'string' ? body.courseId : ''
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  const attestation = body.attestation === true
  const rawAnswers = Array.isArray(body.answers) ? body.answers : []

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }
  if (!attestation) {
    return NextResponse.json({ error: 'Identity attestation is required' }, { status: 400 })
  }

  // Malformed entries are dropped rather than rejecting the whole submission,
  // and an EMPTY answers array is no longer an error: the session fixes the
  // denominator, so submitting nothing is simply a score of zero. The old
  // "No answers submitted" 400 existed only because an empty array would have
  // divided by zero.
  const answers: SubmittedAnswer[] = rawAnswers
    .filter(
      (a): a is { questionId: string; selectedIndex: number } =>
        typeof (a as Record<string, unknown>).questionId === 'string' &&
        typeof (a as Record<string, unknown>).selectedIndex === 'number'
    )
    .map(a => ({ questionId: a.questionId, selectedIndex: a.selectedIndex }))

  const admin = createAdminClient()

  // ── Certificate eligibility ──────────────────────────────────────────────
  // Training itself is open. The certificate path is not: it requires a paid,
  // active/invited staff member and explicitly excludes attorneys. Check before
  // any write; recordQuizAttempt repeats the queue guard for direct callers.
  const member = await fetchCertifiableMember(admin, userId, firmId)
  if (!isCertifiableMember(member)) {
    return NextResponse.json(
      { error: 'Training is available to you, but you are not eligible for a certificate.' },
      { status: 403 }
    )
  }

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const result = await recordQuizAttempt(admin, {
    userId,
    firmId,
    courseId,
    sessionId,
    answers,
    ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  // ── Kick the cert worker ─────────────────────────────────────────────────
  // Fire-and-forget, outside the response. Stays in the route rather than in
  // assessment.ts because after() only exists inside a Next request scope.
  // The Supabase Database Webhook on cert_generation_queue is the durable path;
  // this is the fast one.
  if (result.certQueueId && result.enrollmentId && result.attemptId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const secret = process.env.CERT_WEBHOOK_SECRET ?? ''
    const { certQueueId, enrollmentId, attemptId } = result
    after(async () => {
      try {
        await fetch(`${appUrl}/api/certs/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-webhook-secret': secret },
          body: JSON.stringify({
            type: 'INSERT',
            table: 'cert_generation_queue',
            record: {
              id: certQueueId,
              firm_id: firmId,
              enrollment_id: enrollmentId,
              quiz_attempt_id: attemptId,
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

  return NextResponse.json({
    passed: result.passed,
    score: result.score,
    passThreshold: result.passThreshold,
  })
}
