import { describe, it, expect } from 'vitest'
import {
  decideEligibility,
  REFUND_BLOCK_CLEARED_CHECKS,
  type RefundIneligibilityReason,
} from '@/lib/refund-eligibility'
import { deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'

/**
 * The plan's verification step for this task: "construct all three
 * ineligibility paths and confirm each fires, including a test-out user who
 * cleared no individual checks."
 *
 * The rule is tested as a pure function, and the counting that feeds it is
 * tested through deriveProgress — the two halves where a mistake would be
 * silent and expensive. What is NOT covered here is the SQL term-scoping in
 * resolveSeatRefundEligibility, which needs a live database; that is called out
 * in the session notes rather than faked with a mock that would only assert
 * that the mock was written to match the code.
 */

let clock = 0
function ev(lesson: number, passed = true, score = passed ? 100 : 20): KnowledgeCheckEvent {
  clock += 1000
  return { lesson, score, passed, attemptNumber: 1, created_at: new Date(clock).toISOString() }
}

const clearedCount = (events: KnowledgeCheckEvent[], contentViewed: boolean) =>
  deriveProgress(events, contentViewed).attemptClearedCount

describe('decideEligibility — the three ineligibility paths', () => {
  it('path 1: four cleared checks makes a seat non-refundable', () => {
    const r = decideEligibility({
      clearedCheckCount: REFUND_BLOCK_CLEARED_CHECKS,
      contentViewed: false,
      certificateIssued: false,
    })

    expect(r.eligible).toBe(false)
    expect(r.reasons).toEqual(['checks_cleared'])
  })

  it('path 2: verified content completion makes a seat non-refundable', () => {
    const r = decideEligibility({
      clearedCheckCount: 0,
      contentViewed: true,
      certificateIssued: false,
    })

    expect(r.eligible).toBe(false)
    expect(r.reasons).toEqual(['content_viewed'])
  })

  it('path 3: an issued certificate makes a seat non-refundable', () => {
    const r = decideEligibility({
      clearedCheckCount: 0,
      contentViewed: false,
      certificateIssued: true,
    })

    expect(r.eligible).toBe(false)
    expect(r.reasons).toEqual(['certificate_issued'])
  })

  it('reports every reason that fired, not just the first', () => {
    // An operator explaining a refusal to an unhappy customer needs all of them.
    const r = decideEligibility({
      clearedCheckCount: 5,
      contentViewed: true,
      certificateIssued: true,
    })

    expect(r.reasons).toEqual<RefundIneligibilityReason[]>([
      'checks_cleared',
      'content_viewed',
      'certificate_issued',
    ])
  })

  it('three cleared checks and nothing else is still refundable', () => {
    // The boundary. Max is refunding the 30 of 40 seats that did not train, and
    // this is the person who dipped in and stopped.
    const r = decideEligibility({
      clearedCheckCount: REFUND_BLOCK_CLEARED_CHECKS - 1,
      contentViewed: false,
      certificateIssued: false,
    })

    expect(r.eligible).toBe(true)
    expect(r.reasons).toEqual([])
  })

  it('an untouched seat is refundable', () => {
    const r = decideEligibility({
      clearedCheckCount: 0,
      contentViewed: false,
      certificateIssued: false,
    })

    expect(r.eligible).toBe(true)
  })
})

describe('the count that feeds the rule', () => {
  it('the test-out user is caught by content, not by a fabricated check count', () => {
    // The case the plan singles out. Skipped 1–4 entirely, finished the
    // courseware, passed the final review.
    const events = [ev(5, true, 90)]
    const count = clearedCount(events, true)

    // Pre-ix-skipcascade this was 5, which would have fired 'checks_cleared'
    // against someone who personally cleared one check.
    expect(count).toBe(1)

    const r = decideEligibility({
      clearedCheckCount: count,
      contentViewed: true,
      certificateIssued: false,
    })

    // Still ineligible — correctly, and for the honest reason.
    expect(r.eligible).toBe(false)
    expect(r.reasons).toEqual(['content_viewed'])
    expect(r.reasons).not.toContain('checks_cleared')
  })

  it('cleared 1 to 4 without ever opening 5 is caught — the person the rule is for', () => {
    // Reads as highestLesson 4, which is why `>= 5` would have missed them.
    const events = [ev(1), ev(2), ev(3), ev(4)]
    const count = clearedCount(events, false)

    expect(count).toBe(4)

    const r = decideEligibility({
      clearedCheckCount: count,
      contentViewed: false,
      certificateIssued: false,
    })

    expect(r.eligible).toBe(false)
    expect(r.reasons).toEqual(['checks_cleared'])
  })

  it('a partial skipper is judged on what they cleared', () => {
    // 1, 2, 3 cleared, 4 skipped, readiness passed. Four personally cleared.
    const events = [ev(1), ev(2), ev(3), ev(5, true, 85)]
    expect(clearedCount(events, true)).toBe(4)
  })

  it('failed attempts do not count toward the threshold', () => {
    const events = [ev(1), ev(2), ev(5, false, 30), ev(5, false, 40)]
    expect(clearedCount(events, false)).toBe(2)

    expect(
      decideEligibility({
        clearedCheckCount: 2,
        contentViewed: false,
        certificateIssued: false,
      }).eligible
    ).toBe(true)
  })
})
