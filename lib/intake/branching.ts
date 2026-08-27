// =============================================================================
// Policy intake — the branching engine.
//
// Katy, 2026-08-25: "that is the whole point of the questions going one by one
// so that it checks for which is next based on conditional tree." This file is
// that check. It is pure: no database, no React, no I/O. Everything it knows it
// learns from QUESTIONS and one AnswerMap.
//
// ── The forward pass ────────────────────────────────────────────────────────
//
// Visibility is computed in ONE pass over the ordered question set, carrying an
// "effective" answer map that contains only the answers of questions already
// found visible. That does two things at once:
//
//   - It resolves transitively for free. If A hides B, B's own answer stops
//     counting, so anything B governed collapses in the same pass. No fixpoint
//     loop, no recursion, no risk of a cycle.
//   - It makes a stale answer to a hidden question inert immediately, before
//     pruneOrphans has had a chance to run. Visibility never depends on whether
//     someone remembered to prune.
//
// It is only well defined because a showIf may reference nothing but an EARLIER
// question, which assertQuestionSetInvariants() enforces at module load.
//
// ── Why "required" is always qualified by "visible" ─────────────────────────
//
// Every completeness answer in here counts VISIBLE required questions only. A
// required question the firm can never see must never be able to block their
// submission — that failure mode is a firm stuck on a screen with no way
// forward and no explanation, which is a support call and a refund.
// =============================================================================

import { QUESTIONS, getQuestion, NO_TOOLS_YET } from './questions'
import {
  SECTION_ORDER,
  SECTION_LABELS,
  isOtherValue,
  otherText,
  type AnswerMap,
  type AnswerValue,
  type Condition,
  type Question,
  type RosterRow,
  type SectionKey,
  type ToolGridRow,
  type UploadRef,
} from './types'


// ---------------------------------------------------------------------------
// Answered
// ---------------------------------------------------------------------------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * Whether this question has a usable answer.
 *
 * "Usable" and not "present": an empty array, a blank string and a half-filled
 * tool grid are all shapes the UI can produce, and every one of them would
 * reach Katy as a question the firm never actually answered.
 */
export function isAnswered(question: Question, answers: AnswerMap): boolean {
  const value = answers[question.key]
  if (value === undefined || value === null) return false

  switch (question.type) {
    case 'text':
    case 'longtext':
    case 'yesno':
    case 'single':
      return isNonEmptyString(value)

    case 'multi':
    case 'states':
      return Array.isArray(value) && value.length > 0

    case 'roster':
      // Min 1, and every row needs both a name and an email. A blank row is
      // what an admin leaves behind when they tab through the table, and it
      // would promote into firm_members as a member with no identity.
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        (value as RosterRow[]).every(
          (r) => isNonEmptyString(r?.name) && isNonEmptyString(r?.email),
        )
      )

    case 'tool-grid': {
      // Answered only when EVERY selected tool has both columns filled. The
      // grid is one screen, so a partially filled grid is the normal
      // intermediate state and must not read as done.
      const tools = toolGridTools(answers)
      if (tools.length === 0) return false
      if (!Array.isArray(value)) return false
      const rows = value as ToolGridRow[]
      return tools.every((t) => {
        const row = rows.find((r) => r?.tool === t.value)
        return !!row && row.tier !== null && row.noTraining !== null
      })
    }

    case 'upload':
      return isNonEmptyString((value as UploadRef)?.storagePath)
  }
}


// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

