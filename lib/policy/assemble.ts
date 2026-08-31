// =============================================================================
// assemble() — intake answers in, two deliverables out.
//
// 🔴 THE LOAD-BEARING PROPERTY: THIS IS A PURE FUNCTION AND IT IS DETERMINISTIC.
//
// No model, no inference, no generated prose, and intake answers are NEVER sent
// anywhere. Katy's rule, restated at the head of POLICY-ENGINE-MAP.md, and it
// has not moved. Everything below is a lookup, a branch, or a string
// substitution. There is no generation step to add later, and the same answers
// must always produce byte-identical output — two firms with the same answers
// get the same document.
//
// That is also why option ORDER is normalised everywhere rather than taken from
// the order a firm happened to click checkboxes in.
//
// ── Two outputs (D2) ────────────────────────────────────────────────────────
// `policy` and `actionItems` come back side by side and are never merged. See
// the header of lib/policy/action-items.ts for why that separation is
// substantive rather than tidiness.
// =============================================================================

import { evaluateCondition } from '@/lib/intake/branching'
import { getQuestion, stateOptionsFor } from '@/lib/intake/questions'
import { isOtherValue, otherText, type RosterRow } from '@/lib/intake/types'
import { assertActionItemInvariants, buildActionItems } from '@/lib/policy/action-items'
import { platformBlocks } from '@/lib/policy/platform-block'
import { assertSpineInvariants, SPINE } from '@/lib/policy/spine'
import type {
  AnswerMap,
  AssembleResult,
  AssembledBlock,
  AssembledSection,
  Block,
  PolicyCondition,
  Section,
  Slot,
} from '@/lib/policy/types'

// The spine is checked once, at module load, rather than per call. A malformed
// spine is a programming error that should fail loudly the first time anything
// imports this — not silently emit a policy with a clause missing.
assertSpineInvariants()
assertActionItemInvariants()

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

/** Does the roster carry at least one non-attorney? See §4 and PolicyCondition. */
function hasNonAttorneyStaff(answers: AnswerMap): boolean {
  const roster = answers['roster']
  if (!Array.isArray(roster)) return false
  return (roster as RosterRow[]).some((row) => row && row.isAttorney === false)
}

function holds(condition: PolicyCondition, answers: AnswerMap): boolean {
  if ('hasNonAttorneyStaff' in condition) return hasNonAttorneyStaff(answers)
  // Everything else is the intake's own condition language, evaluated by the
  // intake's own evaluator so the two layers cannot disagree about `not`.
  return evaluateCondition(condition, answers)
}

// ---------------------------------------------------------------------------
// Slot filling
// ---------------------------------------------------------------------------

/**
 * Render one answer as the text that goes into a slot.
 *
 * Where the question has options, the OPTION LABEL is used rather than the
 * stored value — a policy should read "North Carolina", not "NC" — and the
 * values are emitted in the question's own option order so the output does not
 * depend on click order. Free-text `other:` entries render as what the firm
 * typed and sort after the listed options.
 *
 * Returns null when there is no answer, which leaves the placeholder in place
 * rather than substituting an empty string: a policy reading "state(s) of" and
 * then nothing is worse than one that still visibly carries its bracket.
 */
function renderAnswer(
  key: string,
  answers: AnswerMap,
  exclude: readonly string[] = [],
): string | null {
  const value = answers[key]
  if (value === undefined) return null

  const question = getQuestion(key)
  // ⚠️ A `states` question's `options` holds only the EXTRA entries appended to
  // US_STATES — for `jurisdictions` that is just "Federal courts". Reading it
  // directly would render every actual state as its bare code and sort it after
  // the extras. stateOptionsFor() is the full list, and questions.ts is
  // explicit that the field is extras-not-replacement.
  const options = question
    ? question.type === 'states'
      ? stateOptionsFor(question)
      : (question.options ?? [])
    : []
  const labelFor = (v: string): string => {
    if (isOtherValue(v)) return otherText(v)?.trim() ?? v
    return options.find((o) => o.value === v)?.label ?? v
  }

  if (Array.isArray(value)) {
    const values = value as unknown[]
    if (values.length === 0) return null
    // Only string arrays are slot-fillable. roster and tool_grid are structured
    // and are read by dedicated code (hasNonAttorneyStaff), never by a slot.
    if (!values.every((v) => typeof v === 'string')) return null

    const order = options.map((o) => o.value)
    const rank = (v: string): number => {
      const i = order.indexOf(v)
      return i === -1 ? order.length : i
    }
    const sorted = [...(values as string[])]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .filter((v) => !exclude.includes(v))
      .sort((a, b) => rank(a) - rank(b))
    // Everything the firm picked was excluded — treat it as no answer, which
    // leaves the placeholder visible rather than trailing the sentence off into
    // nothing. See the federal-only note on P2 in blocks/s02-application.ts.
    if (sorted.length === 0) return null
    return sorted.map(labelFor).join(', ')
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || exclude.includes(trimmed)) return null
    return labelFor(trimmed)
  }

  return null
}

