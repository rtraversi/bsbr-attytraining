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
// =============================================================================

import { evaluateCondition, toolGridTools } from '@/lib/intake/branching'
import { getQuestion } from '@/lib/intake/questions'
import type { Condition, ToolGridRow } from '@/lib/intake/types'
import type { ActionItem, AnswerMap } from '@/lib/policy/types'

/** The "not sure" option value, shared by all three triggers (YES_NO_NOT_SURE). */
const NOT_SURE = 'not_sure'

/**
 * ⚠️ `reason` IS NOT THE SENTENCE THE FIRM READS, on any rule.
 *
 * Katy's brackets describe what the action item should make the firm DO; they
 * are not prose. Writing that prose here would be inventing policy-adjacent
 * text, which the transcription rule forbids — and for the tool-grid rules the
 * wording is Max's, because all customer-facing copy is. `reason` is the note
 * to whoever writes it, and it renders inside a loud `[TODO…]` marker until
 * they do.
 */
interface RuleBase {
  id: string
  /** The intake question this rule reads. */
  fromKey: string
  reason: string
  /**
   * Line in AI-Policy-Research-2026-08-20.md carrying Katy's instruction.
   *
   * The tool grid's three outcomes are Katy's design too, recorded in the
   * ToolGridRow comment in lib/intake/types.ts rather than in her policy
   * document, so those rules carry `source` as well as this line.
   */
  sourceLine: number | null
}

/** One answer, one outcome: the original three. */
interface AnswerRule extends RuleBase {
  kind: 'answer'
  when: Condition
}

/**
 * One answer, one item PER GRID ROW that matches.
 *
 * `noTraining` is the row value this rule fires on, and there is deliberately
 * no rule for `'yes'`: a firm that holds the agreement has nothing to go and
 * do, which is the whole point of having asked. `null` is a row the firm never
 * filled in, and it cannot reach the assembler — isAnswered() refuses the grid
 * until every derived row has a value, so the intake will not submit.
 */
interface ToolGridRule extends RuleBase {
  kind: 'perToolGridRow'
  fromKey: 'tool_grid'
  noTraining: 'no' | 'unknown'
  /** Where the instruction lives, for a rule Katy wrote outside the source doc. */
  source: string
}

type ActionItemRule = AnswerRule | ToolGridRule

const ACTION_ITEM_RULES: readonly ActionItemRule[] = [
  // ── §5, per tool ──────────────────────────────────────────────────────────
  //
  // Katy's design, from the ToolGridRow comment in lib/intake/types.ts:
  // "`unknown` is a real answer here and not a hedge: a firm that does not know
  // gets an instruction in the policy to go and find out, which is a different
  // clause from either yes or no."
  //
  // Two rules and not three, and `no` is listed before `unknown` on purpose:
  // rules are the outer loop, so the list reads as every tool the firm KNOWS is
  // unbound, then every tool it has to go and check. That groups the homework
  // by what the firm has to do about it, which is how someone works through it.
  {
    kind: 'perToolGridRow',
    id: 'tool-no-training-agreement-missing',
    fromKey: 'tool_grid',
    noTraining: 'no',
    reason:
      'The firm answered NO for this tool: no signed agreement that the vendor will not ' +
      'train on its data. The item tells the firm to get that agreement before the tool ' +
      'touches client data. Katy\'s standard is an EXPRESS AGREEMENT (source line 356), ' +
      'not written confirmation and not a DPA — see the 2026-09-03 review of §6.',
    source: 'lib/intake/types.ts ToolGridRow',
    sourceLine: 356,
  },
  {
    kind: 'perToolGridRow',
    id: 'tool-no-training-agreement-unknown',
    fromKey: 'tool_grid',
    noTraining: 'unknown',
    reason:
      'The firm answered DO NOT KNOW for this tool. The item tells the firm to go and find ' +
      'out, and to treat the tool as having NO agreement — so client data stays out of it — ' +
      'until it has. A different instruction from either yes or no, which is why the third ' +
      'option is a real answer and not a hedge.',
    source: 'lib/intake/types.ts ToolGridRow',
    sourceLine: 356,
  },

  // ── §6 onward, per firm ───────────────────────────────────────────────────
  {
    kind: 'answer',
    id: 'case-mgmt-training-permission',
    fromKey: 'case_mgmt_ai',
    when: { key: 'case_mgmt_ai', is: NOT_SURE },
    reason:
      'Katy: research whether the case management platform permits training on firm ' +
      'data, and give instructions specific to the platform the firm named. The ' +
      'platform-specific half is what .planning/policy-blocks.csv is being filled in ' +
      'to supply.',
    sourceLine: 284,
  },
  {
    kind: 'answer',
    id: 'notetaker-stance-undecided',
    fromKey: 'notetaker_stance',
    // 🔴 THIS NEVER FIRES TODAY, and that is expected rather than broken.
    // notetaker_stance offers not_permitted / all_consent / state_law only —
    // there is no `not_sure` option, which is gap G-Q2 (approved under D3, a
    // later batch). Katy's P24 bracket routes an unsure firm here, so the
    // branch is wired now and starts working the day the option lands.
    when: { key: 'notetaker_stance', is: NOT_SURE },
    reason:
      'Katy: research the firm\'s notetaker position and redo the intake in the near ' +
      'future. Unreachable until G-Q2 adds `not_sure` to notetaker_stance.',
    sourceLine: 312,
  },
  {
    kind: 'answer',
    id: 'malpractice-carrier-notification',
    fromKey: 'carrier_notified',
    when: { key: 'carrier_notified', is: NOT_SURE },
    reason:
      'Katy: check whether the malpractice carrier requires notification of AI tools. ' +
      'G-Q5 would additionally ask about AI-specific exclusions or riders.',
    sourceLine: 334,
  },
]

