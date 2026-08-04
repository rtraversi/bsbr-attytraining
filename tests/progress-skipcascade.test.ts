import { describe, it, expect } from 'vitest'
import { deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'

/**
 * ix-skipcascade — passing the readiness check used to mark every earlier check
 * as cleared, destroying the record of what the learner actually did.
 *
 * These are pure-function tests: deriveProgress touches no DB and no React, so
 * the whole matrix runs in milliseconds with no fixtures.
 *
 * The distinction under test is ACCESS (`status`) versus ACHIEVEMENT
 * (`clearedByAttempt` / `attemptClearedCount`). Both are asserted in every case,
 * because the bug was not that either value was wrong on its own — it was that
 * one field was being made to carry both meanings.
 */

let clock = 0
function ev(lesson: number, passed: boolean, score = passed ? 100 : 20): KnowledgeCheckEvent {
  clock += 1000
  return {
    lesson,
    score,
    passed,
    attemptNumber: 1,
    created_at: new Date(clock).toISOString(),
  }
}

const byNumber = (p: ReturnType<typeof deriveProgress>, n: number) =>
  p.lessons.find(l => l.number === n)!

describe('deriveProgress — access vs achievement', () => {
  it('a test-out user who cleared NO individual checks counts as 1, not 5', () => {
    // The exact learner Task 5 must not misclassify: skipped 1–4 entirely,
    // finished the content, passed the readiness check.
    const p = deriveProgress([ev(5, true, 90)], true)

    expect(p.fullyCleared).toBe(true)
    expect(p.attemptClearedCount).toBe(1)

    for (const n of [1, 2, 3, 4]) {
      // Access: satisfied — the shortcut is a real, intended route.
      expect(byNumber(p, n).status).toBe('cleared')
      // Achievement: they never opened these. This is the assertion that fails
      // against the old code.
      expect(byNumber(p, n).clearedByAttempt).toBe(false)
    }

    expect(byNumber(p, 5).clearedByAttempt).toBe(true)
  })

  it('a partial skipper is counted on what they did, not rounded up', () => {
    // Cleared 1, 2, 3 — skipped 4's check — then passed readiness.
    const p = deriveProgress(
      [ev(1, true), ev(2, true), ev(3, true), ev(5, true, 85)],
      true
    )

    expect(p.fullyCleared).toBe(true)
    expect(p.attemptClearedCount).toBe(4) // 1, 2, 3, 5 — NOT 5
    expect(byNumber(p, 4).clearedByAttempt).toBe(false)
    expect(byNumber(p, 4).status).toBe('cleared')
  })

  it('the sequential learner is unaffected — every check is genuinely theirs', () => {
    const p = deriveProgress(
      [ev(1, true), ev(2, true), ev(3, true), ev(4, true), ev(5, true, 95)],
      true
    )

    expect(p.attemptClearedCount).toBe(5)
    for (const n of [1, 2, 3, 4, 5]) {
      expect(byNumber(p, n).clearedByAttempt).toBe(true)
      expect(byNumber(p, n).status).toBe('cleared')
    }
  })

  it('a failed readiness attempt clears nothing', () => {
    const p = deriveProgress([ev(1, true), ev(5, false, 40)], true)

    expect(p.fullyCleared).toBe(false)
    expect(p.attemptClearedCount).toBe(1)
    expect(byNumber(p, 5).clearedByAttempt).toBe(false)
    expect(byNumber(p, 2).clearedByAttempt).toBe(false)
    expect(byNumber(p, 2).status).toBe('unlocked')
  })

  it('lessons 1–4 clear on completion at any score, and only for themselves', () => {
    // A 20% score still clears a 1–4 check by design (completion, not mastery),
    // but it must not touch its neighbours.
    const p = deriveProgress([ev(3, true, 20)], false)

    expect(p.attemptClearedCount).toBe(1)
    expect(byNumber(p, 3).clearedByAttempt).toBe(true)
    expect(byNumber(p, 3).reviewFlag).toBe(true) // low score → soft review nudge
    expect(byNumber(p, 2).clearedByAttempt).toBe(false)
    expect(byNumber(p, 4).clearedByAttempt).toBe(false)
  })

  it('counts a lesson once however many times it was passed', () => {
    const p = deriveProgress([ev(1, false), ev(1, true), ev(1, true)], false)

    expect(p.attemptClearedCount).toBe(1)
    expect(byNumber(p, 1).attempts).toBe(3)
  })

  it('a learner with no events has cleared nothing', () => {
    const p = deriveProgress([], false)

    expect(p.attemptClearedCount).toBe(0)
    expect(p.fullyCleared).toBe(false)
    expect(p.lessons.every(l => !l.clearedByAttempt)).toBe(true)
  })
})
