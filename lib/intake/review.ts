// =============================================================================
// Policy intake — reading it back.
//
// Turns an AnswerMap into "the questions as asked and the answers as given",
// which is what the firm sees after they submit and what Settings shows under
// its own heading. ONE function behind both, because they are the same screen:
// the spec logged them separately (2026-08-27 for Settings, 2026-08-28 for the
// post-submit view) and building them twice is how they drift into two
// different accounts of the same firm's answers.
//
// Pure. No database, no React. Everything it knows it learns from QUESTIONS and
// one AnswerMap, which is what lets tests drive the real code.
//
// ── 🔴 THE SENSITIVE ANSWERS ARE EXCLUDED HERE, NOT AT THE CALL SITE ────────
//
// `prior_ai_error` and `carrier_notified` go to intake_sensitive, which has RLS
// on and no policy at all, because they are Katy's eyes only: never rendered in
// a firm-facing screen, never in the dashboard, never in any export but hers.
//
// loadAnswers() returns them, deliberately — the firm typed them and must be
// able to correct them WHILE the intake is open. This is the other side of that
// rule, and it is enforced in this file rather than by each caller remembering,
// because "every screen that reads answers must filter two keys" is a rule with
// one failure mode and no warning attached to it.
// =============================================================================

import { QUESTIONS, getQuestion, optionsForQuestion } from './questions'
import { visibleQuestions, isAnswered, toolGridTools } from './branching'
import {
  SECTION_LABELS,
  NOT_DECIDED_YET,
  isOtherValue,
  otherText,
  type AnswerMap,
  type Question,
  type RosterRow,
  type SectionKey,
  type ToolGridRow,
  type UploadRef,
} from './types'

export interface ReviewItem {
  key: string
  prompt: string
  /** Formatted for display. `null` when the question was asked and skipped. */
  answer: string | null
  /**
   * The number the firm SAW on this question in the intake — position within
   * its section, over the visible questions.
   *
   * 🔴 NOT THIS LIST'S OWN INDEX, and the distinction is the whole reason this
   * field exists. buildReview drops the two `sensitive` questions, so counting
   * the review's own rows would renumber everything after them and the firm
   * would be reading back a "7" that was an "8" when they answered it. That is
   * a small error with an unpleasant shape: the one document whose job is to
   * say "here is exactly what you told us" quietly disagreeing with the form
   * that collected it.
   *
   * The consequence is that the review's numbers can have GAPS where a
   * sensitive question was. That is correct — it is the intake's numbering,
   * faithfully carried.
   */
  number: number
  /** Visible questions in the whole intake — the denominator the firm saw. */
  totalQuestions: number
}

export interface ReviewSection {
  section: SectionKey
  label: string
  items: ReviewItem[]
}

/** The label for one option value, falling back to the raw value. */
function optionLabel(question: Question, value: string): string {
  if (isOtherValue(value)) return otherText(value) ?? value
  const options = optionsForQuestion(question)
  return options.find((o) => o.value === value)?.label ?? value
}

/**
 * One answer as the firm should read it back.
 *
 * Every branch renders the LABEL rather than the stored value. The values are
 * stable ids chosen so wording can change without touching stored answers
 * (see QuestionOption) — showing `templates_only` to a firm reading their own
 * intake would be showing them our database.
 */
