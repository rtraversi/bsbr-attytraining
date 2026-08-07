/**
 * ix-quizforge — the certification quiz could be passed with a single answer.
 *
 * The old /api/quiz/attempt took question ids out of the REQUEST BODY, loaded
 * exactly those, and scored `correct / submitted.length`. A POST carrying one
 * question the caller knew scored 100, flipped the enrollment to 'passed', and
 * enqueued a real certificate — an enrolled employee self-certifying, which is
 * the precise failure a Rule 5.3 supervision product exists to prevent.
 *
 * The fix is a server-chosen, server-recorded, single-use question set
 * (quiz_sessions, migration 0024). These tests exercise the REAL functions from
 * lib/training/assessment.ts — the same code the route handlers call — against
 * real staging rows, rather than a re-implementation of the grading rule.
 *
 * A denominator-only fix would pass the first test here and fail the second:
 * with the pool at 8 today the slice selects nothing, but ix-questionpool grows
 * it to ~32, at which point cherry-picking the 8 you know is the same attack in
 * a different shape. `foreign question ids` is the test that pins that shut.
 *
 * Requires migration 0024 on the target project:
 *   supabase db push --linked
 *
 * FK / cascade constraints that govern teardown order (same as rls-isolation):
 *   training_events.firm_member_id → firm_members(id)  ON DELETE RESTRICT
 *   firms.owner_id                 → auth.users(id)    ON DELETE RESTRICT
 *   enrollments.course_id          → courses(id)       ON DELETE RESTRICT
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import {
  QUESTIONS_PER_ATTEMPT,
  checkSessionUsable,
  gradeAnswers,
  recordQuizAttempt,
  startQuizSession,
} from '@/lib/training/assessment'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Ensure .env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  )
}

const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: globalThis.WebSocket },
})

// quiz_sessions is not in types/supabase.ts until the types are regenerated —
// same escape hatch as lib/training/assessment.ts, in one place.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sessions = () => (admin as any).from('quiz_sessions')

const runId = crypto.randomUUID().slice(0, 8)
const POOL_SIZE = 12 // deliberately > QUESTIONS_PER_ATTEMPT, so the slice is real

let firmId: string
let courseId: string
let otherCourseId: string
let learnerId: string
let passerId: string
let outsiderId: string
/** questionId → correct_index, for the course under test. */
const correctIndexById = new Map<string, number>()
/** Ids belonging to the OTHER course — real questions, never in a session. */
let foreignQuestionIds: string[] = []

function must<R extends { data: unknown; error: { message: string } | null }>(
  result: R,
  label: string
): NonNullable<R['data']> {
  if (result.error) throw new Error(`[seed:${label}] ${result.error.message}`)
  if (result.data == null) throw new Error(`[seed:${label}] returned null`)
  return result.data as unknown as NonNullable<R['data']>
}

async function seedCourse(title: string, size: number) {
  const course = must(
    await admin
      .from('courses')
      .insert({
        title,
        cloudflare_stream_video_id: `vid-${runId}-${title.length}`,
        pass_threshold: 80,
        is_published: true,
      })
      .select('id')
      .single(),
    `insert course ${title}`
  )

  // correct_index cycles 0..3 so a "guess the same index every time" submission
  // cannot accidentally score 100 and make a passing test meaningless.
  const rows = Array.from({ length: size }, (_, i) => ({
    course_id: course.id,
    question_text: `[${runId}] Question ${i + 1}?`,
    answers: ['A', 'B', 'C', 'D'],
    correct_index: i % 4,
    section_tag: `TEST:${runId}`,
  }))

  const inserted = must(
    await admin.from('quiz_questions').insert(rows).select('id, correct_index'),
    `insert questions ${title}`
  )

  return { courseId: course.id, questions: inserted }
}

async function createLearner(label: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `quizforge-${label}-${runId}@test.invalid`,
    password: 'TestQuiz!9876xY',
    email_confirm: true,
  })
  if (error) throw new Error(`[seed:createUser ${label}] ${error.message}`)
  return data.user.id
}