function fillSlots(text: string, slots: readonly Slot[] | undefined, answers: AnswerMap): string {
  if (!slots?.length) return text
  return slots.reduce((acc, slot) => {
    const filled = renderAnswer(slot.key, answers, slot.exclude)
    return filled === null ? acc : acc.split(slot.placeholder).join(filled)
  }, text)
}

// ---------------------------------------------------------------------------
// TODO markers
// ---------------------------------------------------------------------------

/**
 * How an untranscribed block renders.
 *
 * Deliberately loud, and never silence. A section that quietly dropped its
 * unwritten clauses would look finished, and this skeleton is going to be read
 * by people deciding what is left to do.
 */
function todoMarker(reason: string, sourceLine: number | null): string {
  const where =
    sourceLine === null
      ? 'no source line — Katy wrote no text for this'
      : `AI-Policy-Research-2026-08-20.md:${sourceLine}`
  return `[TODO — ${where} — ${reason}]`
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/** Expand one declared block into the blocks it contributes. May be none. */
function assembleBlock(block: Block, answers: AnswerMap): AssembledBlock[] {
  if (block.when && !holds(block.when, answers)) return []

  switch (block.text.kind) {
    case 'verbatim':
      return [
        {
          id: block.id,
          clause: block.clause,
          text: fillSlots(block.text.text, block.text.slots, answers),
          status: 'verbatim',
          sourceLine: block.text.sourceLine,
        },
      ]

    case 'todo':
      return [
        {
          id: block.id,
          clause: block.clause,
          text: todoMarker(block.text.reason, block.text.sourceLine),
          status: 'todo',
          sourceLine: block.text.sourceLine,
        },
      ]

    case 'perPlatform': {
      // G-A1 / G-A2 / G-A3. Every selected vendor gets the named generic block
      // until its row in .planning/policy-blocks.csv is researched and wired —
      // which is what makes an unresearched vendor harmless rather than an
      // empty section.
      const selected = answers[block.text.answerKey]
      if (!Array.isArray(selected)) return []
      const values = (selected as unknown[]).filter((v): v is string => typeof v === 'string')

      return platformBlocks(block.text.answerKey, values).map((platform) => ({
        id: `${block.id}--${platform.value}`,
        clause: block.clause,
        text: platform.text,
        status: 'verbatim' as const,
        sourceLine: (block.text as { sourceLine: number }).sourceLine,
      }))
    }
  }
}

function assembleSection(section: Section, answers: AnswerMap): AssembledSection | null {
  const blocks = section.blocks.flatMap((block) => assembleBlock(block, answers))
  // A section with no surviving blocks is omitted entirely — a firm that does
  // no document review gets no §11, not a §11 heading over nothing.
  if (blocks.length === 0) return null
  return { number: section.number, key: section.key, title: section.title, blocks }
}

// ---------------------------------------------------------------------------
// The entry point
// ---------------------------------------------------------------------------

/**
 * Assemble a firm's AI policy and its action item list from intake answers.
 *
 * Pure: no I/O, no clock, no randomness, no network. Given the same answers it
 * returns the same result, and nothing it touches is sent anywhere.
 *
 * Section numbers are the SPINE's, so they stay stable when a section is
 * omitted — a policy can run §1, §2, §3, §5. Renumbering them to be contiguous
 * would make two firms' documents cite different numbers for the same rule.
 */
export function assemble(answers: AnswerMap, spine: readonly Section[] = SPINE): AssembleResult {
  const sections = spine
    .map((section) => assembleSection(section, answers))
    .filter((s): s is AssembledSection => s !== null)

  return {
    policy: { sections },
    // Built independently and never folded into `policy` — D2.
    actionItems: buildActionItems(answers),
  }
}
