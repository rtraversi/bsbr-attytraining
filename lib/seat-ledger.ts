// =============================================================================
// The math behind mid-year seat additions and the true-up credit at renewal.
//
// ix-midyearseats (OPEN-ISSUES.md #18). Design agreed with Rob 2026-09-21,
// confirmed against his own worked example (3 seats bought Jan 1, 1 seat added
// June 1 at $35, renewal Jan 1 next year):
//
//   - Mid-year add: one-time charge = seats × the firm's CURRENT per-seat rate.
//     Not re-rated even if the addition would cross into a cheaper band.
//   - Renewal: every seat is billed at the NEW band rate for the new
//     headcount, then any seat still inside a mid-year-paid window gets a
//     credit for the days of that window remaining, valued at the RATE IT WAS
//     ORIGINALLY CHARGED (not the new renewal rate).
//
// Rob's numbers: seat added 2026-06-01 at $35/yr, credited at a 2027-01-01
// renewal. 5 of that seat's paid 365 days (2027-01-01 through the seat's
// covers_until) remain — 5/12 of a year — so its credit is
// (5/12) × $35 ≈ $14.58, making its renewal charge $35 − $14.58 ≈ $20.42.
// Rob computed the same answer the other way, as 7 uncovered months ×
// $2.9167/mo ≈ $20.44 — the two are the same number by construction
// (uncovered + covered = the full year) and the cent-level difference is
// rounding, not disagreement. This module computes it the credit way, to
// match the design note's formula verbatim: "Credit = (days remaining on that
// seat's paid year / 365) × (rate that seat was charged)".
//
// ── THIS MODULE NEVER CHARGES STRIPE ─────────────────────────────────────────
// Pure functions only, same discipline as lib/refund-eligibility.ts and
// lib/cancel-refund-eligibility.ts. app/api/billing/add-seats/route.ts is
// where the mid-year charge actually happens. Nothing in this codebase yet
// calls computeRenewalTrueUp against a live Stripe invoice — see that
// function's own comment for why.
// =============================================================================

export interface OutstandingLedgerRow {
  id: string
  seatCount: number
  ratePaidCents: number
  coversUntil: string
}

/** Mid-year add: seats × the firm's current per-seat rate, in cents, full year, no proration. */
export function computeMidYearChargeCents(seatsToAdd: number, currentRatePerSeatCents: number): number {
  if (seatsToAdd <= 0) throw new Error('seatsToAdd must be positive')
  return seatsToAdd * currentRatePerSeatCents
}

export interface SeatCredit {
  ledgerRowId: string
  creditCents: number
}

/**
 * The renewal-time true-up: for each outstanding ledger row, how much credit
 * it earns against the new renewal invoice.
 *
 * A row whose covers_until has already passed by the renewal date earns no
 * credit (its paid year is over) — it should have been credited at whichever
 * earlier renewal actually fell inside its window; if none did (the firm's
 * cadence changed), it simply contributes nothing rather than a negative
 * number.
 *
 * 🔴 NOT WIRED TO AN AUTOMATIC CHARGE. Making the annual renewal itself
 * "app-controlled" — timing this against Stripe's own invoice creation
 * without misfiring the proration or the collection date — is real design and
 * testing work Rob asked to be called out rather than rushed
 * (session 2026-09-21). This function is the credit math, ready for that
 * integration; it is deliberately not yet called from anywhere that moves
 * money.
 */
export function computeRenewalTrueUp(
  rows: OutstandingLedgerRow[],
  renewalDate: Date
): { totalCreditCents: number; credits: SeatCredit[] } {
  const credits: SeatCredit[] = []
  let totalCreditCents = 0

  for (const row of rows) {
    const coversUntil = new Date(row.coversUntil)
    const daysRemaining = (coversUntil.getTime() - renewalDate.getTime()) / 86_400_000
    if (daysRemaining <= 0) continue

    // Rounded per row, not accumulated as a float across the whole firm — a
    // renewal invoice line has to be an exact cent amount, and rounding once
    // at the end could disagree with the sum of lines actually shown.
    const creditCents = Math.round((daysRemaining / 365) * row.seatCount * row.ratePaidCents)
    if (creditCents <= 0) continue

    credits.push({ ledgerRowId: row.id, creditCents })
    totalCreditCents += creditCents
  }

  return { totalCreditCents, credits }
}
