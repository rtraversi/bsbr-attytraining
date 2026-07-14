// =============================================================================
// PLACEHOLDER knowledge-check questions — 3 authored per lesson (15 total).
//
// These are content-appropriate stand-ins written against each lesson's real
// title/topic. REPLACE this pool with Rob/Katy's real question pool once it
// exists — it's a clean per-lesson drop-in: keep the same shape (question_text
// + answers[] + correct_index) and the same `QUESTION_POOL[lessonNumber]`
// keying, and nothing else has to change.
//
// Lesson 5 is the Final Review — a CUMULATIVE check one step before the
// Certificate Assessment — so QUESTION_POOL[5] is composed of every lesson's
// questions (1–4 plus lesson 5's own three), not just its own.
//
// `correct_index` NEVER leaves the server. The client gets questions via
// `clientQuestionsByLesson()` / `clientQuestions()`, which strip it. Scoring
// happens server-side in /api/training/knowledge-check.
// =============================================================================

export interface PoolQuestion {
  id: string
  question_text: string
  answers: string[]
  correct_index: number
}

/** Client-safe question shape — same as the existing quiz-component's QuizQuestion. */
export interface ClientQuestion {
  id: string
  question_text: string
  answers: string[]
}

// Lesson 1 — Introduction to AI in Legal Practice
const LESSON_1_QUESTIONS: PoolQuestion[] = [
  {
    id: 'l1q1',
    question_text: 'Which statement best describes generative AI’s role in a law firm?',
    answers: [
      'A tool that assists staff but still requires human oversight',
      'A replacement for attorney judgment',
      'A system that is always accurate and needs no review',
      'A product that is prohibited in all legal work',
    ],
    correct_index: 0,
  },
  {
    id: 'l1q2',
    question_text: 'Under ABA Model Rule 5.3, who remains responsible for work produced with AI assistance?',
    answers: [
      'The AI vendor',
      'The supervising attorney',
      'No one — AI output is unattributable',
      'The client',
    ],
    correct_index: 1,
  },
  {
    id: 'l1q3',
    question_text: 'A realistic, appropriate benefit of AI in legal practice is:',
    answers: [
      'Filing documents with the court automatically without review',
      'Giving clients binding legal advice directly',
      'Producing faster first-pass drafts that staff then verify',
      'Eliminating the need for confidentiality safeguards',
    ],
    correct_index: 2,
  },
]

// Lesson 2 — Protecting Client Confidentiality with AI Tools
const LESSON_2_QUESTIONS: PoolQuestion[] = [
  {
    id: 'l2q1',
    question_text: 'Before entering client information into an AI tool, you should:',
    answers: [
      'Only use tools with appropriate data-handling safeguards and approval',
      'Use any free public chatbot to save time',
      'Assume all AI tools keep data private',
      'Share the full client file to get the best result',
    ],
    correct_index: 0,
  },
  {
    id: 'l2q2',
    question_text: 'A colleague pastes a client’s settlement terms into a free public chatbot. This most directly risks:',
    answers: [
      'Slower drafting',
      'Breaching client confidentiality',
      'Higher software costs',
      'Nothing — public tools are always safe',
    ],
    correct_index: 1,
  },
  {
    id: 'l2q3',
    question_text: 'Which is the safest confidentiality practice?',
    answers: [
      'Using firm-approved tools governed by a data-handling agreement',
      'Emailing client data to a personal AI account',
      'Disabling all firm security to speed up work',
      'Posting redacted-looking text to a public forum',
    ],
    correct_index: 0,
  },
]

