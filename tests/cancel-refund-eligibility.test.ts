import { describe, it, expect } from 'vitest'
import { decideCancelEligibility, REFUND_WINDOW_DAYS } from '@/lib/cancel-refund-eligibility'

const DAY_MS = 86_400_000

describe('decideCancelEligibility', () => {
  it('is eligible fresh after purchase, no certificate', () => {
    const now = new Date('2026-09-15T00:00:00Z')
    const r = decideCancelEligibility({
      purchasedAt: new Date(now.getTime() - 1 * DAY_MS).toISOString(),
      certificateIssued: false,
      now,
    })
    expect(r).toEqual({ eligible: true, reasons: [] })
  })

  it('is still eligible exactly at the 14-day boundary', () => {
    const now = new Date('2026-09-15T00:00:00Z')
    const r = decideCancelEligibility({
      purchasedAt: new Date(now.getTime() - REFUND_WINDOW_DAYS * DAY_MS).toISOString(),
      certificateIssued: false,
      now,
    })
    expect(r.eligible).toBe(true)
  })

  it('fires too_late one day past the window', () => {
    const now = new Date('2026-09-15T00:00:00Z')
    const r = decideCancelEligibility({
      purchasedAt: new Date(now.getTime() - (REFUND_WINDOW_DAYS + 1) * DAY_MS).toISOString(),
      certificateIssued: false,
      now,
    })
    expect(r.eligible).toBe(false)
    expect(r.reasons).toEqual(['too_late'])
  })

  it('fires certificate_issued even within the window', () => {
    const now = new Date('2026-09-15T00:00:00Z')
    const r = decideCancelEligibility({
      purchasedAt: new Date(now.getTime() - 1 * DAY_MS).toISOString(),
      certificateIssued: true,
      now,
    })
    expect(r.eligible).toBe(false)
    expect(r.reasons).toEqual(['certificate_issued'])
  })

  it('reports both reasons when both fire', () => {
    const now = new Date('2026-09-15T00:00:00Z')
    const r = decideCancelEligibility({
      purchasedAt: new Date(now.getTime() - 30 * DAY_MS).toISOString(),
      certificateIssued: true,
      now,
    })
    expect(r.eligible).toBe(false)
    expect(r.reasons).toEqual(['too_late', 'certificate_issued'])
  })
})
