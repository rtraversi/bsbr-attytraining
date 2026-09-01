// =============================================================================
// How long a firm's intake answers are kept — D8-3.
//
// Katy, 2026-08-31: "It should be as long as they have a paid subscription."
// So retention is not a fixed clock started by delivery. It is a property of
// the SUBSCRIPTION, and the only thing that ends it is the subscription ending
// and a grace period running out after it.
//
// 🔴 THIS REPLACED THE PURGE, IT DID NOT JOIN IT. The old model deleted the
// answers 30 days after the policy was delivered — a firm that was paying, in
// good standing, and had told us fifty things about itself lost all of it
// because we had finished with it. That is gone (D8-1). Nothing here fires
// while a firm is paying.
//
// ── Why it is a pure function and not a job ─────────────────────────────────
// There is no deletion worker in this batch and this file starts none. What it
// computes is the ANSWER TO "how long do we keep this", which the UI has to
// state out loud (D8-4) long before anything acts on it. Writing the clock
// first and the sweeper later is the right order: a sweeper built on a rule
// nobody has read on screen is how the purge shipped in the first place.
//
// ── D8-4: this is a renewal incentive and must be said out loud ─────────────
// Katy: "if they renew then it remains active. So that is an incentive to renew
// so they dont lose the work they progressed in making the policy." The copy
// lives in app/intake/_components/intake-review.tsx and is fed from here, so
// what the firm reads and what the platform would act on are the same rule.
// =============================================================================

/**
 * Days after the paid period ends before the answers stop being kept.
 *
 * ✅ DECIDED BY MAX, 2026-09-01. It was 30 — a placeholder borrowed from the
 * retired purge window — until he cut it to three:
 *
 *   "I said grace period because I was cautious a firm might not renew but come
 *    back. however lets make it shorter. katy said this could be a seling point
 *    of renewing to save their answers. and i like it. so have it be three days
 *    only."
 *
 * 🔴 THE SHORT WINDOW IS THE POINT, NOT A COMPROMISE. A month of holding a
 * lapsed firm's answers is indistinguishable from keeping them forever, and it
 * quietly cancels the thing D8-4 is for: if the work survives a long lapse
 * anyway, not renewing costs nothing. Three days makes renewal the way a firm
 * keeps its answers, which is what Katy wanted to sell.
 *
 * Recorded in .planning/POLICY-DECISIONS.md under "Answer retention".
 *
 * It is a single exported constant so changing it is one edit and the tests,
 * the UI copy and any future sweeper all move together.
 */
export const RENEWAL_GRACE_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

export type RetentionState =
  /** Paying. Nothing is deleted, and there is no date to show. */
  | 'active'
  /** The paid period has ended. Renewing restores it; the grace window is running. */
  | 'grace'
  /** The grace window has run out. */
  | 'expired'

export interface Retention {
  state: RetentionState
  /**
   * When the answers stop being kept. ISO, or null.
   *
   * Null on `active` because there is no such date while the firm is paying,
   * and null on `grace` when the firm has no recorded period end — see
   * `retentionOf`. A null here means "we are not deleting anything", never
   * "delete now".
   */
  deletesAt: string | null
  /** Whole days from `now` until `deletesAt`, floored at 0. Null when there is no date. */
  daysLeft: number | null
}

/**
 * What is kept, and until when.
 *
 * Reads the two columns the Stripe webhook already maintains — `firms.status`
 * and `firms.current_period_end` — rather than a retention column of its own.
 * A second column would be a second thing to keep true, and it would be true
 * only as often as somebody remembered to write it; these two are written on
 * every subscription event the webhook handles.
 *
 * ── The safe direction is KEEPING ───────────────────────────────────────────
 * A lapsed firm with no `current_period_end` (an old row, a subscription that
 * never carried one) comes back as `grace` with no date rather than `expired`.
 * Deleting a firm's answers because we could not work out when their period
 * ended is the one outcome this file exists to prevent, and it is unrecoverable
 * — there is no copy anywhere else.
 *
 * Pure: `now` is a parameter so tests state the instant rather than mocking a
 * clock.
 */
export function retentionOf(
  firm: { status: string; current_period_end: string | null } | null,
  now: Date = new Date(),
): Retention {
  // No firm row at all. Nothing to delete and nothing to promise — treat it the
  // way a lapsed firm with no date is treated, which is: do not delete.
  if (!firm) return { state: 'grace', deletesAt: null, daysLeft: null }

  // Paying, including `payment_failed` — Stripe Smart Retries are still
  // running at that point and the firm has not lost anything yet. Only
  // `cancelled` is the subscription actually being over.
  if (firm.status !== 'cancelled') {
    return { state: 'active', deletesAt: null, daysLeft: null }
  }

  if (!firm.current_period_end) {
    return { state: 'grace', deletesAt: null, daysLeft: null }
  }

  const end = new Date(firm.current_period_end)
  if (Number.isNaN(end.getTime())) {
    return { state: 'grace', deletesAt: null, daysLeft: null }
  }

  const deletesAt = new Date(end.getTime() + RENEWAL_GRACE_DAYS * DAY_MS)
  const remainingMs = deletesAt.getTime() - now.getTime()

  return {
    state: remainingMs > 0 ? 'grace' : 'expired',
    deletesAt: deletesAt.toISOString(),
    daysLeft: Math.max(0, Math.ceil(remainingMs / DAY_MS)),
  }
}