/**
 * How an unwritten action item renders. Deliberately loud, and never silence —
 * the same argument as todoMarker() in lib/policy/assemble.ts.
 *
 * `TODO(copy)` rather than a bare `TODO` on the per-tool items, because that is
 * what this repo already marks a slot waiting on Max's wording with — see
 * POLICY_EMAIL_COPY_APPROVED in lib/policy/delivery-email.ts.
 */
function marker(source: string, subject: string | null, reason: string): string {
  const tag = subject === null ? 'TODO' : `TODO(copy) — ${subject}`
  return `[${tag} — ${source} — ${reason}]`
}

function answerItems(rule: AnswerRule, answers: AnswerMap): ActionItem[] {
  if (!evaluateCondition(rule.when, answers)) return []
  return [
    {
      id: rule.id,
      fromKey: rule.fromKey,
      status: 'todo',
      text: marker(`AI-Policy-Research-2026-08-20.md:${rule.sourceLine}`, null, rule.reason),
      sourceLine: rule.sourceLine,
    },
  ]
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
 *   - the LABEL is available, so `subject` reads "Microsoft Teams" and not
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
      status: 'todo' as const,
      text: marker(rule.source, tool.label, rule.reason),
      sourceLine: rule.sourceLine,
    }))
}

/**
 * Build the action item list for one set of intake answers.
 *
 * Order is the order of ACTION_ITEM_RULES above, which follows the policy
 * spine (§5, §6, §12, §19) — so the list reads in the same sequence as the
 * document it accompanies. A rule that expands emits its items in a block,
 * which is what groups the per-tool homework by what has to be done about it.
 */
export function buildActionItems(answers: AnswerMap): ActionItem[] {
  return ACTION_ITEM_RULES.flatMap((rule) =>
    rule.kind === 'answer' ? answerItems(rule, answers) : toolGridItems(rule, answers),
  )
}

/**
 * Checks that every rule above is wired to something real.
 *
 * `notetaker_stance` is expected to have NO `not_sure` option — see G-Q2 — so
 * this asserts the KEY exists without requiring the option to. If a future
 * batch adds the option, nothing here needs to change.
 */
export function assertActionItemInvariants(): void {
  const ids = new Set<string>()

  for (const rule of ACTION_ITEM_RULES) {
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
    if (rule.kind === 'perToolGridRow' && question.type !== 'tool-grid') {
      throw new Error(
        `Action item "${rule.id}" expands per grid row but "${rule.fromKey}" is a ` +
          `"${question.type}" question, not a tool-grid.`,
      )
    }

    if (ids.has(rule.id)) throw new Error(`Action item id "${rule.id}" is declared twice.`)
    ids.add(rule.id)
  }
}

/** Exposed for tests, so they assert against the real rules rather than a copy. */
export const ACTION_ITEM_IDS: readonly string[] = ACTION_ITEM_RULES.map((r) => r.id)
