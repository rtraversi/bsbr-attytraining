/**
 * ix-lessoncounter — the "Lessons X/5" counter derived from lessons WALKED.
 *
 * Both the Overview pill and the Training progress bar computed
 * `currentLessonNumber - 1`: where the learner NAVIGATED, not what they
 * finished. Take the lesson-5 test-out shortcut and the Overview page
 * contradicted itself on one screen — "Lesson checks" read 5/5 cleared, a
 * certificate had been issued, and the "Lessons" pill read 3/5.
 *
 * This is the display half of ix-skipcascade, which a21aa59 fixed in the data
 * layer only. Pure functions, no DB — the whole matrix runs in milliseconds.
 *
 * ⚠️ The choice under test is ACCESS, not ACHIEVEMENT (see progress.ts:32).
 * `grantedClearedLessons` reads `status === 'cleared'`, which INCLUDES lessons
 * granted by the shortcut. `attemptClearedCount` — what
 * lib/refund-eligibility.ts computes from — is untouched, and the last test
 * here pins that separation.
 */

import { describe, it, expect } from 'vitest'
import {
  countLessonsFinished,
  deriveProgress,
  grantedClearedLessons,
  type KnowledgeCheckEvent,
} from '@/lib/training/progress'
import { LESSONS } from '@/lib/training/lessons'

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

describe('countLessonsFinished', () => {
  it('counts nothing for a learner who has done nothing', () => {
    expect(countLessonsFinished([], null, false)).toBe(0)
  })

  it('counts lessons walked past — reaching lesson 3 means 1 and 2 are behind you', () => {
    expect(countLessonsFinished([], 3, false)).toBe(2)
  })

  it('counts the whole course once the content reports completion', () => {
    expect(countLessonsFinished([], null, true)).toBe(LESSONS.length)
  })

  it('takes the UNION, not the max — walked {1,2} plus cleared {4} is three lessons', () => {
    // Checks are not sequential, so neither scalar alone is right here:
    // max(walked=2, cleared=1) would report 2, and cleared alone would report 1.
    expect(countLessonsFinished([4], 3, false)).toBe(3)
  })

  it('does not double-count a lesson both walked past and cleared', () => {
    expect(countLessonsFinished([1, 2], 3, false)).toBe(2)
  })

  it('ignores lesson numbers that are not real lessons', () => {
    expect(countLessonsFinished([99, -1], null, false)).toBe(0)
  })
})

describe('the regression: a test-out learner is no longer reported part-way through', () => {
  // The exact learner the pill contradicted: skipped 1–4 entirely, finished the
  // content, passed the readiness check, holds a certificate. Navigation had
  // only ever reached lesson 3.
  const progress = deriveProgress([ev(5, true, 90)], true)

  it('deriveProgress agrees they are fully cleared', () => {
    expect(progress.fullyCleared).toBe(true)
  })

  it('OLD math reported 2/5 — the number that contradicted the header', () => {
    const currentLessonNumber = 3
    expect(currentLessonNumber - 1).toBe(2)
  })

  it('NEW math reports 5/5, agreeing with the checks card and the certificate', () => {
    expect(countLessonsFinished(grantedClearedLessons(progress), 3, false)).toBe(LESSONS.length)
  })

  it('and still reports 5/5 if the learner never navigated anywhere at all', () => {
    expect(countLessonsFinished(grantedClearedLessons(progress), null, false)).toBe(
      LESSONS.length
    )
  })

  it('🔴 does NOT inflate attemptClearedCount — refund eligibility is unaffected', () => {
    // The trap. This learner personally passed exactly ONE check. If the
    // counter fix had been made by widening attemptClearedCount instead, they
    // would read as 5 and be silently refused a refund for training they never
    // consumed. grantedClearedLessons is a separate function for this reason.
    expect(progress.attemptClearedCount).toBe(1)
    expect(grantedClearedLessons(progress)).toHaveLength(LESSONS.length)
  })
})

describe('the ordinary path is not regressed', () => {
  it('a learner reading lesson 4 with checks 1–3 cleared reads 3/5', () => {
    const progress = deriveProgress([ev(1, true), ev(2, true), ev(3, true)], false)
    expect(countLessonsFinished(grantedClearedLessons(progress), 4, false)).toBe(3)
  })

  it('a learner who read three lessons but took no check still gets credit for reading', () => {
    const progress = deriveProgress([], false)
    // Would be 0 if the counter had been switched to clearance alone — the
    // regression in the opposite direction.
    expect(countLessonsFinished(grantedClearedLessons(progress), 4, false)).toBe(3)
  })

  it('a failed check does not count as finished', () => {
    const progress = deriveProgress([ev(2, false)], false)
    expect(countLessonsFinished(grantedClearedLessons(progress), null, false)).toBe(0)
  })
})