export function formatAnswer(question: Question, answers: AnswerMap): string | null {
  if (!isAnswered(question, answers)) return null
  const value = answers[question.key]

  switch (question.type) {
    case 'text':
    case 'longtext':
      // The sentinel is a real answer with its own meaning — "the firm has not
      // taken a position" — and prepared text covers it. It must not read back
      // as the literal `__not_decided_yet__`.
      return value === NOT_DECIDED_YET ? 'Not decided yet' : String(value)

    case 'yesno':
      return value === 'yes' ? 'Yes' : 'No'

    case 'single':
      return optionLabel(question, String(value))

    case 'multi':
    case 'states':
    case 'languages':
      return (value as string[]).map((v) => optionLabel(question, v)).join(' · ')

    case 'roster':
      return (value as RosterRow[])
        .map((r) => `${r.name}, ${r.email}, ${r.isAttorney ? 'Attorney' : 'Staff'}`)
        .join('\n')

    case 'tool-grid': {
      // Labelled off the ai_tools answer, the same way the grid itself is, so a
      // free-text tool reads back as the firm typed it rather than as
      // `other:Perplexity`.
      const labels = new Map(toolGridTools(answers).map((t) => [t.value, t.label]))
      const AGREEMENT: Record<string, string> = {
        yes: 'no-training agreement signed',
        no: 'no agreement',
        unknown: 'not known',
      }
      return (value as ToolGridRow[])
        .map((r) => `${labels.get(r.tool) ?? r.tool}: ${AGREEMENT[r.noTraining ?? ''] ?? 'Not answered'}`)
        .join('\n')
    }

    case 'upload':
      return (value as UploadRef).originalName
  }
}

/**
 * Where a question sits in its SECTION, counted over the questions the firm
 * actually sees.
 *
 * 🔴 ONE IMPLEMENTATION, TWO SCREENS. The intake's own counter and the review's
 * numbers must agree, and the only way to guarantee that is for both to call
 * this. app/intake/_components/intake-client.tsx's SectionCounter used to
 * compute it inline; a second copy is exactly how the form and the read-back
 * would drift into disagreeing about which question was number 7.
 *
 * Per SECTION, never a running total across the intake — "12 of 29" makes a
 * long form feel long, which is the opposite of what showing one question at a
 * time is for (see intake-client.tsx's header).
 *
 * ⚠️ It counts SENSITIVE questions too, because the firm saw them. buildReview
 * drops those from what it renders but keeps their numbering, so the review can
 * skip a number. That gap is the intake's truth, not an off-by-one.
 */
/**
 * Position across the WHOLE intake — the number the firm actually saw.
 *
 * This is the big numeral on the intake card, which is `index + 1` over
 * visibleQuestions() (intake-client.tsx). The review printed the per-SECTION
 * position until 2026-09-02, so it restarted at 1 in every section while the
 * intake had been counting 1…31 — two screens numbering the same questions
 * differently (Max, from a browser: "the count shouldnt be per section, but
 * exactly like intake").
 *
 * ⚠️ Counts SENSITIVE questions, because the firm saw them and they took a
 * number. buildReview drops those from what it RENDERS but not from the count,
 * so the review can skip a number. That gap is the intake's own numbering, not
 * an off-by-one.
 */
export function globalPositionOf(
  question: Question,
  visible: readonly Question[],
): { at: number; of: number } {
  return {
    at: visible.findIndex((q) => q.key === question.key) + 1,
    of: visible.length,
  }
}

export function sectionPositionOf(
  question: Question,
  visible: readonly Question[],
): { at: number; of: number } {
  const inSection = visible.filter((q) => q.section === question.section)
  return {
    at: inSection.findIndex((q) => q.key === question.key) + 1,
    of: inSection.length,
  }
}

/**
 * The whole intake as the firm can read it, grouped by section.
 *
 * VISIBLE questions only, so the firm sees what they were actually asked rather
 * than all fifty — a branch they never entered is not a question they skipped,
 * and listing it would read as an omission they need to go and fix.
 *
 * A visible question with no answer is kept, with `answer: null`. That is an
 * optional question they passed on, and dropping it would quietly rewrite their
 * intake into one where the question was never put.
 */
export function buildReview(answers: AnswerMap): ReviewSection[] {
  const out: ReviewSection[] = []
  const visible = visibleQuestions(answers)

  for (const question of visibleQuestions(answers)) {
    // See the header. This is the only place it is filtered.
    if (question.sensitive) continue

    const last = out.at(-1)
    // The GLOBAL number, matching the intake's big numeral. See globalPositionOf.
    const position = globalPositionOf(question, visible)
    const item: ReviewItem = {
      key: question.key,
      prompt: question.prompt,
      answer: formatAnswer(question, answers),
      number: position.at,
      totalQuestions: position.of,
    }

    // Sections are contiguous in QUESTIONS and asserted so at module load, so
    // appending to the last group is enough — no lookup, no re-sort.
    if (last && last.section === question.section) last.items.push(item)
    else out.push({ section: question.section, label: SECTION_LABELS[question.section], items: [item] })
  }

  return out
}