function evaluate(condition: Condition, answers: AnswerMap): boolean {
  if ('all' in condition) return condition.all.every((c) => evaluate(c, answers))
  if ('any' in condition) return condition.any.some((c) => evaluate(c, answers))

  const value = answers[condition.key]

  if ('answered' in condition) {
    const q = getQuestion(condition.key)
    return q ? isAnswered(q, answers) : false
  }

  if ('includesAny' in condition) {
    if (Array.isArray(value)) {
      return (value as string[]).some((v) => condition.includesAny.includes(v))
    }
    // A scalar answer is treated as a one-element list, so a question can be
    // retyped from single to multi without rewriting every branch that reads it.
    return typeof value === 'string' && condition.includesAny.includes(value)
  }

  if ('is' in condition) {
    if (Array.isArray(value)) {
      return value.length === 1 && value[0] === condition.is
    }
    return value === condition.is
  }

  // { key, not }
  //
  // The "is answered" half is load-bearing and not defensive: without it an
  // UNANSWERED question satisfies every `not` vacuously, and case_mgmt_ai would
  // appear before the firm has said which platform they use — asking whether
  // the AI features of nothing are switched on.
  const q = getQuestion(condition.key)
  if (!q || !isAnswered(q, answers)) return false
  if (Array.isArray(value)) return !(value as string[]).includes(condition.not)
  return value !== condition.not
}


// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/**
 * The questions the firm can currently see, in order.
 *
 * One forward pass; see the header for why that is sufficient.
 */
export function visibleQuestions(answers: AnswerMap): Question[] {
  const visible: Question[] = []
  // Only the answers of questions already found visible are allowed to
  // influence anything downstream.
  const effective: AnswerMap = {}

  for (const q of QUESTIONS) {
    if (q.showIf && !evaluate(q.showIf, effective)) continue
    visible.push(q)
    const value = answers[q.key]
    if (value !== undefined) effective[q.key] = value
  }

  return visible
}

/** Whether one question is currently visible. */
export function isVisible(question: Question, answers: AnswerMap): boolean {
  return visibleQuestions(answers).some((q) => q.key === question.key)
}


// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

/**
 * The first visible question with no answer, or null when every visible
 * question has one.
 *
 * This is a FALLBACK resume point, not the authoritative one — that is
 * intake_sessions.current_question, written as the firm advances. The
 * difference shows up on an optional question: a firm that skipped
 * prohibited_tools and carried on has an unanswered question behind them, and
 * this function would send them back to it. current_question would not.
 */
export function nextUnanswered(answers: AnswerMap): Question | null {
  return visibleQuestions(answers).find((q) => !isAnswered(q, answers)) ?? null
}

/** Every visible required question has an answer. */
export function isComplete(answers: AnswerMap): boolean {
  return visibleQuestions(answers)
    .filter((q) => q.required)
    .every((q) => isAnswered(q, answers))
}

/** Visible required questions still missing an answer, in order. */
export function missingRequired(answers: AnswerMap): Question[] {
  return visibleQuestions(answers).filter((q) => q.required && !isAnswered(q, answers))
}


// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface SectionProgress {
  section: SectionKey
  label: string
  /** Visible REQUIRED questions in this section. */
  total: number
  /** How many of those are answered. */
  answered: number
  complete: boolean
}

/**
 * Progress per section — never "question 12 of 26".
 *
 * Katy asked for it this way (2026-08-25 09:29 is the same conversation that
 * settled one-question-at-a-time): a long counter makes a long form FEEL long,
 * and a firm that has just paid should not be looking at 26.
 *
 * Optional questions are excluded from both numerator and denominator on
 * purpose. Counting them means a firm that legitimately skipped
 * prohibited_tools stares at a section that says 3/4 forever and cannot tell
 * whether they missed something that matters.
 */
export function progressBySection(answers: AnswerMap): SectionProgress[] {
  const visible = visibleQuestions(answers)
  const out: SectionProgress[] = []

  for (const section of SECTION_ORDER) {
    const inSection = visible.filter((q) => q.section === section)
    // A section with nothing visible in it does not get a tab. Cannot happen in
    // the current set — every section has at least one unconditional question —
    // but a set where it could must not render an empty tab.
    if (inSection.length === 0) continue

    const required = inSection.filter((q) => q.required)
    const answered = required.filter((q) => isAnswered(q, answers)).length

    out.push({
      section,
      label: SECTION_LABELS[section],
      total: required.length,
      answered,
      complete: answered === required.length,
    })
  }

  return out
}


