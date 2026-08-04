// =============================================================================
// Refund eligibility — per seat, per subscription term.
//
// Max's decision (.planning/POLICY-DECISIONS.md, 2026-08-04): eligibility is per
// SEAT, not per firm. A firm that bought 40 seats where 10 people trained gets
// 30 refunds, not zero. A seat stops being refundable once that person has
// consumed the training.
//
// ── THIS MODULE NEVER ISSUES A REFUND ────────────────────────────────────────
// It computes and exposes eligibility. No Stripe refund API is called anywhere
// in this codebase, by design: the money decision is a human one. If a future
// change adds an automatic refund call, that is a policy change and needs Max
// and Rob, not a patch.
//
// ── WHY NOT `highestLesson >= 5` ─────────────────────────────────────────────
// Considered and rejected. `lesson_location_changed` measures POSITION IN THE
// COURSEWARE; `knowledge_check_completed` measures CHECKS CLEARED. They are
// different axes and this rule is the second one. Concretely, that threshold is
// wrong in both directions:
//
//   - Lesson 5 has a deliberate test-out shortcut. A learner can skip 1–4
//     entirely, pass 5, and receive full completion. They would read as `>= 5`
//     having personally cleared nothing.
//   - Someone who genuinely cleared 1 to 4 and never opened 5 reads as `4`, and
//     is exactly the person this rule is meant to catch.
//
// ── WHY THIS IS NOT REASSIGN_BLOCK_LESSON ────────────────────────────────────
// Two thresholds now exist and the difference is intentional. See the note on
// REASSIGN_BLOCK_LESSON in app/api/firm/member/reassign/route.ts. In short:
// reassignment stops seat-swapping mid-training and keys on content POSITION;
// refunds stop someone consuming the course and asking for the money back, and
// key on what was actually CLEARED plus verified content completion. Do not
// "harmonise" them — collapsing the two silently changes the refund policy.
// =============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'
import { READINESS_LESSON } from '@/lib/training/lessons'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Cleared checks that make a seat non-refundable.
 *
 * Four of the five. Deliberately NOT five: someone who worked through 1–4 and
 * simply never opened the final review has consumed the course, and the rule
 * exists to catch exactly that person.
 */
export const REFUND_BLOCK_CLEARED_CHECKS = 4

export type RefundIneligibilityReason =
  /** Cleared REFUND_BLOCK_CLEARED_CHECKS or more distinct checks this term. */
  | 'checks_cleared'
  /** Verifiably finished the courseware this term (also catches test-out users). */
  | 'content_viewed'
  /** A certificate was issued against this term's enrollment. */
  | 'certificate_issued'

export interface SeatRefundEligibility {
  userId: string
  firmMemberId: string
  /** True when NONE of the ineligibility conditions fired. */
  eligible: boolean
  /** Every reason that fired, not just the first — an operator explaining a refusal needs all of them. */
  reasons: RefundIneligibilityReason[]
  /** Checks this person personally cleared this term, 0–5. Never inflated by the test-out shortcut. */
  clearedCheckCount: number
  contentViewed: boolean
  certificateIssued: boolean
  /**
   * Start of the term eligibility was measured over — the current enrollment's
   * enrolled_at. Null when the member has no enrollment at all, in which case
   * they have consumed nothing and are trivially eligible.
   */
  termStart: string | null
}

/**
 * The rule itself, as a pure function so it can be tested without a database and
 * reasoned about without reading query code.
 */
export function decideEligibility(input: {
  clearedCheckCount: number
  contentViewed: boolean
  certificateIssued: boolean
}): { eligible: boolean; reasons: RefundIneligibilityReason[] } {
  const reasons: RefundIneligibilityReason[] = []

  if (input.clearedCheckCount >= REFUND_BLOCK_CLEARED_CHECKS) reasons.push('checks_cleared')
  if (input.contentViewed) reasons.push('content_viewed')
  if (input.certificateIssued) reasons.push('certificate_issued')

  return { eligible: reasons.length === 0, reasons }
}

