// =============================================================================
// The ACTION ITEM LIST — the second deliverable.
//
// Decision D2 (POLICY-ENGINE-MAP.md §7): this is a SEPARATE DELIVERABLE, not an
// appendix to the policy. Katy's own bracket says "ADD TO ACTION ITEM LIST
// APART FROM POLICY", and the reason is substantive rather than cosmetic:
//
// 🔴 A FIRM'S ADOPTED POLICY MUST NOT CONTAIN A LIST OF WHAT THE FIRM HAS NOT
//    DONE YET. The policy is the standard the firm holds itself to; the action
//    list is homework. Merging them would put "we do not know whether our case
//    management vendor trains on our data" inside the document the firm adopts
//    and may one day hand to a regulator or an insurer.
//
// So assemble() returns the two side by side and NOTHING in this file feeds
// lib/policy/spine.ts. tests/policy-assemble.test.ts asserts that separation
// directly, because it is the kind of thing a later convenience refactor would
// quietly undo.
//
// ── The sources ─────────────────────────────────────────────────────────────
// The original three are a "not sure" answer, per POLICY-ENGINE-MAP.md §11.2:
//
//   case_mgmt_ai     = 'not_sure'  → P11, source line 284
//   notetaker_stance = 'not_sure'  → P24, source line 312
//   carrier_notified = 'not_sure'  → P35, source line 334
//
// This is Katy's own pattern for uncertainty (research brief §5 rule 2):
// "`unclear` is a correct and useful answer… It routes to the action item list,
// which tells the firm to go and confirm the setting themselves."
//
// ── The fourth source, and the shape it needed — 2026-09-04 ─────────────────
//
// `tool_grid` is the first source that is not one answer with one outcome. It
// holds ONE ROW PER TOOL, each with its own yes / no / unknown, so a single
// firm can owe a "get the agreement" item for Clio and a "go and find out" item
// for Slack at the same time. `fromKey` + `when` cannot express that: the
// intake's condition language compares an ANSWER, and this answer is a list of
// rows that disagree with each other.
//
// So a rule is now one of two kinds — see ActionItemRule below. The expanding
// kind is modelled on `perPlatform` in lib/policy/types.ts, which had the same
// problem for blocks and solved it the same way, down to the `--` in the id.
//
// Until 2026-09-04 NOTHING read tool_grid[].noTraining. Three files carried a
// comment saying a branch on it was owed (s05-approved-tools.ts,
// s09-drafting.ts, s22-definitions.ts) and the only condition anywhere was
// `{ key: 'tool_grid', answered: true }` — so a firm answering "no, we hold no
// agreement" received a policy identical to one answering "yes".
//
// 🔴 THE PROHIBITION IS NOT WHAT WAS MISSING. Katy's clause at source line 356
// already bars every tool from client data without an express no-training
// agreement, unconditionally, for every firm. What was missing is the per-tool
// FOLLOW-UP: which of this firm's tools fail that rule today, and what it has
// to go and do about each one. That is homework, so it belongs on the action
// list and not in the adopted policy — D2, argued above.
// ── The contents — POLICY-BUILD-SPEC-2026-09-04.md §3, built 2026-09-24 ───────
//
// Until 2026-09-24 every item rendered as a `[TODO — …]` marker, so the action
// list a firm downloaded was a page of notes to ourselves. The rules below are
// the spec's table, and each item's TEXT is the spec's sentence.
//
// 🔴 THE WORDING IS A DRAFT, NOT APPROVED COPY. The spec says so outright:
// "Wording below is Max's to finalise; build the mechanism and use these as
// drafts." So every rule carries `draft` (who wrote it and that it is pending
// Max's pass), and the items it produces have status `draft`, which renders as
// ordinary body text rather than a Todo marker. When Max approves a sentence,
// change `draft` to an `approved` note in the same shape as a `drafted` block.
//
// Three rules fire ALWAYS (malpractice carrier, tool terms, who approves a new
// tool), so no firm gets an empty list any more. The malpractice one replaces
// the old `carrier_notified = not_sure` rule; that question is retired and is
// not deleted.
//
// ⚠️ ONE SPEC ROW IS NOT BUILT: "discipline = unsure". `discipline` is a
// longtext with no unsure option, so the trigger cannot happen. Adding an
// option or inventing a trigger is a decision, not a build step (Max, 09-24).
// =============================================================================

import { evaluateCondition, toolGridTools } from '@/lib/intake/branching'
import { getQuestion, optionsForQuestion, NONE_VALUE, NOTETAKER_NOT_SURE } from '@/lib/intake/questions'
import type { Condition, ToolGridRow } from '@/lib/intake/types'
import { joinForProse } from '@/lib/policy/prose'
import type { ActionItem, AnswerMap } from '@/lib/policy/types'

