import { describe, it, expect } from 'vitest'
import { computeProratedSeatChargeCents } from '@/lib/seat-ledger'
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

describe('computeProratedSeatChargeCents', () => {
  // Rob's example (2026-10-19): firm renews Jan 1, adds 1 seat June 1 at $35.
  // June 1 → Jan 1 is 214 of 365 days: 214/365 × 3500 = 2052.05 → 2052.
  const start = new Date('2027-01-01T00:00:00Z')
  const end = new Date('2028-01-01T00:00:00Z')

  it("matches Rob's worked example", () => {
    expect(computeProratedSeatChargeCents(1, 3500, new Date('2027-06-01T00:00:00Z'), start, end)).toBe(2052)
  })

  it('scales with seat count', () => {
    expect(computeProratedSeatChargeCents(3, 3500, new Date('2027-06-01T00:00:00Z'), start, end)).toBe(6156)
  })

  it('charges the full rate on the first day and nothing at the end', () => {
    expect(computeProratedSeatChargeCents(1, 3500, start, start, end)).toBe(3500)
    expect(computeProratedSeatChargeCents(1, 3500, end, start, end)).toBe(0)
  })

  it('clamps a clock outside the period', () => {
    expect(computeProratedSeatChargeCents(1, 3500, new Date('2026-12-01T00:00:00Z'), start, end)).toBe(3500)
    expect(computeProratedSeatChargeCents(1, 3500, new Date('2028-02-01T00:00:00Z'), start, end)).toBe(0)
  })

  it('uses the period length, so a 366-day year prorates by 366', () => {
    const leapStart = new Date('2028-01-01T00:00:00Z')
    const leapEnd = new Date('2029-01-01T00:00:00Z')
    // Half-way through 366 days is 183 days in: 2028-07-02.
    expect(computeProratedSeatChargeCents(1, 3600, new Date('2028-07-02T00:00:00Z'), leapStart, leapEnd)).toBe(1800)
  })

  it('refuses a non-positive seat count or empty period', () => {
    expect(() => computeProratedSeatChargeCents(0, 3500, start, start, end)).toThrow()
    expect(() => computeProratedSeatChargeCents(1, 3500, start, end, start)).toThrow()
  })
})
