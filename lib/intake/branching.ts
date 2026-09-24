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

import {
  QUESTIONS,
  getQuestion,
  optionsForQuestion,
  NO_TOOLS_YET,
  NONE_VALUE,
} from './questions'
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
    case 'languages':
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
      // Answered only when EVERY selected tool has its column filled. The grid
      // is one screen, so a partially filled grid is the normal intermediate
      // state and must not read as done.
      const tools = toolGridTools(answers)
      if (tools.length === 0) return false
      if (!Array.isArray(value)) return false
      const rows = value as ToolGridRow[]
      return tools.every((t) => {
        const row = rows.find((r) => r?.tool === t.value)
        return !!row && row.noTraining !== null
      })
    }

    case 'upload':
      return isNonEmptyString((value as UploadRef)?.storagePath)
  }
}


// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

/**
 * Evaluate one condition against an answer map.
 *
 * Exported (2026-08-31) so lib/policy can branch on the SAME language the
 * intake branches on. The policy assembler reads the same answers and has to
 * agree with the intake about what they mean; a second condition evaluator is
 * a second set of edge cases around `not` and single-element arrays, and the
 * two would drift. Nothing about the intake's own behaviour changes here.
 */
export function evaluateCondition(condition: Condition, answers: AnswerMap): boolean {
  return evaluate(condition, answers)
}

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
    if (RETIRED_KEYS.has(q.key)) continue
    if (DERIVED_KEYS.has(q.key)) continue
    if (q.showIf && !evaluate(q.showIf, effective)) continue
    visible.push(q)
    const value = answers[q.key]
    if (value !== undefined) effective[q.key] = value
  }

  return visible
}

/**
 * Questions the intake no longer asks — Katy, 2026-09-02.
 *
 * She supplied a definitive intake list and said it is the entire universe of
 * questions her policy needs. These 23 were built and are not on it. They are
 * RETIRED, not deleted: the definitions stay in QUESTIONS so that answers
 * already stored against these keys still resolve on the review screen and in
 * the assembler, and so restoring one is a single line rather than a rewrite.
 *
 * 🔴 EIGHT OF THESE GATED REAL POLICY CLAUSES. Retiring the question without
 * touching the clause would have silently dropped 13 blocks from every policy.
 * Those `when:` conditions were removed in the same change, which is what
 * Katy's own instruction asks for: "MODULES D, E, F, G, J, O, Q, R, U, V:
 * leave these out because all of these will always be every policy. No
 * branching." The clauses are now unconditional. The affected keys were
 * ai_marketing, brainstorming, carrier_notified, court_ai_orders,
 * drafting_client_data, drafting_foreign_language, drafting_uses and
 * vendor_security_contact.
 */
// 🔴 `billing_models` and `ai_time_adjustment` were RESTORED on 2026-09-04 (Max)
// and are deliberately NOT in this set. Katy's §15 clause is written entirely in
// hourly language and a comment in s15-billing.ts records that it was always
// meant to branch on the billing model; without the question every firm receives
// hourly text, contingency-only practices included. They were re-added to
// QUESTIONS but left in this set, so they existed and were invisible.
const RETIRED_KEYS: ReadonlySet<string> = new Set([
  'ai_marketing',
  'ai_practice_expansion',
  'brainstorming',
  'brainstorming_tier',
  'carrier_notified',
  'cle_process',
  'court_ai_orders',
  'court_cert_template',
  'drafting_client_data',
  'drafting_foreign_language',
  'drafting_uses',
  'filing_courts',
  'foreign_language_content',
  'foreign_languages',
  'marketing_review',
  'prior_ai_error',
  'retain_prompts',
  'retention_schedule',
  'standing_order_check',
  'vendor_incident_protocol',
  // 🔴 vendor_security_contact is NOT retired, and it is not on Katy's list.
  // Her own vendor-breach clause has a slot in it — "{STAFF IDENTIFIED IN
  // INTAKE] shall be notified of the breach immediately" — and that slot is
  // filled from this answer. Retiring the question leaves the raw placeholder
  // sitting in the delivered document. Either the question stays or the clause
  // needs rewording. Katy's call, flagged 2026-09-02.
])

/**
 * Questions the intake no longer ASKS because the answer can be worked out from
 * another one. Not retired: the answer still exists, it is computed by
 * withDerivedAnswers() instead of typed.
 *
 * `firm_size` — Max, 2026-09-24. The roster, the very next question, already
 * says who is an attorney, so asking the firm to count them first was asking
 * the same thing twice. The definition stays in QUESTIONS for its option labels,
 * which is what a slot resolves the derived value against.
 */
const DERIVED_KEYS: ReadonlySet<string> = new Set(['firm_size'])

/**
 * The firm_size option a roster maps to, counting attorney rows: 0 or 1 is
 * `solo`, then `2_5`, `6_20`, `20_plus`. Null when there is no roster to count.
 *
 * 0 maps to solo rather than to nothing: a roster of staff only still has an
 * attorney somewhere (the buyer may simply not have ticked themselves), and a
 * clause keyed on size should get the smallest answer, not none.
 */
export function deriveFirmSize(answers: AnswerMap): string | null {
  const roster = answers['roster']
  if (!Array.isArray(roster)) return null
  const attorneys = (roster as RosterRow[]).filter((r) => r?.isAttorney === true).length
  if (attorneys <= 1) return 'solo'
  if (attorneys <= 5) return '2_5'
  if (attorneys <= 20) return '6_20'
  return '20_plus'
}

