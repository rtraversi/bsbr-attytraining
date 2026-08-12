// =============================================================================
// Certification assessment — session minting, grading, recording.
//
// ix-quizforge: the server, not the client, decides which questions make up an
// exam. /api/quiz/start mints a quiz_sessions row recording the chosen set;
// /api/quiz/attempt grades against that recorded set and nothing else.
//
// Everything that touches the database lives here rather than in the route
// handlers, for one reason: the routes can only be exercised through Next's
// request plumbing (cookies(), after()), which does not exist under vitest.
// With the logic here, tests/quiz-session.test.ts drives the REAL code against
// real staging rows instead of a re-implementation of it. The routes keep
// exactly what is genuinely request-shaped — auth, body parsing, the seat gate,
// and the fire-and-forget cert trigger.
// =============================================================================

import type { createAdminClient } from '@/lib/supabase/admin'
import type { Database, Json } from '@/types/supabase'
import { ensureEnrollment } from '@/lib/enrollments'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * How long a minted exam stays gradeable.
 *
 * Not a time limit on the quiz — the product deliberately has none. This exists
 * so an abandoned session cannot be resumed against a question pool that has
 * since been rewritten. Four hours is far past any honest attempt.
 */
export const QUIZ_SESSION_TTL_MS = 4 * 60 * 60 * 1000

/** Fisher–Yates. Moved from app/dashboard/training/page.tsx:18. */
export function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** What the client is allowed to see. Note the absence of correct_index. */
export interface ServedQuestion {
  id: string
  question_text: string
  answers: string[]
}

type LessonNumber = 1 | 2 | 3 | 4 | 5

/** The approved eight-question coverage blueprint, indexed by lesson 1–5. */
const LESSON_BLUEPRINT: readonly [1, 2, 2, 1, 2] = [1, 2, 2, 1, 2]

export interface QuestionForSelection extends ServedQuestion {
  lesson: number | null
}

export interface LessonQuotaShortfall {
  lesson: LessonNumber
  requested: number
  available: number
}

export interface QuestionSelection {
  questions: ServedQuestion[]
  quotaShortfalls: LessonQuotaShortfall[]
}

function servedQuestion({ id, question_text, answers }: QuestionForSelection): ServedQuestion {
  return { id, question_text, answers }
}

/**
 * Scale the approved 1/2/2/1/2 blueprint when an operator configures a course
 * to use another attempt size. At the default size of eight this is exactly the
 * approved blueprint; largest-remainder allocation keeps every other size at
 * its configured total without hard-coding a second policy.
 */