// Lesson 3 — Ensuring Accuracy: Verification and Supervision of AI Outputs
const LESSON_3_QUESTIONS: PoolQuestion[] = [
  {
    id: 'l3q1',
    question_text: 'AI-generated case citations should always be:',
    answers: [
      'Trusted as-is if they look formatted correctly',
      'Independently verified against primary sources',
      'Submitted to the court without review',
      'Ignored entirely',
    ],
    correct_index: 1,
  },
  {
    id: 'l3q2',
    question_text: 'The phenomenon where an AI produces plausible-sounding but false information is called:',
    answers: ['Indexing', 'Hallucination', 'Encryption', 'Redaction'],
    correct_index: 1,
  },
  {
    id: 'l3q3',
    question_text: 'Who is responsible for verifying the accuracy of AI output before it is used?',
    answers: [
      'The AI tool itself',
      'Only the client',
      'The staff member together with the supervising attorney',
      'No one is responsible',
    ],
    correct_index: 2,
  },
]

// Lesson 4 — Compliant AI Workflows: Automations vs. Chatbox Use
const LESSON_4_QUESTIONS: PoolQuestion[] = [
  {
    id: 'l4q1',
    question_text: 'A key difference between an approved automation and ad-hoc chatbot use is that approved automations:',
    answers: [
      'Have defined data handling and oversight',
      'Are always slower',
      'Never involve AI',
      'Require no configuration',
    ],
    correct_index: 0,
  },
  {
    id: 'l4q2',
    question_text: 'Ad-hoc chatbot use is riskier mainly because:',
    answers: [
      'It is more expensive',
      'Its inputs and outputs are unmonitored and may leak data',
      'It cannot produce text',
      'It is banned by federal law',
    ],
    correct_index: 1,
  },
  {
    id: 'l4q3',
    question_text: 'Which workflow is the most compliant?',
    answers: [
      'A firm-configured automation with logged, reviewable steps',
      'Pasting client data into a random new tool a colleague mentioned',
      'Using a personal chatbot account for client work',
      'Skipping oversight to move faster',
    ],
    correct_index: 0,
  },
]

// Lesson 5's OWN questions — Applying Ethical Rules and Firm Policy to Everyday
// AI Use (the readiness gate — requires a passing score)
const LESSON_5_QUESTIONS: PoolQuestion[] = [
  {
    id: 'l5q1',
    question_text: 'When firm policy is stricter than the ABA Model Rules, you should follow:',
    answers: [
      'Whichever is more convenient',
      'The stricter firm policy',
      'Neither',
      'Only the ABA rules',
    ],
    correct_index: 1,
  },
  {
    id: 'l5q2',
    question_text: 'If you are unsure whether a particular AI use is compliant, the best first step is to:',
    answers: [
      'Proceed and hope it is fine',
      'Ask a friend outside the firm',
      'Consult your supervising attorney or firm policy',
      'Delete the client file',
    ],
    correct_index: 2,
  },
  {
    id: 'l5q3',
    question_text: 'Competent use of AI under the ethical rules requires:',
    answers: [
      'Understanding the tool’s limitations and supervising its output',
      'Assuming the tool is always correct',
      'Never documenting how the tool was used',
      'Avoiding all human review',
    ],
    correct_index: 0,
  },
]

export const QUESTION_POOL: Record<number, PoolQuestion[]> = {
  1: LESSON_1_QUESTIONS,
  2: LESSON_2_QUESTIONS,
  3: LESSON_3_QUESTIONS,
  4: LESSON_4_QUESTIONS,
  // Final Review — cumulative: draws from all five lessons (~15 questions).
  5: [
    ...LESSON_1_QUESTIONS,
    ...LESSON_2_QUESTIONS,
    ...LESSON_3_QUESTIONS,
    ...LESSON_4_QUESTIONS,
    ...LESSON_5_QUESTIONS,
  ],
}

/** Strip correct answers for a single lesson (safe to send to the browser). */
export function clientQuestions(lesson: number): ClientQuestion[] {
  return (QUESTION_POOL[lesson] ?? []).map(({ id, question_text, answers }) => ({
    id,
    question_text,
    answers,
  }))
}

/** Client-safe questions keyed by lesson number, for all lessons. */
export function clientQuestionsByLesson(): Record<number, ClientQuestion[]> {
  const out: Record<number, ClientQuestion[]> = {}
  for (const key of Object.keys(QUESTION_POOL)) {
    const n = Number(key)
    out[n] = clientQuestions(n)
  }
  return out
}