/** The "not sure" option value on case_mgmt_ai (YES_NO_NOT_SURE). */
const NOT_SURE = 'not_sure'

/** Every rule's wording is the spec's draft until Max passes it. */
const SPEC_DRAFT = 'POLICY-BUILD-SPEC-2026-09-04.md §3, draft wording pending Max'

interface RuleBase {
  id: string
  /** The sentence the firm reads. Draft wording: see `draft`. */
  text: string
  /** Where the wording came from and that it is not yet approved. Never blank. */
  draft: string
  /** Line in AI-Policy-Research-2026-08-20.md behind the item, where there is one. */
  sourceLine: number | null
}

/** One answer, one outcome. */
interface AnswerRule extends RuleBase {
  kind: 'answer'
  /** The intake question this rule reads. */
  fromKey: string
  when: Condition
  /**
   * A placeholder in `text` filled with the labels of this answer, joined as
   * prose, minus `exclude`. Used by the regimes item.
   */
  slot?: { placeholder: string; key: string; exclude?: readonly string[] }
}

/** Every firm gets this item, whatever it answered. */
interface AlwaysRule extends RuleBase {
  kind: 'always'
}

/**
 * One answer, one item PER GRID ROW that matches.
 *
 * `noTraining` is the row value this rule fires on, and there is deliberately
 * no rule for `'yes'`: a firm that holds the agreement has nothing to go and
 * do, which is the whole point of having asked. `null` is a row the firm never
 * filled in, and it cannot reach the assembler — isAnswered() refuses the grid
 * until every derived row has a value, so the intake will not submit.
 *
 * `[Tool]` in `text` is replaced with the row's LABEL.
 */
interface ToolGridRule extends RuleBase {
  kind: 'perToolGridRow'
  fromKey: 'tool_grid'
  noTraining: 'no' | 'unknown'
}

type ActionItemRule = AnswerRule | AlwaysRule | ToolGridRule

/**
 * In SPINE order, so the list reads in the same sequence as the policy it
 * accompanies: §2, §5, §6, §12, §13, §15, §19.
 */
