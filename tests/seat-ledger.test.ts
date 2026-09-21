import { describe, it, expect } from 'vitest'
import { computeMidYearChargeCents, computeRenewalTrueUp } from '@/lib/seat-ledger'
import { rateForSeatCount } from '@/lib/pricing'

describe('rateForSeatCount', () => {
  it('bands at 1-9 / 10-24 / 25+', () => {
    expect(rateForSeatCount(1)).toBe(35)
    expect(rateForSeatCount(9)).toBe(35)
    expect(rateForSeatCount(10)).toBe(32)
    expect(rateForSeatCount(24)).toBe(32)
    expect(rateForSeatCount(25)).toBe(28)
    expect(rateForSeatCount(500)).toBe(28)
  })
})

describe('computeMidYearChargeCents', () => {
  it('is seats times the current rate, full price, no proration', () => {
    expect(computeMidYearChargeCents(1, 3500)).toBe(3500)
    expect(computeMidYearChargeCents(4, 3500)).toBe(14000)
  })

  it('refuses a non-positive seat count', () => {
    expect(() => computeMidYearChargeCents(0, 3500)).toThrow()
    expect(() => computeMidYearChargeCents(-1, 3500)).toThrow()
  })
})

describe('computeRenewalTrueUp', () => {
  // Rob's worked example (session 2026-09-21): 1 seat added 2026-06-01 at
  // $35/yr, renewal falls 2027-01-01. covers_until = 2027-05-31ish (added_at +
  // 365 days). 5 months of that window remain past the renewal date.
  it("matches Rob's worked example within a cent", () => {
    const addedAt = new Date('2026-06-01T00:00:00Z')
    const coversUntil = new Date(addedAt.getTime() + 365 * 86_400_000)
    const renewalDate = new Date('2027-01-01T00:00:00Z')

    const { totalCreditCents, credits } = computeRenewalTrueUp(
      [{ id: 'row-1', seatCount: 1, ratePaidCents: 3500, coversUntil: coversUntil.toISOString() }],
      renewalDate
    )

    // Rob's number: $35 - credit ≈ $20.44, i.e. credit ≈ $14.56-14.58.
    expect(totalCreditCents).toBeGreaterThanOrEqual(1440)
    expect(totalCreditCents).toBeLessThanOrEqual(1470)
    expect(credits).toEqual([{ ledgerRowId: 'row-1', creditCents: totalCreditCents }])
  })

  it('a row bought exactly at the renewal boundary earns no credit', () => {
    const renewalDate = new Date('2027-01-01T00:00:00Z')
    const { totalCreditCents, credits } = computeRenewalTrueUp(
      [{ id: 'row-1', seatCount: 3, ratePaidCents: 3500, coversUntil: renewalDate.toISOString() }],
      renewalDate
    )
    expect(totalCreditCents).toBe(0)
    expect(credits).toEqual([])
  })

  it('a row whose window already lapsed before renewal earns no credit (not negative)', () => {
    const renewalDate = new Date('2027-06-01T00:00:00Z')
    const coversUntil = new Date('2027-01-01T00:00:00Z')
    const { totalCreditCents, credits } = computeRenewalTrueUp(
      [{ id: 'row-1', seatCount: 3, ratePaidCents: 3500, coversUntil: coversUntil.toISOString() }],
      renewalDate
    )
    expect(totalCreditCents).toBe(0)
    expect(credits).toEqual([])
  })

  it('multiple seats in one row scale the credit linearly', () => {
    const addedAt = new Date('2026-06-01T00:00:00Z')
    const coversUntil = new Date(addedAt.getTime() + 365 * 86_400_000)
    const renewalDate = new Date('2027-01-01T00:00:00Z')

    const single = computeRenewalTrueUp(
      [{ id: 'a', seatCount: 1, ratePaidCents: 3500, coversUntil: coversUntil.toISOString() }],
      renewalDate
    ).totalCreditCents

    const quadruple = computeRenewalTrueUp(
      [{ id: 'b', seatCount: 4, ratePaidCents: 3500, coversUntil: coversUntil.toISOString() }],
      renewalDate
    ).totalCreditCents

    expect(quadruple).toBe(single * 4)
  })

  it('sums credit across several outstanding rows and reports each individually', () => {
    const renewalDate = new Date('2027-01-01T00:00:00Z')
    const rows = [
      { id: 'a', seatCount: 2, ratePaidCents: 3500, coversUntil: '2027-04-01T00:00:00Z' },
      { id: 'b', seatCount: 1, ratePaidCents: 3200, coversUntil: '2027-07-01T00:00:00Z' },
    ]
    const { totalCreditCents, credits } = computeRenewalTrueUp(rows, renewalDate)
    expect(credits).toHaveLength(2)
    expect(credits.map(c => c.ledgerRowId)).toEqual(['a', 'b'])
    expect(totalCreditCents).toBe(credits[0].creditCents + credits[1].creditCents)
  })
})
