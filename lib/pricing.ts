// =============================================================================
// The one place the $35 / $32 / $28 per-seat bands live as numbers rather than
// being re-typed at each call site.
//
// app/api/webhooks/stripe/route.ts's deriveTier() and
// app/pricing/_components/pricing-slider.tsx's rateFor() both already encode
// this and are left as they are — this module is for NEW code
// (lib/seat-ledger.ts, app/api/billing/add-seats/route.ts) rather than a
// forced migration of working call sites. CLAUDE.md's pricing constraint is
// the source of truth for these numbers; if it changes, all three need it.
// =============================================================================

export const PRICING_BANDS = [
  { min: 1, max: 9, ratePerSeat: 35 },
  { min: 10, max: 24, ratePerSeat: 32 },
  { min: 25, max: Infinity, ratePerSeat: 28 },
] as const

/** Dollars per seat per year for a given total headcount. */
export function rateForSeatCount(seatCount: number): number {
  if (seatCount >= 25) return 28
  if (seatCount >= 10) return 32
  return 35
}
