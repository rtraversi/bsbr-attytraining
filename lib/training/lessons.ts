// The real lesson structure, confirmed from the actual Rise 360 export (not a
// guess). Knowledge checks 1–4 are NOT sequentially gated — each stands alone
// (Max, 2026-07-30; see lib/training/progress.ts). Order still matters for the
// content path (Rise blocks skipping ahead, and lesson position drives the
// course outline) and lesson 5 remains the readiness gate (needs a passing
// score).

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
  /**
   * Quiz-layer display name override. When set, everything derived from
   * LessonState (deriveProgress) shows this instead of `title` — the content
   * surfaces (Course Outline, Up Next, Lesson Overview) keep the real subject
   * title by reading LESSONS directly.
   */
  checkLabel?: string
  /** One-paragraph overview, sourced from the actual Rise course text. */
  summary: string
  /** Per-lesson key takeaways, sourced from the actual Rise course text. */
  keyTakeaways: string[]
}

export const LESSONS: Lesson[] = [
  {
    number: 1,
    id: 'cmqqsf35y002h2e7a2btrnmky',
    title: 'Introduction to AI in Legal Practice',
    summary:
      'Overview of why AI compliance matters for law firm staff — the two core risks (confidentiality and accuracy), the two main types of AI tools firms use, and why ABA Model Rule 5.3 makes every staff member responsible for ethical AI use, not just attorneys.',
    keyTakeaways: [
      'AI compliance in a law firm comes down to two things: protecting confidentiality and ensuring accuracy.',
      'The three biggest risks are unintentional disclosure, relying on inaccurate or hallucinated AI output, and unsupervised AI use.',
      'ABA Model Rule 5.3 makes every staff member — not just attorneys — responsible for ethical AI use.',
    ],
  },
  {
    number: 2,
    id: 'cmqqsf360002i2e7ad9hyl1h6',
    title: 'Protecting Client Confidentiality with AI Tools',
    summary:
      "AI chatboxes can leak confidential client information even when you think you've been careful — removing a client's name isn't enough, since any combination of identifying details can still reveal who they are.",
    keyTakeaways: [
      'Never paste client data or attorney strategy into a consumer chatbox — many retain or reuse what you enter.',
      "Confidentiality isn't just about names — any combination of identifying details can expose who a client is.",
      "Only use firm-approved, secure platforms, and stop and ask if you're unsure whether a workflow is compliant.",
    ],
  },
  {
    number: 3,
    id: 'cmqqsf360002j2e7adpbcqjgp',
    title: 'Ensuring Accuracy: Verification and Supervision of AI Outputs',
    summary:
      'AI can "hallucinate" — generate confident-sounding but completely false citations, cases, or facts. Every legal citation, fact, or assertion produced by AI must be checked against a trusted source before it\'s used.',
    keyTakeaways: [
      'AI hallucinations are false but plausible-sounding — never trust them at face value.',
      'Every legal citation or fact from AI must be checked against an authoritative source before use.',
      "Always be explicit when content hasn't been independently verified yet.",
    ],
  },
  {
    number: 4,
    id: 'cmqqsf360002k2e7ajnmye0jx',
    title: 'Compliant AI Workflows: Automations vs. Chatbox Use',
    summary:
      "The compliance risk isn't which AI tool you use, but how you use it — secure automations move client data through verified, approved channels (APIs), while open-ended chatboxes have no such safeguard.",
    keyTakeaways: [
      'Automations move data through secure, approved channels; chatboxes have no such verification and should never handle client data.',
      'The same task can be compliant or non-compliant depending on which route the data takes.',
      'Only use workflows your firm has specifically reviewed and approved — when unsure, stop and ask.',
    ],
  },
  {
    number: 5,
    id: 'cmqqsf360002l2e7a4ghytq01',
    title: 'Applying Ethical Rules and Firm Policy to Everyday AI Use',
    checkLabel: 'Final Review',
    summary:
      'Real-world AI use is full of gray areas — when staff can act independently versus when attorney supervision is required, how to evaluate whether an AI vendor is safe, and how to apply firm policy to situations no checklist covers.',
    keyTakeaways: [
      'Never provide legal advice or enter client data into unapproved systems — involve an attorney when judgment calls arise.',
      'Not all AI vendors are equal — check for firm approval and a vendor agreement before trusting a new tool.',
      "When a situation isn't covered by any checklist, apply the firm's core principles and escalate if unsure.",
    ],
  },
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