/**
 * The keys buildReview will never emit, for the test that pins it.
 *
 * Derived from the question set rather than written down, so marking a third
 * question sensitive cannot leave this list stale.
 */
export const NEVER_SHOWN_TO_FIRM: readonly string[] = QUESTIONS.filter((q) => q.sensitive).map(
  (q) => q.key,
)

/** Whether a key is one of the two Katy-only answers. Exported for callers that
 *  build their own views and need the same rule rather than a second copy. */
export function isSensitiveKey(key: string): boolean {
  return getQuestion(key)?.sensitive === true
}

// ---------------------------------------------------------------------------
// Which screen is this?
// ---------------------------------------------------------------------------

/**
 * The state of an intake, for the two callers that render it.
 *
 * ONE function, because /intake and Settings must never disagree about whether
 * a firm may still edit. The dangerous mistake is reading `policy_delivered_at`
 * off a row that did not select it — `undefined` is falsy, which reads as
 * "not delivered". SESSION_COLUMNS in session.ts exists to stop that; this
 * function is the other half.
 *
 * ── D8-1: there is no `purged` state, and there never will be again ─────────
 *
 * It existed until 2026-09-01 and its on-screen copy told firms "Your answers
 * were deleted after your policy was delivered". Katy reversed that outright:
 * "We should save the previous responses so they can easily redo without
 * typing in everything from scratch". Answers are KEPT. What ends them is the
 * subscription lapsing, not the policy going out — see lib/intake/retention.ts.
 */
export type IntakeState = 'editable' | 'submitted' | 'delivered'

/**
 * 🔴 `delivered` MEANS THE DELIVERED POLICY MATCHES THESE ANSWERS.
 *
 * Not "a policy was delivered once". The difference only appeared with D8-2,
 * which lets a firm reopen AFTER delivery: reopen, edit, send again, and
 * `policy_delivered_at` is still set while the answers behind it have moved.
 * Reading that row as `delivered` would tell the firm their current answers
 * are the ones their document was written from, which is exactly false.
 *
 * Comparing the two timestamps is what distinguishes them, and it needs no
 * column: a resubmission moves `submitted_at` forward (see
 * app/api/intake/submit/route.ts), so `submitted_at > policy_delivered_at` is
 * precisely "these answers have not been delivered yet".
 */
export function intakeStateOf(session: {
  status: string
  submitted_at?: string | null
  policy_delivered_at: string | null
} | null): IntakeState {
  if (!session) return 'editable'
  if (session.status === 'in_progress') return 'editable'
  if (!session.policy_delivered_at) return 'submitted'
  // Resubmitted since the policy went out — awaiting a fresh one.
  if (session.submitted_at && session.submitted_at > session.policy_delivered_at) {
    return 'submitted'
  }
  return 'delivered'
}

/**
 * Whether the firm may reopen and correct this intake.
 *
 * ── D8-2: yes, indefinitely, delivered or not ───────────────────────────────
 *
 * This returned true for `'submitted'` only, so delivering a policy locked the
 * intake forever. Katy: "they can update their answers indefinitely to update
 * the policy as they aquire more information, or change their mind about free
 * text items."
 *
 * The old reasoning was that changing the answers would leave them disagreeing
 * with the delivered document. That is true and it is no longer a reason to
 * refuse: a firm that revises its answers wants a revised policy, and the
 * assembler regenerates one deterministically from whatever the answers now
 * say. The disagreement is the POINT of the edit, not a defect in it — and
 * `reopened_count` (migration 0030) still records that it happened.
 *
 * `editable` is excluded because it is already open, not because it is barred.
 */
export function canReopen(state: IntakeState): boolean {
  return state === 'submitted' || state === 'delivered'
}
