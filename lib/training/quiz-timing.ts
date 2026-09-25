// Certificate Assessment clock. Pure constants, safe to import from client and
// server alike (lib/training/assessment.ts pulls in the database helpers, so
// the quiz UI imports these from here instead).
//
// Max, 2026-09-25: "lets add time limit to cert assessment. half an hour."
// Lesson knowledge checks are NOT timed; only the Certificate Assessment is.

/** What the learner is told and shown counting down: 30 minutes. */
export const QUIZ_TIME_LIMIT_MS = 30 * 60 * 1000

/**
 * Extra time the SERVER allows past the limit, for the attestation step (which
 * the runner jumps to at 0:00) and for network lag. The learner never sees it
 * on the clock.
 */
export const QUIZ_SUBMIT_GRACE_MS = 2 * 60 * 1000

/** A session's whole life: the limit plus the grace. expires_at = issued_at + this. */
export const QUIZ_SESSION_TTL_MS = QUIZ_TIME_LIMIT_MS + QUIZ_SUBMIT_GRACE_MS

/** When the countdown shows the "5 minutes left." notice. */
export const QUIZ_WARNING_MS = 5 * 60 * 1000