beforeAll(async () => {
  const main = await seedCourse(`QuizForge Course ${runId}`, POOL_SIZE)
  courseId = main.courseId
  for (const q of main.questions) correctIndexById.set(q.id, q.correct_index)

  const other = await seedCourse(`QuizForge Decoy ${runId}`, 4)
  otherCourseId = other.courseId
  foreignQuestionIds = other.questions.map(q => q.id)

  learnerId = await createLearner('learner')
  passerId = await createLearner('passer')
  outsiderId = await createLearner('outsider')

  const firm = must(
    await admin
      .from('firms')
      .insert({ name: `QuizForge Firm ${runId}`, owner_id: learnerId, tier: 'basic', max_seats: 5 })
      .select('id')
      .single(),
    'insert firm'
  )
  firmId = firm.id

  // seats must exist before firm_members so sync_used_seats has a row to bump.
  must(
    await admin.from('seats').insert({ firm_id: firmId, max_seats: 5, used_seats: 0 }).select('id').single(),
    'insert seats'
  )

  for (const [userId, role] of [
    [learnerId, 'admin'],
    [passerId, 'employee'],
    [outsiderId, 'employee'],
  ] as const) {
    must(
      await admin
        .from('firm_members')
        .insert({ firm_id: firmId, user_id: userId, role, status: 'active' })
        .select('id')
        .single(),
      `insert member ${role}`
    )
  }
}, 60_000)

afterAll(async () => {
  // Best-effort: a passing attempt fires the staging cert pipeline, which may
  // have written a PDF under this firm's prefix. Storage objects are not
  // covered by the firms cascade.
  try {
    for (const userId of [passerId, learnerId, outsiderId]) {
      const prefix = `firms/${firmId}/employees/${userId}`
      const { data: objects } = await admin.storage.from('certificates').list(prefix, { limit: 100 })
      const files = (objects ?? []).filter(o => o.id).map(o => `${prefix}/${o.name}`)
      if (files.length) await admin.storage.from('certificates').remove(files)
    }
  } catch {
    // Nothing here is load-bearing; a leftover object is litter, not a failure.
  }

  if (firmId) await admin.from('training_events').delete().eq('firm_id', firmId)
  // firms cascades to seats, firm_members, enrollments, quiz_attempts,
  // certificates, cert_generation_queue and quiz_sessions.
  if (firmId) await admin.from('firms').delete().eq('id', firmId)
  // Courses only after enrollments are gone (course_id is ON DELETE RESTRICT).
  if (courseId) await admin.from('courses').delete().eq('id', courseId)
  if (otherCourseId) await admin.from('courses').delete().eq('id', otherCourseId)

  for (const id of [outsiderId, passerId, learnerId]) {
    if (id) await admin.auth.admin.deleteUser(id)
  }
})

/** Start a session and return its id plus the served question ids, in order. */
async function start(userId: string) {
  const result = await startQuizSession(admin, { userId, firmId, courseId })
  if (!result.ok) throw new Error(`startQuizSession failed: ${result.status} ${result.error}`)
  return { sessionId: result.sessionId, questionIds: result.questions.map(q => q.id) }
}

const correctFor = (ids: string[]) =>
  ids.map(id => ({ questionId: id, selectedIndex: correctIndexById.get(id)! }))

// ═══════════════════════════════════════════════════════════════════════════
// Pure grading — no database, so the arithmetic that decides certification is
// pinned exactly rather than through the API's rounding.
// ═══════════════════════════════════════════════════════════════════════════

describe('gradeAnswers — the denominator is the SERVED set', () => {
  const served = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']
  const key = new Map(served.map((id, i) => [id, i % 4]))

  it('one correct answer out of eight scores 12.5, not 100', () => {
    const { correct, score } = gradeAnswers(served, [{ questionId: 'q1', selectedIndex: 0 }], key)
    expect(correct).toBe(1)
    expect(score).toBe(12.5)
  })

  it('an empty submission scores 0 rather than dividing by zero', () => {
    expect(gradeAnswers(served, [], key).score).toBe(0)
  })

  it('answers outside the served set are ignored entirely', () => {
    const { score } = gradeAnswers(
      served,
      [
        { questionId: 'q1', selectedIndex: 0 },
        { questionId: 'not-served-a', selectedIndex: 0 },
        { questionId: 'not-served-b', selectedIndex: 1 },
      ],
      key
    )
    // Still 1/8. The extras neither scored nor shrank the denominator.
    expect(score).toBe(12.5)
  })

  it('a duplicate answer resolves to the first, so spraying indexes gains nothing', () => {
    const sprayed = [0, 1, 2, 3].map(selectedIndex => ({ questionId: 'q2', selectedIndex }))
    // q2's correct index is 1; the first entry is 0, so this must score zero.
    expect(gradeAnswers(served, sprayed, key).correct).toBe(0)
  })

  it('a full correct sweep scores 100', () => {
    const sweep = served.map(id => ({ questionId: id, selectedIndex: key.get(id)! }))
    expect(gradeAnswers(served, sweep, key).score).toBe(100)
  })
})