/**
 * The answers with every DERIVED_KEYS value filled in from what it derives
 * from. Anything that reads a derived key (the assembler, today) must read it
 * through this, so a stored answer from before the question was dropped can
 * never disagree with the roster it describes.
 *
 * Pure; returns a new map. With no roster, a stored value is left as it is.
 */
export function withDerivedAnswers(answers: AnswerMap): AnswerMap {
  const firmSize = deriveFirmSize(answers)
  if (firmSize === null) return answers
  return { ...answers, firm_size: firmSize }
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
  /**
   * The source answer value — a listed option on one of TOOL_GRID_SOURCES, or
   * an `other:`-prefixed free-text entry.
   */
  value: string
  /** What to print in the row header. */
  label: string
}

/**
 * The questions the grid's rows are derived from, and the values in each that
 * are NOT a tool.
 *
 * ── Widened beyond ai_tools on 2026-09-04 (approved by Max) ─────────────────
 *
 * It read `ai_tools` alone, so the firm was never asked whether it holds a
 * no-training agreement for its CASE MANAGEMENT platform or its INTEROFFICE
 * COMMUNICATION platform — while the policy makes claims about exactly those.
 * §6 tells a firm to make sure Clio is contractually bound not to train on
 * client data, and the intake had never asked whether it is. The claim was
 * being made about a fact nobody collected.
 *
 * ONE GRID, NOT THREE. A firm answers the same question about Clio and Slack
 * that it answers about ChatGPT, and Katy reads one table rather than three.
 *
 * ⚠️ THE SENTINELS ARE PER QUESTION AND ARE NOT INTERCHANGEABLE. `ai_tools`
 * ends its list with `none_yet`; `case_mgmt` uses the shared `none`. And
 * `comms_platforms` has NO none option at all — `email_only` is a REAL answer
 * there and not a sentinel, because a firm whose internal comms are email only
 * still has a mail provider that is either bound or not. It gets a row like
 * anything else.
 *
 * 🔴 `research_tools` IS DELIBERATELY NOT HERE. Its list carries CoCounsel,
 * Lexis+ AI and general-purpose LLMs, which do touch client data, so the same
 * argument arguably reaches it. Max scoped this change to three questions and
 * that scope is kept; flagged for him rather than assumed.
 */
const TOOL_GRID_SOURCES: readonly { key: string; sentinels: readonly string[] }[] = [
  { key: 'ai_tools', sentinels: [NO_TOOLS_YET] },
  { key: 'case_mgmt', sentinels: [NONE_VALUE] },
  { key: 'comms_platforms', sentinels: [] },
]

/** The answer keys the grid derives its rows from, in the order it derives them. */
export const TOOL_GRID_SOURCE_KEYS: readonly string[] = TOOL_GRID_SOURCES.map((s) => s.key)

/**
 * The rows the tool grid should have, derived from every source question.
 *
 * Free-text `other:` entries get a row exactly like a listed tool does. A firm
 * that types "Perplexity" needs the same column answered about it as one that
 * ticked ChatGPT, and Katy needs the same fact to draft from.
 *
 * Order is source order then the order within each answer, which is stable for
 * a given AnswerMap — the assembler's determinism rule is about the same
 * answers producing the same document, and it does.
 */
export function toolGridTools(answers: AnswerMap): ToolGridTool[] {
  const out: ToolGridTool[] = []
  const seen = new Set<string>()

  for (const source of TOOL_GRID_SOURCES) {
    const selected = answers[source.key]
    if (!Array.isArray(selected)) continue

    const question = getQuestion(source.key)
    // optionsForQuestion, not `question.options` — every source is a `multi`
    // today, where the two agree, but the extras-not-replacement trap on
    // `states` and `languages` has already been written out three times in this
    // repo and this is not the fourth.
    const labels = new Map(
      (question ? optionsForQuestion(question) : []).map((o) => [o.value, o.label]),
    )

    for (const value of selected as unknown[]) {
      if (typeof value !== 'string') continue
      // A none-sentinel is not a tool and cannot have a training agreement. The
      // grid's showIf drops the source in that case; this keeps the two from
      // disagreeing if a firm somehow holds `none` alongside a real answer (the
      // multi-select treats both sentinels as exclusive, so they should not).
      if (source.sentinels.includes(value)) continue
      // One tool, one row. A firm can type the same free text on two of the
      // source questions — "other:Notion" as a case management platform and
      // again as a comms platform — and two rows carrying the same `tool` key
      // would look independent on the screen while reconcileToolGrid wrote one
      // answer into both.
      if (seen.has(value)) continue
      seen.add(value)

      out.push({
        value,
        label: isOtherValue(value) ? (otherText(value) ?? value) : (labels.get(value) ?? value),
      })
    }
  }

  return out
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

  // Rebuilt field by field rather than spread, which is what drops the stale
  // `tier` key off a session written before 2026-08-28 — see ToolGridRow.
  return tools.map((t) => {
    const row = existing.find((r) => r?.tool === t.value)
    return row ? { tool: t.value, noTraining: row.noTraining } : { tool: t.value, noTraining: null }
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