// ---------------------------------------------------------------------------
// The tool grid
// ---------------------------------------------------------------------------

export interface ToolGridTool {
  /** The ai_tools answer value — a listed option, or `other:`-prefixed free text. */
  value: string
  /** What to print in the row header. */
  label: string
}

/**
 * The rows the tool grid should have, derived from the ai_tools answer.
 *
 * Free-text `other:` entries get a row exactly like a listed tool does. A firm
 * that types "Perplexity" needs the same two columns answered about it as one
 * that ticked ChatGPT, and Katy needs the same two facts to draft from.
 */
export function toolGridTools(answers: AnswerMap): ToolGridTool[] {
  const selected = answers['ai_tools']
  if (!Array.isArray(selected)) return []

  const options = getQuestion('ai_tools')?.options ?? []
  const labels = new Map(options.map((o) => [o.value, o.label]))

  return (selected as string[])
    // "None yet" is not a tool and cannot have a tier or a training agreement.
    // The grid's showIf hides the whole question in that case; this keeps the
    // two from disagreeing if a firm somehow holds none_yet alongside a real
    // tool (the multi-select treats it as exclusive, so they should not).
    .filter((value) => value !== NO_TOOLS_YET)
    .map((value) => ({
    value,
    label: isOtherValue(value) ? (otherText(value) ?? value) : (labels.get(value) ?? value),
  }))
}

/**
 * The tool grid, aligned to the tools currently selected: existing rows kept,
 * rows for deselected tools dropped, new tools added blank and in order.
 *
 * The dropping half is the same argument as pruneOrphans. A firm that ticks
 * Otter.ai, fills in its row, then unticks it has retracted the tool; a
 * surviving row would put a notetaker in the drafted policy.
 */
export function reconcileToolGrid(answers: AnswerMap): ToolGridRow[] {
  const tools = toolGridTools(answers)
  const existing = Array.isArray(answers['tool_grid']) ? (answers['tool_grid'] as ToolGridRow[]) : []

  return tools.map((t) => {
    const row = existing.find((r) => r?.tool === t.value)
    return row ? { tool: t.value, tier: row.tier, noTraining: row.noTraining } : { tool: t.value, tier: null, noTraining: null }
  })
}


// ---------------------------------------------------------------------------
// Orphans
// ---------------------------------------------------------------------------

/**
 * Answer keys that should no longer exist: questions that are no longer
 * visible, and keys belonging to no question at all.
 *
 * The second case is not hypothetical. The question set is versioned in the
 * repo precisely so it can change without a migration (see migration 0028), so
 * a session started before a question was renamed carries a key nothing reads.
 */
export function orphanKeys(answers: AnswerMap): string[] {
  const visible = new Set(visibleQuestions(answers).map((q) => q.key))
  return Object.keys(answers).filter((key) => !visible.has(key))
}

/**
 * Drop every answer whose question is no longer visible, and trim the tool grid
 * to the tools still selected.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * Someone answers notetaker_scope, then goes back and changes notetaker_stance
 * to "not permitted at all". Without pruning, the scope answer rides into
 * Katy's export and she drafts a notetaker clause for a firm that has just told
 * her it bans them. The firm reads a policy permitting something they retracted,
 * and neither of them can see where it came from.
 *
 * It is a pure function returning a new map — it does not delete rows. The
 * caller decides when to persist, which matters because deleting an answer the
 * firm may re-reveal in the next click would make going back and forth
 * destructive. Persist on submit, or on an explicit step back; not on keystroke.
 */
export function pruneOrphans(answers: AnswerMap): AnswerMap {
  const visible = new Set(visibleQuestions(answers).map((q) => q.key))
  const pruned: AnswerMap = {}

  for (const [key, value] of Object.entries(answers)) {
    if (!visible.has(key)) continue
    pruned[key] = value
  }

  if (visible.has('tool_grid') && pruned['tool_grid'] !== undefined) {
    pruned['tool_grid'] = reconcileToolGrid(pruned) as AnswerValue
  }

  return pruned
}


