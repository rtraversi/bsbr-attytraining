// =============================================================================
// Policy intake — server-side session access.
//
// Every write in the intake goes through the SERVICE ROLE. Migration 0028 gives
// intake_sessions, intake_answers and intake_uploads a SELECT policy and nothing
// else, and gives intake_sensitive no policy at all. That is deliberate: promote
// (batch 4) and purge each have to be one transaction, and a client writing its
// own rows makes both a sequence of calls that can half-fail.
//
// So this module is the only place that touches those tables, and it is the only
// place that decides who is allowed to. Both halves of that live here rather
// than in the route handlers, so the page and the four routes cannot drift into
// four slightly different opinions about who owns an intake.
//
// SERVER ONLY. Importing this from a client component leaks the service-role key.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getQuestion } from './questions'
import type { Json } from '@/types/supabase'
import type { AnswerMap, AnswerValue } from './types'

type AdminClient = ReturnType<typeof createAdminClient>

export interface IntakeActor {
  userId: string
  firmId: string
  email: string
  /** From user_metadata.full_name. Null when the admin never set one. */
  name: string | null
}

export type IntakeAuth =
  | { ok: true; actor: IntakeActor }
  | { ok: false; status: 401 | 403; error: string }

/**
 * Who is asking, and may they.
 *
 * Admin-and-firm, not just signed in. The intake collects a roster of everyone
 * at the firm and two admissions the firm makes in confidence; an employee has
 * no business in any of it.
 *
 * Claims come from app_metadata, which the user cannot edit — user_metadata can
 * be written from the browser SDK, so reading role from there would be an
 * instant privilege escalation.
 */
export async function authorizeIntake(): Promise<IntakeAuth> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (role !== 'admin' || !firmId) return { ok: false, status: 403, error: 'Forbidden' }

  return {
    ok: true,
    actor: {
      userId: user.id,
      firmId,
      email: user.email ?? '',
      name: ((user.user_metadata?.full_name as string | undefined) ?? '').trim() || null,
    },
  }
}

/**
 * One list, used by every session read.
 *
 * Separate selects drift, and the failure is silent: a caller reading
 * policy_delivered_at off a row that never selected it gets `undefined`, which
 * is falsy, which reads as "not delivered" — the exact wrong answer, on the
 * field that decides whether a delivered policy's answers can still be edited.
 */
const SESSION_COLUMNS =
  'id, status, current_question, submitted_at, policy_delivered_at, purged_at, reopened_count'

export interface IntakeSessionRow {
  id: string
  status: 'in_progress' | 'submitted' | 'purged'
  current_question: string | null
  submitted_at: string | null
  /**
   * Set by hand when Katy says the policy has gone out. It is what closes
   * reopening: until it is set the firm may still correct their answers, and
   * after it the answers are the record the document was written from.
   */
  policy_delivered_at: string | null
  /** Set by the purge. Non-null means the answers are gone, not merely locked. */
  purged_at: string | null
  /** 0030. Non-zero means the answers moved after Katy received them. */
  reopened_count: number | null
}

/**
 * The firm's open intake, created if there is not one.
 *
 * ── On the race ─────────────────────────────────────────────────────────────
 * 0028 puts a partial UNIQUE index on (firm_id) where status = 'in_progress'.
 * Two tabs opening the intake at the same moment therefore have one insert win
 * and the other come back 23505, and the loser re-reads rather than erroring.
 * The index is the guard; this function just knows how to lose gracefully.
 *
 * A renewal legitimately starts a second session later — the index constrains
 * OPEN sessions, not sessions per firm.
 */
