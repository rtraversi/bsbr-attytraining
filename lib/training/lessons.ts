// The real lesson structure, confirmed from the actual Rise 360 export (not a
// guess). Order is load-bearing: sequential gating unlocks lesson N only after
// lesson N-1 is cleared. Lesson 5 is the readiness gate (needs a passing score).

export interface Lesson {
  number: number
  /**
   * Rise's internal lesson id, as it appears in cmi.core.lesson_location
   * (e.g. `index.html#/lessons/<id>`). Decoded from the current Rise export's
   * runtime-data.js. These are stable across a *re-export* of the same course,
   * but would change if the course is ever regenerated from scratch — update
   * them here if that happens, or lesson_location tracking silently stops
   * resolving (lessonNumberFromLocation → null → events no-op).
   */
  id: string
  title: string
}

export const LESSONS: Lesson[] = [
  { number: 1, id: 'cmqqsf35y002h2e7a2btrnmky', title: 'Introduction to AI in Legal Practice' },
  { number: 2, id: 'cmqqsf360002i2e7ad9hyl1h6', title: 'Protecting Client Confidentiality with AI Tools' },
  { number: 3, id: 'cmqqsf360002j2e7adpbcqjgp', title: 'Ensuring Accuracy: Verification and Supervision of AI Outputs' },
  { number: 4, id: 'cmqqsf360002k2e7ajnmye0jx', title: 'Compliant AI Workflows: Automations vs. Chatbox Use' },
  { number: 5, id: 'cmqqsf360002l2e7a4ghytq01', title: 'Applying Ethical Rules and Firm Policy to Everyday AI Use' },
]

/**
 * Resolve a SCORM `cmi.core.lesson_location` string to a lesson number.
 * Format is `index.html#/lessons/<lessonId>`; we pull the id after `/lessons/`
 * and look it up against LESSONS. Returns null for anything that doesn't map to
 * a known lesson (unknown id, malformed value) so callers can safely no-op.
 */
export function lessonNumberFromLocation(location: string): number | null {
  const match = /\/lessons\/([a-z0-9]+)/i.exec(location)
  if (!match) return null
  const lesson = LESSONS.find(l => l.id === match[1])
  return lesson ? lesson.number : null
}

// The final lesson is the readiness gate: unlike 1–4 (completion-only), it
// requires an actual passing score, and clearing it unlocks the Quizzes tab.
export const READINESS_LESSON = 5

// Matches the existing quiz pass_threshold convention (courses.pass_threshold).
export const PASS_THRESHOLD = 80

// Attempts per check while NOT yet fully cleared (initial + 2 retries).
// Once every lesson is cleared, checks become unlimited-retake for review.
export const MAX_ATTEMPTS = 3