// ---------------------------------------------------------------------------
// The roster against the seats bought
// ---------------------------------------------------------------------------

/**
 * How many people on the roster take the training: the NON-attorney rows.
 *
 * Katy, 2026-08-25: attorneys never consume a seat and use the training for
 * free; non-attorney staff consume seats. Katy, 2026-08-25 12:27: training is
 * non-attorneys only, but the attestation is everyone.
 *
 * ⚠️ This computes the seat count the intake DISPLAYS. It does not change what
 * a seat costs and it does not touch lib/seats.ts or the sync_used_seats trigger
 * from 0015 — access and billing still derive from one predicate on purpose, and
 * splitting them is its own batch.
 */
export function rosterTrainingSeats(rows: RosterRow[]): number {
  return rows.filter((r) => !r.isAttorney).length
}

/**
 * How many training seats the roster needs beyond what the firm bought. 0 when
 * it fits, and 0 when the seat count is UNKNOWN (`null`).
 *
 * ── 🔴 THIS IS NOW A CAP, NOT A FLAG (Max, 2026-08-26) ──────────────────────
 *
 * It began as flag-never-block: a firm over its seat count could finish the
 * intake anyway and somebody would sort it out afterwards. Reversed, because
 * nobody owned "afterwards" — there was no process, no queue and no person
 * behind that promise, so it was a sentence in a banner and nothing else.
 *
 * A firm cannot roster more NON-ATTORNEY staff than it has seats for. Attorneys
 * are unlimited and never consume a seat, so a large firm of partners costs
 * nothing extra.
 *
 * KNOWN AND ACCEPTED: a capped firm cannot reach full accreditation until it
 * buys the extra seat. That is intended — the alternative was an unbounded
 * roster that could never be trained and a certificate count that could never
 * reach 100%, which is the same dead end with a friendlier banner.
 *
 * 🔴 `null` is UNKNOWN, `0` is a KNOWN cap of zero. Until 2026-08-27 both arrived
 * here as 0 and both switched the cap off, so a seats row that had not landed —
 * or a read that simply failed — let a firm roster unlimited staff and submit.
 * A permissive answer to "not known" is right in the client and wrong on the
 * server, so the two now differ on purpose: this returns 0 for `null` and
 * POST /api/intake/submit refuses outright rather than calling this at all.
 */
export function rosterOverSeats(rows: RosterRow[], seatsPurchased: number | null): number {
  if (seatsPurchased === null) return 0
  return Math.max(0, rosterTrainingSeats(rows) - seatsPurchased)
}

/**
 * Whether one more non-attorney can be added.
 *
 * `null` — the seats row has not landed, or the read failed — is treated as no
 * cap rather than a cap of zero. Refusing every row because a read came back
 * empty would be the worst possible failure of this rule ON THIS SCREEN: nobody
 * should get a dead form because a query was slow.
 *
 * A seat count of `0` is a real answer and DOES cap: a firm the seats table says
 * bought nothing cannot roster staff who need training.
 */
export function canAddTrainingSeat(rows: RosterRow[], seatsPurchased: number | null): boolean {
  if (seatsPurchased === null) return true
  return rosterTrainingSeats(rows) < seatsPurchased
}


// ---------------------------------------------------------------------------
// Destination
// ---------------------------------------------------------------------------

/**
 * Split answers by the table they are written to (migration 0028).
 *
 * intake_sensitive has RLS on and NO POLICY, so only a service-role route can
 * read it. The split is here rather than in the write route so that one place
 * decides it and the tests can reach it.
 */
export function splitBySensitivity(answers: AnswerMap): {
  ordinary: AnswerMap
  sensitive: AnswerMap
} {
  const ordinary: AnswerMap = {}
  const sensitive: AnswerMap = {}

  for (const [key, value] of Object.entries(answers)) {
    if (getQuestion(key)?.sensitive) sensitive[key] = value
    else ordinary[key] = value
  }

  return { ordinary, sensitive }
}
