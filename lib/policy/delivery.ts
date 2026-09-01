// =============================================================================
// Delivering a policy — the write path, and the counterpart to for-firm.ts.
//
// for-firm.ts answers "what is this firm's policy". This answers "which firms
// are waiting, and how does one get released". They are separate files because
// they have different blast radii: the read path runs on every page view for
// one firm, and this one runs across ALL firms, from a script, and writes the
// column that decides whether a firm may read its document at all.
//
// 🔴 DELIVERY IS AN APPROVAL, NOT A NOTIFICATION. Since 2026-09-01 `delivered`
// is the only state in which a firm sees its policy — a submitted intake gets a
// waiting screen. So markDelivered() is the moment an attorney says the
// assembled document is fit to be read, and it is why 0032 gave the act an
// author. Nothing here sends a document; it releases one.
//
// ── The review depth this assumes (Max, 2026-09-01) ─────────────────────────
// Approve AS GENERATED. There is no per-firm edited copy and this file offers
// no way to make one. Wording problems are fixed in lib/policy/blocks, where
// every firm benefits and the "same answers, same document" guarantee in
// assemble.ts survives. A delivery that could edit one firm's text would fork
// that firm's policy away from the engine permanently.
//
// SERVER ONLY. Service-role, and reached from a script that is never deployed.
// =============================================================================

import { intakeStateOf } from '@/lib/intake/review'
import { loadAnswers } from '@/lib/intake/session'
import type { createAdminClient } from '@/lib/supabase/admin'
import { assemble } from '@/lib/policy/assemble'

type AdminClient = ReturnType<typeof createAdminClient>

export interface PendingDelivery {
  sessionId: string
  firmId: string
  firmName: string
  submittedAt: string | null
  /** Set when this is a RESUBMISSION — the firm edited after a previous delivery. */
  previouslyDeliveredAt: string | null
  verbatimBlocks: number
  todoBlocks: number
  actionItems: number
}

/**
 * Every intake waiting for an attorney, oldest first.
 *
 * ── Two shapes qualify, and the second is the one that gets missed ──────────
 *
 *   1. Submitted, never delivered. The obvious case.
 *   2. Submitted, delivered BEFORE, and submitted again since — D8-2. The firm
 *      reopened a delivered intake, changed an answer and sent it back. The row
 *      still carries the old `policy_delivered_at`, so a naive
 *      `policy_delivered_at IS NULL` filter drops it silently and the firm
 *      waits forever for a review nobody knows is owed.
 *
 * Rather than reproduce that comparison in SQL, both are decided by
 * intakeStateOf() — the same function the firm's own screen uses. If the firm
 * is being shown a waiting state, this queue must contain them, and the only
 * way to guarantee that is to ask the same question. A second implementation
 * in a WHERE clause is precisely how the two would drift.
 *
 * ⚠️ It therefore assembles a policy per waiting firm to report the counts.
 * That is fine at this scale — the queue is a handful of rows read by one
 * person from a script — and it is deliberately not something a request path
 * should call.
 */
export async function pendingDeliveries(admin: AdminClient): Promise<PendingDelivery[]> {
  const { data, error } = await admin
    .from('intake_sessions')
    .select('id, firm_id, status, submitted_at, policy_delivered_at')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true })

  if (error) throw new Error(`Could not read the delivery queue: ${error.message}`)

  const waiting = (data ?? []).filter((row) => intakeStateOf(row) === 'submitted')
  if (waiting.length === 0) return []

  const { data: firms } = await admin
    .from('firms')
    .select('id, name')
    .in('id', [...new Set(waiting.map((row) => row.firm_id))])
  const nameOf = new Map((firms ?? []).map((f) => [f.id, f.name]))

  return Promise.all(
    waiting.map(async (row) => {
      const result = assemble(await loadAnswers(admin, row.id))
      const blocks = result.policy.sections.flatMap((s) => s.blocks)
      return {
        sessionId: row.id,
        firmId: row.firm_id,
        firmName: nameOf.get(row.firm_id) ?? '(unknown firm)',
        submittedAt: row.submitted_at,
        previouslyDeliveredAt: row.policy_delivered_at,
        verbatimBlocks: blocks.filter((b) => b.status === 'verbatim').length,
        todoBlocks: blocks.filter((b) => b.status === 'todo').length,
        actionItems: result.actionItems.length,
      }
    }),
  )
}

export type DeliveryFailure =
  /** No such session, or it is not in a state that can be delivered. */
  | { ok: false; reason: 'not-deliverable'; message: string }
  /** The assembled policy still contains unwritten clauses. */
  | { ok: false; reason: 'has-todos'; todoBlocks: number; message: string }
  /** Another delivery claimed it first. */
  | { ok: false; reason: 'already-claimed'; message: string }

export type DeliveryResult =
  | { ok: true; sessionId: string; firmId: string; firmName: string; deliveredAt: string }
  | DeliveryFailure