export async function getOrCreateOpenSession(
  admin: AdminClient,
  actor: IntakeActor,
): Promise<IntakeSessionRow> {
  const existing = await admin
    .from('intake_sessions')
    .select(SESSION_COLUMNS)
    .eq('firm_id', actor.firmId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (existing.data) return existing.data as IntakeSessionRow

  const created = await admin
    .from('intake_sessions')
    .insert({ firm_id: actor.firmId, started_by: actor.userId })
    .select(SESSION_COLUMNS)
    .maybeSingle()

  if (created.data) return created.data as IntakeSessionRow

  // Lost the race, or something else. Re-read before giving up — the unique
  // index means the row that beat us is exactly the row we wanted.
  const retry = await admin
    .from('intake_sessions')
    .select(SESSION_COLUMNS)
    .eq('firm_id', actor.firmId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (retry.data) return retry.data as IntakeSessionRow

  throw new Error(`intake: could not open a session for firm ${actor.firmId}: ${created.error?.message ?? 'unknown'}`)
}

/**
 * The most recent session for a firm whatever its status, so a firm that has
 * already submitted sees the locked screen rather than a fresh blank intake.
 */
export async function latestSession(
  admin: AdminClient,
  firmId: string,
): Promise<IntakeSessionRow | null> {
  const { data } = await admin
    .from('intake_sessions')
    .select(SESSION_COLUMNS)
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as IntakeSessionRow | null) ?? null
}

/**
 * Every answer for one session, both tables merged into one map.
 *
 * ── Why the sensitive answers come back ─────────────────────────────────────
 * The firm typed them. They must be able to resume a half-finished intake and
 * correct them, and a question they can see but whose answer will not load is
 * worse than not asking. What "Katy's eyes only" protects against is the
 * DASHBOARD, an export, a summary screen, a support view — anywhere other than
 * the intake session that collected them. It is not a rule that the author
 * cannot see their own answer.
 */
export async function loadAnswers(admin: AdminClient, sessionId: string): Promise<AnswerMap> {
  const [ordinary, sensitive] = await Promise.all([
    admin.from('intake_answers').select('question_key, value').eq('session_id', sessionId),
    admin.from('intake_sensitive').select('question_key, value').eq('session_id', sessionId),
  ])

  const answers: AnswerMap = {}
  for (const row of [...(ordinary.data ?? []), ...(sensitive.data ?? [])]) {
    answers[row.question_key] = row.value as AnswerValue
  }
  return answers
}

/**
 * Write one answer to the table its question's `sensitive` flag names.
 *
 * The flag is read from the question set, never from the request. A client that
 * could nominate the destination table could write a sensitive answer into
 * intake_answers, which firm admins can read — the one thing the split exists
 * to prevent.
 */
export async function writeAnswer(
  admin: AdminClient,
  sessionId: string,
  questionKey: string,
  value: AnswerValue,
): Promise<{ error: string | null }> {
  const question = getQuestion(questionKey)
  if (!question) return { error: `Unknown question "${questionKey}"` }

  const table = question.sensitive ? 'intake_sensitive' : 'intake_answers'

  const { error } = await admin
    .from(table)
    .upsert(
      {
        session_id: sessionId,
        question_key: questionKey,
        // Every AnswerValue is JSON-serialisable by construction (see types.ts:
        // no Dates, no Sets, no Maps). The generated `Json` type still rejects
        // RosterRow[] and ToolGridRow[] because interfaces carry no index
        // signature — a shape mismatch, not a value one.
        value: value as unknown as Json,
        answered_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,question_key' },
    )

  return { error: error?.message ?? null }
}

/** Remove one answer entirely. Clearing writes no row — see AnswerMap. */
export async function deleteAnswer(
  admin: AdminClient,
  sessionId: string,
  questionKey: string,
): Promise<void> {
  const question = getQuestion(questionKey)
  if (!question) return
  const table = question.sensitive ? 'intake_sensitive' : 'intake_answers'
  await admin.from(table).delete().eq('session_id', sessionId).eq('question_key', questionKey)
}

/**
 * Move the resume point and stamp updated_at.
 *
 * 0028 has NO updated_at trigger — the house has no such helper (seats.updated_at
 * is set by hand in sync_used_seats), so a route that forgets this leaves the
 * column reading the moment the session was created, forever. Every write path
 * goes through here for that reason.
 */
export async function touchSession(
  admin: AdminClient,
  sessionId: string,
  currentQuestion: string | null,
): Promise<void> {
  const patch: { updated_at: string; current_question?: string } = {
    updated_at: new Date().toISOString(),
  }
  if (currentQuestion) patch.current_question = currentQuestion

  await admin.from('intake_sessions').update(patch).eq('id', sessionId)
}

/**
 * Seats the firm bought — the number the roster is checked against.
 *
 * 🔴 NULL AND 0 ARE DIFFERENT ANSWERS, and collapsing them was a hole in the cap.
 *
 * This returned `data?.max_seats ?? 0` and the callers read 0 as "unknown, so no
 * cap". So a missing row, a slow read or an outright failure switched the cap
 * OFF entirely, and a firm could roster unlimited staff, submit, and promote
 * past its seat count — the exact outcome the cap exists to prevent.
 *
 *   null   the seats row is not there, or could not be read. NOT KNOWN.
 *   0      the row is there and says zero. KNOWN, and a cap of zero.
 *   n      the row is there and says n.
 *
 * What each caller does with `null` is deliberately NOT the same:
 * the roster screen stays permissive (see canAddTrainingSeat), and
 * POST /api/intake/submit refuses, because it is the one that promotes.
 */
export async function seatsPurchased(admin: AdminClient, firmId: string): Promise<number | null> {
  const { data, error } = await admin
    .from('seats')
    .select('max_seats')
    .eq('firm_id', firmId)
    .maybeSingle()

  // An error and a missing row are the same answer here — neither one tells us
  // what the firm bought — and both must read as "not known", never as zero.
  if (error || !data) return null
  return data.max_seats ?? null
}