const ACTION_ITEM_RULES: readonly ActionItemRule[] = [
  // ── §2 ────────────────────────────────────────────────────────────────────
  {
    kind: 'answer',
    id: 'regulatory-regimes-read-alongside',
    fromKey: 'regulatory_regimes',
    // Any regime except None. `not` also requires an answer, and None is
    // exclusive in the multi-select, so this is "any real regime".
    when: { key: 'regulatory_regimes', not: NONE_VALUE },
    text:
      'This policy does not replace the firm\'s obligations under [regimes] and should be ' +
      'read alongside them.',
    slot: { placeholder: '[regimes]', key: 'regulatory_regimes', exclude: [NONE_VALUE] },
    draft: SPEC_DRAFT,
    sourceLine: 268,
  },

  // ── §5, per tool ──────────────────────────────────────────────────────────
  //
  // Katy's design, from the ToolGridRow comment in lib/intake/types.ts:
  // "`unknown` is a real answer here and not a hedge". `no` is listed before
  // `unknown` on purpose: rules are the outer loop, so the list reads as every
  // tool the firm KNOWS is unbound, then every tool it has to go and check.
  // Her standard is an EXPRESS AGREEMENT (source line 356).
  {
    kind: 'perToolGridRow',
    id: 'tool-no-training-agreement-missing',
    fromKey: 'tool_grid',
    noTraining: 'no',
    text:
      '[Tool]: you answered that there is no agreement preventing training on your data. ' +
      'Do not use it with client confidential information until you have one.',
    draft: SPEC_DRAFT,
    sourceLine: 356,
  },
  {
    kind: 'perToolGridRow',
    id: 'tool-no-training-agreement-unknown',
    fromKey: 'tool_grid',
    noTraining: 'unknown',
    text:
      '[Tool]: you answered that you do not know whether an agreement is in place. Find out, ' +
      'and record what you find.',
    draft: SPEC_DRAFT,
    sourceLine: 356,
  },

  // ── §5, per firm ──────────────────────────────────────────────────────────
  {
    kind: 'answer',
    id: 'prohibited-tools-scope',
    fromKey: 'prohibited_tools',
    // A free-text question: fires when anything non-blank was typed.
    when: { key: 'prohibited_tools', answered: true },
    text:
      'Review the prohibited tools list and state, for each tool, whether the prohibition ' +
      'covers all uses or only particular tasks, for example drafting, translation, image ' +
      'generation, or client communication.',
    draft: SPEC_DRAFT,
    sourceLine: 276,
  },
  {
    // Replaces the deleted gq8 block.
    kind: 'always',
    id: 'new-tool-approval',
    text:
      'Name the person or role who must approve a new AI tool before anyone uses it, and ' +
      'what they check before saying yes.',
    draft: SPEC_DRAFT,
    sourceLine: null,
  },
  {
    // Replaces the deleted gq6 block.
    kind: 'always',
    id: 'vendor-terms-review',
    text:
      'Review each tool\'s terms of service for its security certifications and what happens ' +
      'to your data if you cancel or the vendor closes, and record what you find.',
    draft: SPEC_DRAFT,
    sourceLine: 359,
  },

  // ── §6 ────────────────────────────────────────────────────────────────────
  {
    kind: 'answer',
    id: 'case-mgmt-training-permission',
    fromKey: 'case_mgmt_ai',
    when: { key: 'case_mgmt_ai', is: NOT_SURE },
    text: 'Confirm whether your platform\'s AI features are switched on, and record it.',
    draft: SPEC_DRAFT,
    sourceLine: 284,
  },

  // ── §12 ───────────────────────────────────────────────────────────────────
  {
    kind: 'answer',
    id: 'notetaker-stance-undecided',
    fromKey: 'notetaker_stance',
    // Reachable since 2026-09-04, when Katy's "Not sure" became a real option.
    when: { key: 'notetaker_stance', is: NOTETAKER_NOT_SURE },
    text:
      'Research the consent rules for AI notetakers in the states where you hold meetings, ' +
      'decide the firm\'s position, and update your intake.',
    draft: SPEC_DRAFT,
    sourceLine: 312,
  },

  // ── §13 ───────────────────────────────────────────────────────────────────
  {
    kind: 'answer',
    id: 'automations-confidentiality-agreement',
    fromKey: 'automations_location',
    when: { key: 'automations_location', includesAny: ['third_party', 'both'] },
    text:
      'Confirm you hold a commercial agreement ensuring confidentiality with each automation ' +
      'service that touches client information. If you do not, that automation may not ' +
      'handle client matters.',
    draft: SPEC_DRAFT,
    sourceLine: null,
  },

  // ── §15 ───────────────────────────────────────────────────────────────────
  {
    kind: 'answer',
    id: 'ai-time-adjustment-process',
    fromKey: 'ai_time_adjustment',
    when: { key: 'ai_time_adjustment', is: 'no' },
    text:
      'The firm has no process for reducing a bill when AI completes a task faster. This ' +
      'needs a decision from the firm.',
    draft: SPEC_DRAFT,
    sourceLine: null,
  },

  // ── §19 ───────────────────────────────────────────────────────────────────
  {
    // Katy's line 334, an instruction the transcription dropped. Was gated on
    // carrier_notified = not_sure, a question retired on 2026-09-02, so it
    // could not fire. Now always.
    kind: 'always',
    id: 'malpractice-carrier-notification',
    text:
      'Check whether your malpractice insurance requires you to notify the carrier that the ' +
      'firm uses AI tools.',
    draft: SPEC_DRAFT,
    sourceLine: 334,
  },
]

/** Labels of an answer's values, in option order, joined as prose. */
function slotText(key: string, answers: AnswerMap, exclude: readonly string[] = []): string | null {
  const value = answers[key]
  const values = Array.isArray(value) ? (value as unknown[]) : typeof value === 'string' ? [value] : []
  const question = getQuestion(key)
  const options = question ? optionsForQuestion(question) : []
  const labels = options
    .filter((o) => values.includes(o.value) && !exclude.includes(o.value))
    .map((o) => o.label)
  return labels.length > 0 ? joinForProse(labels) : null
}

function answerItems(rule: AnswerRule, answers: AnswerMap): ActionItem[] {
  if (!evaluateCondition(rule.when, answers)) return []
  let text = rule.text
  if (rule.slot) {
    const filled = slotText(rule.slot.key, answers, rule.slot.exclude)
    // Unreachable while `when` requires a real answer; refuse to ship a bracket.
    if (filled === null) return []
    text = text.replace(rule.slot.placeholder, filled)
  }
  return [{ id: rule.id, fromKey: rule.fromKey, status: 'draft', text, sourceLine: rule.sourceLine }]
}

function alwaysItems(rule: AlwaysRule): ActionItem[] {
  return [{ id: rule.id, fromKey: null, status: 'draft', text: rule.text, sourceLine: rule.sourceLine }]
}

