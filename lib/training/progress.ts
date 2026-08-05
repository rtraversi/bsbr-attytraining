// =============================================================================
// Knowledge-check progress + gating engine.
//
// Pure functions (no DB / no React) so the SAME logic runs on the server (to
// enforce gating + attempt limits authoritatively) and on the client (to render
// state). State is DERIVED from the append-only `knowledge_check_completed`
// training_events — there is no separate progress table.
//
// Rules (from the brief):
//  - NO sequential gating. Lessons 1–4 each stand alone and are always
//    attemptable (Max, 2026-07-30). Ordering was dropped because the lesson-5
//    test-out shortcut already lets a learner skip 1–4 entirely, so the
//    ordering rule was half-abandoned in practice — and enforcing it at SUBMIT
//    time rejected learners who had already answered every question.
//  - Lessons 1–4 clear on COMPLETION (any score). Lesson 5 (readiness) requires
//    a passing score (PASS_THRESHOLD).
//  - Lesson 5 has a "test-out" SHORTCUT: attempt it directly, skipping 1–4.
//    Passing via the shortcut grants full completion (all lessons cleared).
//    Failing the shortcut 3× (before clearing 1–4) LOCKS it → must then clear
//    1–4 (which grants lesson 5 a fresh set of attempts).
//    The shortcut only opens once the training CONTENT is verifiably complete
//    (contentViewed — a driver-reported video_completed event exists). The
//    1–4 path is NOT content-gated; only the skip is. Lesson 5 is therefore the
//    ONLY lesson that can ever be 'locked'.
//  - While not fully cleared, each check allows MAX_ATTEMPTS. Once EVERY lesson
//    is cleared (via either path), all checks become unlimited-retake forever.
//
// Stars (0–3): 1 = first check cleared; 2 = all of lessons 1–4 cleared;
//              3 = lesson 5 (readiness) cleared. Done in order the 3rd star is
//              the natural last step; via the shortcut all three land at once.
//
// ── ACCESS vs ACHIEVEMENT (ix-skipcascade) ───────────────────────────────────
// These are two different questions and they must not share a field:
//
//   ACCESS      "is anything more required of this learner here?"
//               → LessonState.status. Passing lesson 5 legitimately satisfies
//                 every lesson, because that is what the test-out shortcut IS.
//
//   ACHIEVEMENT "did this learner personally pass this check?"
//               → LessonState.clearedByAttempt, and Progress.attemptClearedCount.
//                 Never inflated by completion, the shortcut, or anything else.
//
// Until 2026-08-04 only the first existed, and it was written over the second:
// `cleared = fullyCleared || clearedThis`. Passing the readiness check marked
// all four earlier checks as cleared, including ones the learner never opened,
// and the record of what they actually did was not merely displayed wrong — it
// was unrecoverable, because the derivation destroyed it.
//
// That matters twice over. This product's output is Rule 5.3 supervision
// evidence, so "what did this person actually do" is the thing being sold. And
// refund eligibility (lib/refund-eligibility.ts) turns on how many checks
// someone cleared: a test-out user who cleared none would have counted as five,
// and been refused a refund for training they never consumed.
//
// status is unchanged on purpose — the shortcut UX is intended and correct.
// The fix is that the truth now survives alongside it.
// =============================================================================

import { LESSONS, MAX_ATTEMPTS, PASS_THRESHOLD, READINESS_LESSON } from './lessons'

export interface KnowledgeCheckEvent {
  lesson: number
  score: number
  passed: boolean
  attemptNumber: number
  created_at: string // ISO timestamp
}

export type LessonStatus = 'locked' | 'unlocked' | 'cleared'

export interface LessonState {
  number: number
  title: string
  /**
   * ACCESS state, not achievement. 'cleared' here means "satisfied — nothing
   * more is required of the learner on this check", which passing lesson 5
   * legitimately grants for every lesson via the test-out shortcut.
   *
   * Do NOT read this to answer "did this person clear this check?" — use
   * `clearedByAttempt`. See the note on that field.
   */
  status: LessonStatus
  /**
   * ACHIEVEMENT state: true only if this learner personally passed THIS check.
   * Never inflated by course completion, the test-out shortcut, or anything
   * else — `ix-skipcascade`.
   *
   * This is the field that carries Rule 5.3 evidentiary weight. `status` records
   * what the product owes the learner; this records what the learner actually
   * did, and the two genuinely differ for a test-out user.
   */
  clearedByAttempt: boolean
  isReadiness: boolean
  attempts: number
  /** null = unlimited (full clearance reached) */
  attemptsRemaining: number | null
  lastScore: number | null
  /** Low score on a cleared 1–4 lesson: soft, non-blocking "consider reviewing". */
  reviewFlag: boolean
}

export interface Progress {
  stars: number
  lessons: LessonState[]
  /**
   * How many checks this learner personally passed, 0–5. Counts
   * `clearedByAttempt`, so a test-out user who skipped 1–4 and passed only the
   * readiness check reads as 1, not 5.
   *
   * This is the number refund eligibility is computed from
   * (lib/refund-eligibility.ts). Reading `lessons.filter(l => l.status ===
   * 'cleared').length` instead would report 5 for that learner and silently
   * make them non-refundable for training they never consumed.
   */
  attemptClearedCount: number
  fullyCleared: boolean
  /** Lesson-5 shortcut has been failed out (3×) without clearing 1–4 first. */
  shortcutLocked: boolean
  /** Lesson-5 shortcut is currently attemptable (1–4 not done, not locked, content finished). */
  shortcutAvailable: boolean
  /** Lesson 5 cleared → the future final assessment (Quizzes tab) is unlocked. */
  quizzesUnlocked: boolean
}