function lessonQuotasForAttemptSize(attemptSize: number): readonly number[] {
  const blueprintTotal = LESSON_BLUEPRINT.reduce((sum, count) => sum + count, 0)
  if (attemptSize === blueprintTotal) return [...LESSON_BLUEPRINT]

  const raw = LESSON_BLUEPRINT.map(count => (count * attemptSize) / blueprintTotal)
  const quotas = raw.map(Math.floor)
  let remaining = attemptSize - quotas.reduce((sum, count) => sum + count, 0)
  const byRemainder = raw
    .map((count, index) => ({ index, remainder: count - quotas[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)

  for (const { index } of byRemainder) {
    if (remaining === 0) break
    quotas[index]++
    remaining--
  }

  return quotas
}

/**
 * Choose one exam from an eligible pool.
 *
 * The full pool is served whenever it fits in the configured attempt size. That
 * makes today's eight-question bank a shuffle-only no-op, rather than blocking
 * certification because lessons 2 and 4 cannot satisfy the future blueprint.
 * Once there is a real choice, each lesson is shuffled and sampled to the
 * blueprint, then the combined exam is shuffled so lesson order is not exposed.
 * Any unmet quota is returned for durable server logging; alternatives fill the
 * gap so a content shortfall never turns into a learner-facing outage.
 */
export function selectQuestionsForAttempt(
  pool: QuestionForSelection[],
  attemptSize: number
): QuestionSelection {
  const uniquePool = [...new Map(pool.map(question => [question.id, question])).values()]

  if (uniquePool.length <= attemptSize) {
    return { questions: shuffleArray(uniquePool).map(servedQuestion), quotaShortfalls: [] }
  }

  const quotas = lessonQuotasForAttemptSize(attemptSize)
  const selected: QuestionForSelection[] = []
  const selectedIds = new Set<string>()
  const quotaShortfalls: LessonQuotaShortfall[] = []

  for (let lesson = 1 as LessonNumber; lesson <= 5; lesson++) {
    const requested = quotas[lesson - 1]
    if (requested === 0) continue

    const candidates = shuffleArray(uniquePool.filter(question => question.lesson === lesson))
    const chosen = candidates.slice(0, requested)
    for (const question of chosen) {
      selected.push(question)
      selectedIds.add(question.id)
    }

    if (chosen.length < requested) {
      quotaShortfalls.push({ lesson, requested, available: candidates.length })
    }
  }

  // Fill quota gaps from every unused eligible question, including questions
  // awaiting lesson classification. This guarantees a full-sized exam whenever
  // the pool is larger than the configured attempt size.
  const needed = attemptSize - selected.length
  if (needed > 0) {
    selected.push(
      ...shuffleArray(uniquePool.filter(question => !selectedIds.has(question.id))).slice(0, needed)
    )
  }

  return { questions: shuffleArray(selected).map(servedQuestion), quotaShortfalls }
}

export interface SubmittedAnswer {
  questionId: string
  selectedIndex: number
}

type Failure = { ok: false; status: number; error: string }

export type StartSessionResult =
  | { ok: true; sessionId: string; questions: ServedQuestion[]; expiresAt: string }
  | Failure

export type RecordAttemptResult =
  | {
      ok: true
      passed: boolean
      score: number
      passThreshold: number
      /** null when the attempt short-circuited on an already-passed enrollment. */
      attemptId: string | null
      /** Set only when this attempt is what flipped the enrollment to passed. */
      enrollmentId: string | null
      certQueueId: string | null
    }
  | Failure

// quiz_sessions and quiz_attempts.question_ids arrived in migration 0024. Both
// are in types/supabase.ts as of the 2026-08-07 regeneration, so every query
// below is an ordinary typed call — the `as any` escape hatches that stood here
// are gone.
//
// checkSessionUsable is typed on the fields it actually READS rather than on the
// whole row. A predicate that demands `issued_at` in order to answer a question
// it never asks about is a predicate nobody can call with a fixture.
type SessionUsabilityRow = Pick<
  Database['public']['Tables']['quiz_sessions']['Row'],
  'user_id' | 'firm_id' | 'course_id' | 'expires_at' | 'consumed_at'
>

/* ═══════════════════════════════════════════════════════════════════════════
   Grading — pure, so the arithmetic that decides whether someone is certified
   can be tested without a database.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Score a submission against the question set the server committed to.
 *
 * Three properties, all of which the old client-driven scoring lacked:
 *
 *  - The denominator is `questionIds.length`. Always. However many answers the
 *    client sends, and whatever they are for. This is the fix.
 *  - An answer whose questionId is not in the session set is ignored entirely.
 *    It cannot add to `correct` and it cannot change the denominator.
 *  - An unanswered question counts as wrong, rather than being dropped.
 *
 * Duplicate answers for one question resolve to the FIRST occurrence, so
 * submitting every index for a question is not a way to guarantee a hit.
 */
export function gradeAnswers(
  questionIds: string[],
  answers: SubmittedAnswer[],
  correctByQuestion: Map<string, number>
): { correct: number; score: number } {
  const served = new Set(questionIds)

  const picked = new Map<string, number>()
  for (const a of answers) {
    if (!served.has(a.questionId)) continue
    if (picked.has(a.questionId)) continue
    picked.set(a.questionId, a.selectedIndex)
  }

  let correct = 0
  for (const id of questionIds) {
    const expected = correctByQuestion.get(id)
    const chosen = picked.get(id)
    if (expected !== undefined && chosen !== undefined && expected === chosen) correct++
  }

  // questionIds is non-empty by the table's own CHECK constraint, so this
  // cannot divide by zero for any row that made it into quiz_sessions.
  return { correct, score: (correct / questionIds.length) * 100 }
}

/**
 * Decide whether a session may be graded for this caller, at this moment.
 * Pure and exported so every rejection path is testable without seeding a row.
 */
export function checkSessionUsable(
  session: SessionUsabilityRow,
  expected: { userId: string; firmId: string; courseId: string },
  now: Date
): Failure | null {
  // One error string and one status for all three ownership mismatches. A
  // caller probing with a stolen session id learns only that it is not theirs —
  // not whether it exists, nor which of the three fields it belongs to.
  if (
    session.user_id !== expected.userId ||
    session.firm_id !== expected.firmId ||
    session.course_id !== expected.courseId
  ) {
    return { ok: false, status: 403, error: 'This quiz session does not belong to you.' }
  }

  if (session.consumed_at !== null) {
    return {
      ok: false,
      status: 409,
      error: 'This quiz has already been submitted. Start a new attempt to try again.',
    }
  }

  if (new Date(session.expires_at).getTime() <= now.getTime()) {
    return {
      ok: false,
      status: 410,
      error: 'This quiz session has expired. Start a new attempt.',
    }
  }

  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   Start — mint the exam
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Choose a question set server-side and record it.
 *
 * An OPEN session for the same (user, course) is reused rather than replaced.
 * Without that, /api/quiz/start is a reroll button: with a pool larger than the
 * attempt size — which ix-questionpool is about to create — a learner could
 * call it until the eight questions they happen to know come up. Reuse also
 * means a mid-attempt page reload does not strand a row.
 *
 * The caller is responsible for the auth and seat checks. This function assumes
 * both have already passed.
 */
export async function startQuizSession(
  admin: AdminClient,
  params: { userId: string; firmId: string; courseId: string },
  now: Date = new Date()
): Promise<StartSessionResult> {
  const { userId, firmId, courseId } = params

  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('questions_per_attempt')
    .eq('id', courseId)
    .maybeSingle()

  if (courseErr) {
    console.error('[quiz/start] course fetch failed:', courseErr)
    return { ok: false, status: 500, error: 'Failed to load the course' }
  }
  if (!course) {
    return { ok: false, status: 404, error: 'Course not found' }
  }
  const attemptSize = course.questions_per_attempt

  const { data: pool, error: poolErr } = await admin
    .from('quiz_questions')
    .select('id, question_text, answers, lesson')
    .eq('course_id', courseId)
    .eq('is_active', true)

  if (poolErr) {
    console.error('[quiz/start] question pool fetch failed:', poolErr)
    return { ok: false, status: 500, error: 'Failed to load questions' }
  }

  const questionsById = new Map<string, QuestionForSelection>()
  for (const q of pool ?? []) {
    questionsById.set(q.id, {
      id: q.id,
      question_text: q.question_text,
      answers: (q.answers as string[] | null) ?? [],
      lesson: q.lesson,
    })
  }

  if (questionsById.size === 0) {
    return { ok: false, status: 503, error: 'No questions are available for this course.' }
  }

  // Reuse an unexpired, unconsumed session if one exists.
  const { data: openRows, error: openErr } = await admin
    .from('quiz_sessions')
    .select('id, user_id, firm_id, course_id, question_ids, expires_at, consumed_at')
    .eq('user_id', userId)
    .eq('firm_id', firmId)
    .eq('course_id', courseId)
    .is('consumed_at', null)
    .gt('expires_at', now.toISOString())
    .order('issued_at', { ascending: false })
    .limit(1)

  if (openErr) {
    console.error('[quiz/start] open-session lookup failed:', openErr)
    return { ok: false, status: 500, error: 'Failed to start the quiz' }
  }

  const open = (openRows ?? [])[0]
  if (open) {
    const served = open.question_ids
      .map(id => questionsById.get(id))
      .filter((q): q is QuestionForSelection => q !== undefined)

    // Reuse only if EVERY question still resolves. The grading denominator is
    // question_ids.length regardless of how many are servable, so a session
    // that lost a question to retirement or deactivation can no longer be
    // answered perfectly — reusing it would fail an honest learner for an
    // operator's edit. Minting a fresh set is not an escape hatch: the learner
    // cannot retire questions.
    if (served.length === open.question_ids.length) {
      return { ok: true, sessionId: open.id, questions: served, expiresAt: open.expires_at }
    }
  }

  const selection = selectQuestionsForAttempt([...questionsById.values()], attemptSize)
  if (selection.quotaShortfalls.length > 0) {
    console.warn('[quiz/start] lesson quota shortfall; filled from other eligible questions', {
      courseId,
      attemptSize,
      shortfalls: selection.quotaShortfalls,
    })
  }

  const chosen = selection.questions
  const expiresAt = new Date(now.getTime() + QUIZ_SESSION_TTL_MS).toISOString()

  const { data: inserted, error: insertErr } = await admin
    .from('quiz_sessions')
    .insert({
      user_id: userId,
      firm_id: firmId,
      course_id: courseId,
      question_ids: chosen.map(q => q.id),
      issued_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .select('id, expires_at')
    .single()

  if (insertErr || !inserted) {
    console.error('[quiz/start] session insert failed:', insertErr)
    return { ok: false, status: 500, error: 'Failed to start the quiz' }
  }

  const row = inserted as { id: string; expires_at: string }
  return { ok: true, sessionId: row.id, questions: chosen, expiresAt: row.expires_at }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Attempt — grade the exam and record the consequences
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Grade a submission against its session and record everything that follows:
 * the attempt row, the audit events, the enrollment flip and the certificate
 * queue row.
 *
 * The caller is responsible for auth, the seat gate and the identity
 * attestation. This function assumes all three have passed.
 *
 * The returned certQueueId is the caller's cue to fire the cert-generation
 * request — that lives in the route because it uses next/server's after().
 */
export async function recordQuizAttempt(
  admin: AdminClient,
  params: {
    userId: string
    firmId: string
    courseId: string
    sessionId: string
    answers: SubmittedAnswer[]
    ip?: string | null
    userAgent?: string | null
  },
  now: Date = new Date()
): Promise<RecordAttemptResult> {
  const { userId, firmId, courseId, sessionId, answers } = params

  // ── Load the exam ──────────────────────────────────────────────────────────
  const { data: sessionRow, error: sessionErr } = await admin
    .from('quiz_sessions')
    .select('id, user_id, firm_id, course_id, question_ids, expires_at, consumed_at')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionErr) {
    console.error('[quiz/attempt] session fetch failed:', sessionErr)
    return { ok: false, status: 500, error: 'Failed to load the quiz session' }
  }
  if (!sessionRow) {
    return { ok: false, status: 404, error: 'Quiz session not found. Start a new attempt.' }
  }

  const session = sessionRow
  const unusable = checkSessionUsable(session, { userId, firmId, courseId }, now)
  if (unusable) return unusable

  // ── Course + pass threshold ────────────────────────────────────────────────
  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('id, pass_threshold')
    .eq('id', courseId)
    .single()

  if (courseErr || !course) {
    return { ok: false, status: 404, error: 'Course not found' }
  }
  const passThreshold = course.pass_threshold ?? 80

  // ── Correct answers for the SERVED set, not the submitted one ─────────────
  // No course_id or is_active filter, unlike the route this replaced. The ids
  // come from a set the server itself chose and already scoped to the course,
  // so both filters are redundant here — and is_active would actively hurt: a
  // question deactivated while someone was mid-attempt would silently become
  // unanswerable and cost them the mark.
  const { data: dbQuestions, error: qErr } = await admin
    .from('quiz_questions')
    .select('id, correct_index')
    .in('id', session.question_ids)

  if (qErr) {
    console.error('[quiz/attempt] question fetch error:', qErr)
    return { ok: false, status: 500, error: 'Failed to load questions' }
  }

  const correctByQuestion = new Map<string, number>(
    (dbQuestions ?? []).map(q => [q.id, q.correct_index])
  )

  // Zero resolvable questions is an operational failure (the pool was wiped),
  // not a learner failure. Refuse before the claim below, so the session
  // survives and nobody gets a 0% recorded against their name for it.
  if (correctByQuestion.size === 0) {
    console.error('[quiz/attempt] none of the session questions resolved:', sessionId)
    return { ok: false, status: 500, error: 'Failed to load questions' }
  }

  const { correct, score } = gradeAnswers(session.question_ids, answers, correctByQuestion)
  const passed = score >= passThreshold

  // ── Claim the session ──────────────────────────────────────────────────────
  // Conditional UPDATE rather than read-then-write: two concurrent submissions
  // of the same session both pass checkSessionUsable above, and exactly one of
  // them updates a row here. The loser is told the quiz was already submitted.
  //
  // This runs BEFORE any write below, so the failure direction is a burned
  // session (retake with a fresh one) rather than a session that can be graded
  // twice.
  const { data: claimed, error: claimErr } = await admin
    .from('quiz_sessions')
    .update({ consumed_at: now.toISOString() })
    .eq('id', session.id)
    .is('consumed_at', null)
    .select('id')

  if (claimErr) {
    console.error('[quiz/attempt] session claim failed:', claimErr)
    return { ok: false, status: 500, error: 'Failed to record attempt' }
  }
  if (((claimed ?? []) as { id: string }[]).length === 0) {
    return {
      ok: false,
      status: 409,
      error: 'This quiz has already been submitted. Start a new attempt to try again.',
    }
  }

  // ── Get or create enrollment ──────────────────────────────────────────────
  // This read was already the correct shape (enrolled_at DESC, limit 1, scoped
  // by firm_id) while two other call sites were not; ix-maybesingle moved that
  // one correct definition into lib/enrollments.ts and pointed all three at it.
  // Ordered by enrolled_at, not created_at — deliberate, do not change.
  const enrollmentResult = await ensureEnrollment(
    admin,
    { userId, courseId, firmId },
    'in_progress'
  )

  if (enrollmentResult.outcome === 'error') {
    console.error('[quiz/attempt] enrollment get-or-create failed:', enrollmentResult.error)
    return { ok: false, status: 500, error: 'Failed to create enrollment' }
  }
  const enrollment = enrollmentResult.enrollment

  // ── Idempotency: if already passed, return success ───────────────────────
  if (enrollment.status === 'passed') {
    return {
      ok: true,
      passed: true,
      score: 100,
      passThreshold,
      attemptId: null,
      enrollmentId: null,
      certQueueId: null,
    }
  }

  // ── Insert quiz attempt ───────────────────────────────────────────────────
  const { data: attempt, error: attemptErr } = await admin
    .from('quiz_attempts')
    .insert({
      enrollment_id: enrollment.id,
      user_id: userId,
      firm_id: firmId,
      passed,
      score: Math.round(score),
      answers: answers as unknown as Json,
      // The audit trail: which exam produced this score.
      question_ids: session.question_ids,
    })
    .select('id')
    .single()

  if (attemptErr || !attempt) {
    console.error('[quiz/attempt] quiz_attempts insert failed:', attemptErr)
    return { ok: false, status: 500, error: 'Failed to record attempt' }
  }
  const attemptId = attempt.id

  // ── Record training events (non-fatal) ───────────────────────────────────
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
          ip_address: params.ip ?? null,
          user_agent: params.userAgent ?? null,
          metadata: {
            score: Math.round(score * 100) / 100,
            passed,
            // The served count, which is now the real denominator — previously
            // this recorded however many questions the client chose to send.
            question_count: session.question_ids.length,
            correct_count: correct,
            quiz_session_id: session.id,
          },
        },
        {
          firm_id: firmId,
          firm_member_id: firmMember.id,
          event_type: 'identity_attestation',
          ip_address: params.ip ?? null,
          user_agent: params.userAgent ?? null,
          metadata: { attested: true, quiz_attempt_id: attemptId },
        },
      ])
    } catch (err) {
      console.error('[quiz/attempt] training_events insert failed:', err)
    }
  }

  // ── On pass: mark enrollment + enqueue cert ──────────────────────────────
  let certQueueId: string | null = null
  if (passed) {
    await admin
      .from('enrollments')
      .update({ status: 'passed', completed_at: now.toISOString() })
      .eq('id', enrollment.id)

    const { data: queueRow, error: queueErr } = await admin
      .from('cert_generation_queue')
      .insert({
        enrollment_id: enrollment.id,
        firm_id: firmId,
        quiz_attempt_id: attemptId,
        status: 'pending',
      })
      .select('id')
      .single()

    if (queueErr) {
      console.error('[quiz/attempt] cert_generation_queue insert failed:', queueErr)
    }
    certQueueId = queueRow?.id ?? null
  }

  return {
    ok: true,
    passed,
    score: Math.round(score),
    passThreshold,
    attemptId,
    enrollmentId: enrollment.id,
    certQueueId,
  }
}
