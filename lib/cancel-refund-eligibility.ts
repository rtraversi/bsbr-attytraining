// =============================================================================
// Self-serve "cancel + refund" eligibility — whole firm, not per seat.
//
// This is a DIFFERENT rule from lib/refund-eligibility.ts, which decides which
// individual SEATS are refundable when a firm reduces headcount mid-term. This
// module answers a narrower question: can this firm cancel its purchase
// entirely and get a full refund, the way /pricing promises —
//
//   "Refunds available within 14 days of purchase and only if no certificate
//   has yet been issued. Once any certificate is issued, the purchase is
//   non-refundable."
//
// ix-cancelrefund (OPEN-ISSUES.md #20). Design agreed with Rob 2026-09-11:
// this module only decides eligibility. It never calls the Stripe refund API
// and never cancels the subscription — the route that uses it emails the
// operator to handle both by hand. See app/api/billing/cancel-refund/route.ts.
// =============================================================================

export const REFUND_WINDOW_DAYS = 14

export type CancelIneligibilityReason = 'too_late' | 'certificate_issued'

export interface CancelEligibility {
  eligible: boolean
  /** Every reason that fired, not just the first — an operator explaining a refusal needs all of them. */
  reasons: CancelIneligibilityReason[]
}

/**
 * The rule itself, as a pure function so it can be tested without a database.
 */
export function decideCancelEligibility(input: {
  /** firms.created_at — provisioning happens immediately after payment, so this is the purchase date. */
  purchasedAt: string
  /** True if this firm has ANY issued certificate, for any staff member. */
  certificateIssued: boolean
  now?: Date
}): CancelEligibility {
  const now = input.now ?? new Date()
  const purchased = new Date(input.purchasedAt)
  const daysSincePurchase = (now.getTime() - purchased.getTime()) / 86_400_000

  const reasons: CancelIneligibilityReason[] = []
  if (daysSincePurchase > REFUND_WINDOW_DAYS) reasons.push('too_late')
  if (input.certificateIssued) reasons.push('certificate_issued')

  return { eligible: reasons.length === 0, reasons }
}
