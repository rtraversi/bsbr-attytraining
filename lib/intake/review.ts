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

import { QUESTIONS, getQuestion, stateOptionsFor } from './questions'
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
}

export interface ReviewSection {
  section: SectionKey
  label: string
  items: ReviewItem[]
}

/** The label for one option value, falling back to the raw value. */
function optionLabel(question: Question, value: string): string {
  if (isOtherValue(value)) return otherText(value) ?? value
  const options = question.type === 'states' ? stateOptionsFor(question) : (question.options ?? [])
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
      return (value as string[]).map((v) => optionLabel(question, v)).join(' · ')

    case 'roster':
      return (value as RosterRow[])
        .map((r) => `${r.name} — ${r.email} — ${r.isAttorney ? 'Attorney' : 'Staff'}`)
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
        .map((r) => `${labels.get(r.tool) ?? r.tool} — ${AGREEMENT[r.noTraining ?? ''] ?? '—'}`)
        .join('\n')
    }

    case 'upload':
      return (value as UploadRef).originalName
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

  for (const question of visibleQuestions(answers)) {
    // See the header. This is the only place it is filtered.
    if (question.sensitive) continue

    const last = out.at(-1)
    const item: ReviewItem = {
      key: question.key,
      prompt: question.prompt,
      answer: formatAnswer(question, answers),
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
 * "not delivered", which would offer a reopen on an intake whose policy has
 * already gone out. SESSION_COLUMNS in session.ts exists to stop that; this
 * function is the other half.
 */
export type IntakeState = 'editable' | 'submitted' | 'delivered' | 'purged'

export function intakeStateOf(session: {
  status: string
  policy_delivered_at: string | null
  purged_at: string | null
} | null): IntakeState {
  if (!session) return 'editable'
  // Either signal means the answers are gone. `status` is what the purge sets;
  // `purged_at` is when. Treating both as purged means a half-finished purge
  // still reads as purged, which is the safe direction — the alternative is
  // offering to show answers that are not there.
  if (session.status === 'purged' || session.purged_at) return 'purged'
  if (session.status === 'in_progress') return 'editable'
  if (session.policy_delivered_at) return 'delivered'
  return 'submitted'
}

/** Whether the firm may still reopen and correct this intake. */
export function canReopen(state: IntakeState): boolean {
  return state === 'submitted'
}