/**
 * Approve and release one firm's policy.
 *
 * ── 🔴 It refuses a policy with unwritten clauses ───────────────────────────
 *
 * Every policy the engine produces today contains TODO blocks — 14 of Katy's
 * clauses are instructions rather than text, and the assembled document marks
 * each one in red. Releasing that to a firm would hand them a document that
 * LOOKS like their policy, carries an attorney's approval, and has holes in it.
 * No amount of red marking makes that acceptable, because the firm did not ask
 * for a draft.
 *
 * `force` exists so this flow can be exercised end to end before those clauses
 * land — which is the only reason it exists, and why the refusal names the
 * count rather than being a silent boolean. It is not a convenience.
 *
 * ── The claim is the same pattern as /api/quiz/attempt ──────────────────────
 *
 * One conditional UPDATE with every precondition in the WHERE clause, so there
 * is no gap between checking and writing. Two operators delivering the same
 * session concurrently both pass the checks above and exactly one updates a
 * row; the loser is told rather than silently overwriting the first author and
 * timestamp. See the claim in lib/training/assessment.ts, which this follows
 * deliberately rather than inventing a second concurrency story.
 *
 * ⚠️ THE GUARD IS A COMPARE-AND-SET ON `policy_delivered_at` ITSELF, and
 * getting this wrong is easy in a way tests caught. Guarding on `status` and
 * `submitted_at` alone looks right and is not: a delivery changes NEITHER of
 * them, so a second concurrent delivery still matched and silently overwrote
 * the first author and timestamp. The claim has to be conditional on the field
 * being written.
 *
 * A plain `policy_delivered_at IS NULL` would fix that and break D8-2 — a
 * resubmission after delivery legitimately re-delivers a row that already
 * carries a timestamp, which is exactly the case pendingDeliveries() was
 * careful to include. So the guard is the value we READ: null for a first
 * delivery, the previous timestamp for a revision. Either way, whoever writes
 * first moves it and everybody else finds nothing to claim.
 */
export async function markDelivered(
  admin: AdminClient,
  sessionId: string,
  userId: string,
  { note = null, force = false }: { note?: string | null; force?: boolean } = {},
): Promise<DeliveryResult> {
  const { data: session } = await admin
    .from('intake_sessions')
    .select('id, firm_id, status, submitted_at, policy_delivered_at')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) {
    return { ok: false, reason: 'not-deliverable', message: `No intake session ${sessionId}.` }
  }

  const state = intakeStateOf(session)
  if (state !== 'submitted') {
    return {
      ok: false,
      reason: 'not-deliverable',
      message:
        state === 'editable'
          ? 'That intake is open for editing. There is nothing settled to approve.'
          : 'That policy has already been delivered, and the answers have not changed since.',
    }
  }

  const result = assemble(await loadAnswers(admin, session.id))
  const todoBlocks = result.policy.sections
    .flatMap((s) => s.blocks)
    .filter((b) => b.status === 'todo').length

  if (todoBlocks > 0 && !force) {
    return {
      ok: false,
      reason: 'has-todos',
      todoBlocks,
      message:
        `This policy contains ${todoBlocks} unwritten ${todoBlocks === 1 ? 'clause' : 'clauses'}. ` +
        `Delivering it would hand the firm an approved document with holes in it. Pass ` +
        `--force-todos only to exercise the flow before Katy's clauses land.`,
    }
  }

  const deliveredAt = new Date().toISOString()

  const claim = admin
    .from('intake_sessions')
    .update({
      policy_delivered_at: deliveredAt,
      policy_delivered_by: userId,
      policy_delivered_note: note,
      updated_at: deliveredAt,
    })
    .eq('id', session.id)
    .eq('status', 'submitted')
    // The answers must not have moved under us either.
    .eq('submitted_at', session.submitted_at as string)

  // See the header. Compare-and-set on the field being written: null on a first
  // delivery, the previous timestamp on a revision.
  const { data: claimed, error } = await (session.policy_delivered_at === null
    ? claim.is('policy_delivered_at', null)
    : claim.eq('policy_delivered_at', session.policy_delivered_at)
  ).select('id')

  if (error) throw new Error(`Could not mark ${sessionId} delivered: ${error.message}`)

  if ((claimed ?? []).length === 0) {
    return {
      ok: false,
      reason: 'already-claimed',
      message:
        'That intake changed while this delivery was being prepared — it was either delivered ' +
        'by someone else or resubmitted by the firm. Re-run --list and try again.',
    }
  }

  const { data: firm } = await admin
    .from('firms')
    .select('name')
    .eq('id', session.firm_id)
    .maybeSingle()

  return {
    ok: true,
    sessionId: session.id,
    firmId: session.firm_id,
    firmName: firm?.name ?? '(unknown firm)',
    deliveredAt,
  }
}
