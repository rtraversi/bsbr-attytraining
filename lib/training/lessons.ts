// The real lesson structure, confirmed from the actual Rise 360 export (not a
// guess). Order is load-bearing: sequential gating unlocks lesson N only after
// lesson N-1 is cleared. Lesson 5 is the readiness gate (needs a passing score).

export interface Lesson {
  number: number
  title: string
}

export const LESSONS: Lesson[] = [
  { number: 1, title: 'Introduction to AI in Legal Practice' },
  { number: 2, title: 'Protecting Client Confidentiality with AI Tools' },
  { number: 3, title: 'Ensuring Accuracy: Verification and Supervision of AI Outputs' },
  { number: 4, title: 'Compliant AI Workflows: Automations vs. Chatbox Use' },
  { number: 5, title: 'Applying Ethical Rules and Firm Policy to Everyday AI Use' },
]

// The final lesson is the readiness gate: unlike 1–4 (completion-only), it
// requires an actual passing score, and clearing it unlocks the Quizzes tab.
export const READINESS_LESSON = 5

// Matches the existing quiz pass_threshold convention (courses.pass_threshold).
export const PASS_THRESHOLD = 80

// Attempts per check while NOT yet fully cleared (initial + 2 retries).
// Once every lesson is cleared, checks become unlimited-retake for review.
export const MAX_ATTEMPTS = 3