/**
 * Resolve eligibility for every member of a firm.
 *
 * EVERYTHING is scoped to the current term. Without that scoping, Max's "the
 * window reopens on renewal" decision is nullified: a year-one certificate would
 * make that seat permanently non-refundable, and no renewing customer could ever
 * be refunded again.
 *
 * The term boundary already exists in the data. handlePaymentSucceeded inserts a
 * fresh `not_started` enrollment on every renewal, and 0007 dropped the unique
 * constraint precisely so it could. The newest enrollment's `enrolled_at` is
 * therefore the start of the current term.
 */
export async function resolveFirmRefundEligibility(
  admin: AdminClient,
  firmId: string
): Promise<SeatRefundEligibility[]> {
  const { data: members } = await admin
    .from('firm_members')
    .select('id, user_id')
    .eq('firm_id', firmId)
    .not('status', 'in', '(deleted,reassigned)')

  if (!members || members.length === 0) return []

  return Promise.all(
    members.map((m) => resolveSeatRefundEligibility(admin, firmId, m.user_id, m.id))
  )
}

/** Single-seat resolution. Exported so an operator tool can ask about one person. */
export async function resolveSeatRefundEligibility(
  admin: AdminClient,
  firmId: string,
  userId: string,
  firmMemberId: string
): Promise<SeatRefundEligibility> {
  // Newest enrollment = current term. Ordered by enrolled_at, which is the real
  // column name — note that 0007's comment calls it `created_at`, which does not
  // exist on this table. Every read site in the app already uses enrolled_at.
  const { data: enrollment } = await admin
    .from('enrollments')
    .select('id, enrolled_at')
    .eq('firm_id', firmId)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // No enrollment means nothing was ever consumed. Trivially eligible, and the
  // queries below would have no term to scope to.
  if (!enrollment) {
    return {
      userId,
      firmMemberId,
      eligible: true,
      reasons: [],
      clearedCheckCount: 0,
      contentViewed: false,
      certificateIssued: false,
      termStart: null,
    }
  }

  const termStart = enrollment.enrolled_at

  const [checksRes, contentRes, certRes] = await Promise.all([
    admin
      .from('training_events')
      .select('metadata, event_timestamp')
      .eq('firm_member_id', firmMemberId)
      .eq('event_type', 'knowledge_check_completed')
      .gte('event_timestamp', termStart)
      .order('event_timestamp', { ascending: true }),
    admin
      .from('training_events')
      .select('id')
      .eq('firm_member_id', firmMemberId)
      .eq('event_type', 'video_completed')
      .gte('event_timestamp', termStart)
      .limit(1)
      .maybeSingle(),
    // Keyed on enrollment_id, not user_id — that IS the term scope, exactly.
    // certificates carries `unique (enrollment_id)`, so this is at most one row
    // and a prior year's certificate cannot leak into this term's answer.
    admin
      .from('certificates')
      .select('id')
      .eq('enrollment_id', enrollment.id)
      .limit(1)
      .maybeSingle(),
  ])

  // Same shape the knowledge-check route builds, so deriveProgress is fed
  // identically wherever it is used.
  const events: KnowledgeCheckEvent[] = (checksRes.data ?? [])
    .map((r) => {
      const m = (r.metadata ?? {}) as Record<string, unknown>
      return {
        lesson: Number(m.lesson),
        score: Number(m.score),
        passed: m.passed === true,
        attemptNumber: Number(m.attemptNumber ?? 0),
        created_at: r.event_timestamp as string,
      }
    })
    .filter((e) => Number.isInteger(e.lesson) && e.lesson >= 1 && e.lesson <= READINESS_LESSON)

  const contentViewed = contentRes.data !== null

  // deriveProgress owns this, rather than a bespoke count, so one engine decides
  // what "cleared" means. attemptClearedCount is the ix-skipcascade-safe field:
  // reading `status === 'cleared'` here would report 5 for a test-out user who
  // personally cleared nothing and refuse them a refund for training they never
  // consumed.
  const progress = deriveProgress(events, contentViewed)
  const clearedCheckCount = progress.attemptClearedCount

  const certificateIssued = certRes.data !== null

  const { eligible, reasons } = decideEligibility({
    clearedCheckCount,
    contentViewed,
    certificateIssued,
  })

  return {
    userId,
    firmMemberId,
    eligible,
    reasons,
    clearedCheckCount,
    contentViewed,
    certificateIssued,
    termStart,
  }
}