/**
 * One item per grid row whose answer matches the rule.
 *
 * 🔴 ITERATED OVER THE DERIVED TOOLS, NOT OVER THE STORED ROWS, and that is the
 * same argument reconcileToolGrid() makes in lib/intake/branching.ts. The
 * derived list is what the grid was built from, so:
 *
 *   - a stale row for a tool the firm has since unticked cannot raise homework
 *     about a tool the firm does not have;
 *   - the output order is the source questions' order rather than the order a
 *     firm happened to click checkboxes in;
 *   - the LABEL is available, so `[Tool]` reads "Microsoft Teams" and not
 *     `teams` — and for a free-text entry, the words the firm typed.
 *
 * The id carries the tool's stored value, `${rule.id}--${tool.value}`, exactly
 * as a perPlatform block does. Two items from one rule must not share an id:
 * tests match on them, and D2's separation check compares them against block
 * ids.
 */
function toolGridItems(rule: ToolGridRule, answers: AnswerMap): ActionItem[] {
  const stored = answers[rule.fromKey]
  if (!Array.isArray(stored)) return []

  const answered = new Map(
    (stored as ToolGridRow[])
      .filter((row) => row && typeof row.tool === 'string')
      .map((row) => [row.tool, row.noTraining]),
  )

  return toolGridTools(answers)
    .filter((tool) => answered.get(tool.value) === rule.noTraining)
    .map((tool) => ({
      id: `${rule.id}--${tool.value}`,
      fromKey: rule.fromKey,
      subject: tool.label,
      status: 'draft' as const,
      text: rule.text.replace('[Tool]', tool.label),
      sourceLine: rule.sourceLine,
    }))
}

/**
 * Build the action item list for one set of intake answers.
 *
 * Order is the order of ACTION_ITEM_RULES above, which follows the policy
 * spine — so the list reads in the same sequence as the document it
 * accompanies. A rule that expands emits its items in a block, which is what
 * groups the per-tool homework by what has to be done about it.
 */
export function buildActionItems(answers: AnswerMap): ActionItem[] {
  return ACTION_ITEM_RULES.flatMap((rule) => {
    if (rule.kind === 'always') return alwaysItems(rule)
    if (rule.kind === 'answer') return answerItems(rule, answers)
    return toolGridItems(rule, answers)
  })
}

/** Checks that every rule above is wired to something real. */
export function assertActionItemInvariants(): void {
  const ids = new Set<string>()

  for (const rule of ACTION_ITEM_RULES) {
    if (ids.has(rule.id)) throw new Error(`Action item id "${rule.id}" is declared twice.`)
    ids.add(rule.id)

    if (!rule.text.trim() || !rule.draft.trim()) {
      throw new Error(`Action item "${rule.id}" has no text, or no note of where its wording came from.`)
    }
    // The whole point of 2026-09-24: no marker ever reaches the firm again.
    if (rule.text.includes('[TODO')) {
      throw new Error(`Action item "${rule.id}" carries a TODO marker.`)
    }

    if (rule.kind === 'always') continue

    const question = getQuestion(rule.fromKey)
    if (!question) {
      throw new Error(
        `Action item "${rule.id}" is triggered by "${rule.fromKey}", which is not a question ` +
          `in lib/intake/questions.ts.`,
      )
    }

    // An expanding rule reads ToolGridRow[]. Pointed at anything else it would
    // silently emit nothing, which is the failure mode this whole batch exists
    // to close — a per-tool outcome that quietly never fires.
    if (rule.kind === 'perToolGridRow') {
      if (question.type !== 'tool-grid') {
        throw new Error(
          `Action item "${rule.id}" expands per grid row but "${rule.fromKey}" is a ` +
            `"${question.type}" question, not a tool-grid.`,
        )
      }
      if (!rule.text.includes('[Tool]')) {
        throw new Error(`Action item "${rule.id}" expands per tool but never names the tool.`)
      }
    }

    if (rule.kind === 'answer' && rule.slot && !rule.text.includes(rule.slot.placeholder)) {
      throw new Error(`Action item "${rule.id}" declares slot ${rule.slot.placeholder} it never uses.`)
    }
  }
}

/** Exposed for tests, so they assert against the real rules rather than a copy. */
export const ACTION_ITEM_IDS: readonly string[] = ACTION_ITEM_RULES.map((r) => r.id)

/** The items every firm gets, whatever it answered. Exposed for tests. */
export const ALWAYS_ACTION_ITEM_IDS: readonly string[] = ACTION_ITEM_RULES.filter(
  (r) => r.kind === 'always',
).map((r) => r.id)
