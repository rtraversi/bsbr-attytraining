import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCertifiableMember, isCertifiableMember } from '@/lib/seats'
import { startQuizSession } from '@/lib/training/assessment'

/**
 * Mint a certification exam.
 *
 * The server picks the questions, records them in quiz_sessions, and returns
 * the id plus the question text. Nothing in the response carries correct_index.
 * /api/quiz/attempt then grades against the recorded set — which is the whole
 * point of this route existing (ix-quizforge). The client used to receive a
 * question set chosen in a Server Component and hand ids back at submit time,
 * which made the exam whatever the client said it was.
 */
interface RequestBody {
  courseId?: unknown
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

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const courseId = typeof body.courseId === 'string' ? body.courseId : ''
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Certificate eligibility ──────────────────────────────────────────────
  // Course material is open to every firm member. The certification exam is
  // not: it is for paid staff, not attorneys. Check before exposing the live
  // question set or writing a quiz session.
  const member = await fetchCertifiableMember(admin, userId, firmId)
  if (!isCertifiableMember(member)) {
    return NextResponse.json(
      { error: 'Training is available to you, but you are not eligible for a certificate.' },
      { status: 403 }
    )
  }

  const result = await startQuizSession(admin, { userId, firmId, courseId })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    sessionId: result.sessionId,
    questions: result.questions,
    expiresAt: result.expiresAt,
  })
}