const REGULAR = [1, 2, 3, 4]

export function deriveProgress(events: KnowledgeCheckEvent[], contentViewed: boolean): Progress {
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))

  const byLesson = new Map<number, KnowledgeCheckEvent[]>()
  for (const l of LESSONS) byLesson.set(l.number, [])
  for (const e of sorted) byLesson.get(e.lesson)?.push(e)

  const clearedRaw = (n: number) => byLesson.get(n)?.some(e => e.passed) ?? false

  const lesson5Passed = clearedRaw(READINESS_LESSON)
  // Lesson 5 is the terminus of both paths, so clearing it ⇒ full completion.
  const fullyCleared = lesson5Passed

  const all14 = REGULAR.every(clearedRaw)
  const any14 = REGULAR.some(clearedRaw)

  // When 1–4 all became cleared (max of each lesson's first pass). Only meaningful
  // once all14 — used to separate pre-completion "shortcut" lesson-5 attempts from
  // post-completion "sequential" ones, so a locked-out shortcut still leaves a
  // fresh set of sequential attempts on lesson 5.
  let t14: string | null = null
  if (all14) {
    t14 = REGULAR.map(n => byLesson.get(n)!.find(e => e.passed)!.created_at).reduce((a, b) =>
      a > b ? a : b
    )
  }

  const l5events = byLesson.get(READINESS_LESSON)!
  // Since clearance is monotonic, if 1–4 aren't all cleared NOW they weren't at any
  // past lesson-5 attempt either — so every prior lesson-5 attempt was a shortcut one.
  const shortcutFails = all14
    ? l5events.filter(e => t14 !== null && e.created_at < t14 && !e.passed).length
    : l5events.filter(e => !e.passed).length
  const shortcutLocked = !lesson5Passed && !all14 && shortcutFails >= MAX_ATTEMPTS
  const shortcutAvailable = !lesson5Passed && !all14 && !shortcutLocked && contentViewed

  let stars = 0
  if (lesson5Passed) stars = 3
  else if (all14) stars = 2
  else if (any14) stars = 1

  const lessons: LessonState[] = LESSONS.map(l => {
    const n = l.number
    const evs = byLesson.get(n)!
    const attempts = evs.length
    const last = evs[evs.length - 1]
    const clearedThis = clearedRaw(n)
    const cleared = fullyCleared || clearedThis

    let status: LessonStatus
    if (cleared) status = 'cleared'
    // Lessons 1–4 stand alone — no dependency on N-1 being cleared.
    else if (n < READINESS_LESSON) status = 'unlocked'
    else status = all14 || shortcutAvailable ? 'unlocked' : 'locked' // lesson 5

    let attemptsRemaining: number | null
    if (fullyCleared) {
      attemptsRemaining = null // unlimited review
    } else if (n === READINESS_LESSON) {
      // Count only attempts belonging to the CURRENT phase.
      const phaseAttempts =
        all14 && t14 !== null ? evs.filter(e => e.created_at >= t14!).length : evs.length
      attemptsRemaining = Math.max(0, MAX_ATTEMPTS - phaseAttempts)
    } else {
      attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attempts)
    }

    return {
      number: n,
      title: l.checkLabel ?? l.title,
      status,
      // clearedRaw, deliberately — NOT `cleared`. `cleared` folds in
      // fullyCleared, which is exactly the cascade this field exists to escape.
      clearedByAttempt: clearedThis,
      isReadiness: n === READINESS_LESSON,
      attempts,
      attemptsRemaining,
      lastScore: last ? last.score : null,
      reviewFlag: !!last && clearedThis && n !== READINESS_LESSON && last.score < PASS_THRESHOLD,
    }
  })

  return {
    stars,
    lessons,
    attemptClearedCount: lessons.filter(l => l.clearedByAttempt).length,
    fullyCleared,
    shortcutLocked,
    shortcutAvailable,
    quizzesUnlocked: lesson5Passed,
  }
}

/**
 * Authoritative server-side gate: may this user attempt `lesson` right now?
 * Enforces the lesson-5 shortcut lock and attempt limits. There is no
 * sequential unlock — lessons 1–4 are always attemptable.
 */
export function canAttempt(
  events: KnowledgeCheckEvent[],
  lesson: number,
  contentViewed: boolean
): { allowed: boolean; reason?: string } {
  const p = deriveProgress(events, contentViewed)
  const ls = p.lessons.find(l => l.number === lesson)
  if (!ls) return { allowed: false, reason: 'Invalid lesson.' }

  // Full clearance → unlimited retakes on every check.
  if (p.fullyCleared) return { allowed: true }

  // Only lesson 5 can be locked — lessons 1–4 are always attemptable, so there
  // is no "complete the previous lesson's check first" refusal any more.
  if (ls.status === 'locked') {
    return {
      allowed: false,
      reason: p.shortcutLocked
        ? 'The readiness shortcut is locked — complete lessons 1–4 first.'
        : 'Finish the training content to unlock this shortcut.',
    }
  }

  if (ls.attemptsRemaining !== null && ls.attemptsRemaining <= 0) {
    return { allowed: false, reason: 'No attempts remaining for this check.' }
  }

  return { allowed: true }
}