describe('checkSessionUsable', () => {
  const base = {
    id: 's1',
    user_id: 'u1',
    firm_id: 'f1',
    course_id: 'c1',
    question_ids: ['q1'],
    expires_at: new Date('2026-01-01T04:00:00Z').toISOString(),
    consumed_at: null as string | null,
  }
  const expected = { userId: 'u1', firmId: 'f1', courseId: 'c1' }
  const now = new Date('2026-01-01T01:00:00Z')

  it('accepts a live, unclaimed, correctly-owned session', () => {
    expect(checkSessionUsable(base, expected, now)).toBeNull()
  })

  it('rejects another user, firm or course with the same 403 and message', () => {
    for (const bad of [
      { ...base, user_id: 'u2' },
      { ...base, firm_id: 'f2' },
      { ...base, course_id: 'c2' },
    ]) {
      const r = checkSessionUsable(bad, expected, now)
      expect(r?.status).toBe(403)
      expect(r?.error).toBe('This quiz session does not belong to you.')
    }
  })

  it('rejects a consumed session', () => {
    const r = checkSessionUsable({ ...base, consumed_at: now.toISOString() }, expected, now)
    expect(r?.status).toBe(409)
  })

  it('rejects an expired session, and treats the exact expiry instant as expired', () => {
    expect(checkSessionUsable({ ...base, expires_at: base.expires_at }, expected, new Date('2026-01-01T04:00:00Z'))?.status).toBe(410)
    expect(checkSessionUsable(base, expected, new Date('2026-01-01T05:00:00Z'))?.status).toBe(410)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Against the real database
// ═══════════════════════════════════════════════════════════════════════════

describe('startQuizSession', () => {
  it('serves QUESTIONS_PER_ATTEMPT questions from a larger pool, with no correct_index', async () => {
    const result = await startQuizSession(admin, { userId: learnerId, firmId, courseId })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.questions).toHaveLength(QUESTIONS_PER_ATTEMPT)
    expect(QUESTIONS_PER_ATTEMPT).toBeLessThan(POOL_SIZE)
    for (const q of result.questions) {
      expect(Object.keys(q).sort()).toEqual(['answers', 'id', 'question_text'])
    }
  })

  it('reuses an open session rather than minting a new one — /api/quiz/start is not a reroll button', async () => {
    const a = await start(learnerId)
    const b = await start(learnerId)
    expect(b.sessionId).toBe(a.sessionId)
    expect(b.questionIds).toEqual(a.questionIds)
  })

  it('records the chosen set on the row, so grading has something to grade against', async () => {
    const { sessionId, questionIds } = await start(learnerId)
    const { data } = await sessions().select('question_ids, consumed_at').eq('id', sessionId).single()
    expect(data.question_ids).toEqual(questionIds)
    expect(data.consumed_at).toBeNull()
  })
})

describe('recordQuizAttempt — the ix-quizforge regression', () => {
  it('ONE correct answer against an eight-question session scores 12.5%, not 100%', async () => {
    const { sessionId, questionIds } = await start(learnerId)

    const result = await recordQuizAttempt(admin, {
      userId: learnerId,
      firmId,
      courseId,
      sessionId,
      answers: [
        { questionId: questionIds[0], selectedIndex: correctIndexById.get(questionIds[0])! },
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.passed).toBe(false)
    // 12.5 rounded for the API surface, which has always reported whole numbers.
    expect(result.score).toBe(13)

    // And the enrollment must NOT have been flipped.
    const { data: enrollment } = await admin
      .from('enrollments')
      .select('status')
      .eq('user_id', learnerId)
      .eq('course_id', courseId)
      .maybeSingle()
    expect(enrollment?.status).toBe('in_progress')
    expect(result.certQueueId).toBeNull()
  })

  it('foreign question ids cannot be smuggled in — they neither score nor shrink the denominator', async () => {
    const { sessionId, questionIds } = await start(learnerId)

    // One legitimate correct answer, plus every question from ANOTHER course,
    // answered correctly. Under the old route these would have been loaded and
    // counted; here they are not in the session, so they are ignored.
    const result = await recordQuizAttempt(admin, {
      userId: learnerId,
      firmId,
      courseId,
      sessionId,
      answers: [
        { questionId: questionIds[0], selectedIndex: correctIndexById.get(questionIds[0])! },
        ...foreignQuestionIds.map((id, i) => ({ questionId: id, selectedIndex: i % 4 })),
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.score).toBe(13) // still 1/8, not 5/5 and not 5/13
    expect(result.passed).toBe(false)
  })

  it('rejects a session that has already been graded', async () => {
    const { sessionId, questionIds } = await start(learnerId)

    const first = await recordQuizAttempt(admin, {
      userId: learnerId,
      firmId,
      courseId,
      sessionId,
      answers: [{ questionId: questionIds[0], selectedIndex: 99 }],
    })
    expect(first.ok).toBe(true)

    // The replay: the same session, this time with every answer correct.
    const replay = await recordQuizAttempt(admin, {
      userId: learnerId,
      firmId,
      courseId,
      sessionId,
      answers: correctFor(questionIds),
    })
    expect(replay.ok).toBe(false)
    if (replay.ok) return
    expect(replay.status).toBe(409)
  })

  it('rejects an expired session', async () => {
    const { data: row } = await sessions()
      .insert({
        user_id: learnerId,
        firm_id: firmId,
        course_id: courseId,
        question_ids: [...correctIndexById.keys()].slice(0, QUESTIONS_PER_ATTEMPT),
        issued_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
      .select('id, question_ids')
      .single()

    const result = await recordQuizAttempt(admin, {
      userId: learnerId,
      firmId,
      courseId,
      sessionId: row.id,
      answers: correctFor(row.question_ids),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(410)
  })

  it("rejects another user's session, even inside the same firm", async () => {
    const { sessionId, questionIds } = await start(learnerId)

    const result = await recordQuizAttempt(admin, {
      userId: outsiderId,
      firmId,
      courseId,
      sessionId,
      answers: correctFor(questionIds),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)

    // And the borrowed session must survive unconsumed — a thief must not be
    // able to burn someone else's exam.
    const { data } = await sessions().select('consumed_at').eq('id', sessionId).single()
    expect(data.consumed_at).toBeNull()
  })

  it('rejects a session minted for a different course', async () => {
    const { sessionId, questionIds } = await start(learnerId)

    const result = await recordQuizAttempt(admin, {
      userId: learnerId,
      firmId,
      courseId: otherCourseId,
      sessionId,
      answers: correctFor(questionIds),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
  })

  it('a genuine 8/8 still passes, records the exam, and still enqueues the certificate', async () => {
    const { sessionId, questionIds } = await start(passerId)

    const result = await recordQuizAttempt(admin, {
      userId: passerId,
      firmId,
      courseId,
      sessionId,
      answers: correctFor(questionIds),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.passed).toBe(true)
    expect(result.score).toBe(100)
    expect(result.certQueueId).not.toBeNull()

    // The enrollment flipped…
    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id, status')
      .eq('user_id', passerId)
      .eq('course_id', courseId)
      .maybeSingle()
    expect(enrollment?.status).toBe('passed')

    // …a cert_generation_queue row exists for it…
    const { data: queued } = await admin
      .from('cert_generation_queue')
      .select('id, enrollment_id, quiz_attempt_id')
      .eq('id', result.certQueueId!)
      .single()
    expect(queued?.enrollment_id).toBe(enrollment?.id)
    expect(queued?.quiz_attempt_id).toBe(result.attemptId)

    // …the session is now consumed…
    const { data: consumed } = await sessions().select('consumed_at').eq('id', sessionId).single()
    expect(consumed.consumed_at).not.toBeNull()

    // …and the attempt carries the exam it was graded against, which is what
    // makes the score auditable at all.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: attemptRow } = await (admin as any)
      .from('quiz_attempts')
      .select('question_ids, score, passed')
      .eq('id', result.attemptId)
      .single()
    expect(attemptRow.question_ids).toEqual(questionIds)
    expect(attemptRow.score).toBe(100)
    expect(attemptRow.passed).toBe(true)
  }, 30_000)

  it('reports a missing session rather than throwing', async () => {
    const result = await recordQuizAttempt(admin, {
      userId: learnerId,
      firmId,
      courseId,
      sessionId: crypto.randomUUID(),
      answers: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(404)
  })
})
