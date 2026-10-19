// =============================================================================
// The math behind mid-year seat additions.
//
// ix-midyearseats (OPEN-ISSUES.md #18). Model set by Rob 2026-10-19, replacing
// the 2026-09-21 "full year now, true-up credit at renewal" design:
//
//   - Mid-year add: charged today, PRORATED from the day added to the firm's
//     own renewal date, at the firm's CURRENT per-seat rate. Not re-rated even
//     if the addition crosses into a cheaper band; that happens at renewal.
//   - The subscription's quantity is raised at the same time (with Stripe
//     proration off), so at renewal every seat renews together at whatever
//     band the new headcount lands in. No credits, no ledger at renewal.
//
// Rob's example: 3 seats bought January, 1 added June 1, renewal January 1.
// June 1 → Jan 1 is 214 of 365 days, so the add costs 214/365 × $35 = $20.52,
// and at renewal all 4 renew at $35.
//
// Pure functions only, same discipline as lib/refund-eligibility.ts. The
// charge itself happens in app/api/billing/add-seats/route.ts.
// =============================================================================

/**
 * Stripe will not collect a card payment under $0.50. A seat added so close to
 * renewal that its prorated cost falls below this is added free; it starts
 * paying at renewal with everyone else.
 */
export const MIN_CHARGE_CENTS = 50

/**
 * Prorated cost, in cents, of adding seats now for the rest of the current
 * billing period. Measured to the second against the period's real length
 * (a leap year's period is 366 days), rounded once to a whole cent.
 */
export function computeProratedSeatChargeCents(
  seatsToAdd: number,
  ratePerSeatCents: number,
  now: Date,
  periodStart: Date,
  periodEnd: Date
): number {
  if (seatsToAdd <= 0) throw new Error('seatsToAdd must be positive')
  const periodMs = periodEnd.getTime() - periodStart.getTime()
  if (periodMs <= 0) throw new Error('billing period must have positive length')

  const remainingMs = Math.min(Math.max(periodEnd.getTime() - now.getTime(), 0), periodMs)
  return Math.round((seatsToAdd * ratePerSeatCents * remainingMs) / periodMs)
}
