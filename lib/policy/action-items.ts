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
// ── The three sources ───────────────────────────────────────────────────────
// All three are a "not sure" answer, per POLICY-ENGINE-MAP.md §11.2:
//
//   case_mgmt_ai     = 'not_sure'  → P11, source line 284
//   notetaker_stance = 'not_sure'  → P24, source line 312
//   carrier_notified = 'not_sure'  → P35, source line 334
//
// This is Katy's own pattern for uncertainty (research brief §5 rule 2):
// "`unclear` is a correct and useful answer… It routes to the action item list,
// which tells the firm to go and confirm the setting themselves."
// =============================================================================

import { evaluateCondition } from '@/lib/intake/branching'
import { getQuestion } from '@/lib/intake/questions'
import type { Condition } from '@/lib/intake/types'
import type { ActionItem, AnswerMap } from '@/lib/policy/types'

/** The "not sure" option value, shared by all three triggers (YES_NO_NOT_SURE). */
const NOT_SURE = 'not_sure'

interface ActionItemRule {
  id: string
  fromKey: string
  when: Condition
  /**
   * ⚠️ TODO, for all three, and deliberately.
   *
   * Katy's brackets describe what the action item should make the firm DO; they
   * are not the sentence the firm reads. Writing that sentence here would be
   * inventing policy-adjacent text, which the transcription rule forbids. The
   * line number is carried so whoever writes it can see exactly what she asked
   * for.
   */
  reason: string
  sourceLine: number
}

const ACTION_ITEM_RULES: readonly ActionItemRule[] = [
  {
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
 * Build the action item list for one set of intake answers.
 *
 * Order is the order of ACTION_ITEM_RULES above, which follows the policy
 * spine (§6, §12, §19) — so the list reads in the same sequence as the document
 * it accompanies.
 */
export function buildActionItems(answers: AnswerMap): ActionItem[] {
  return ACTION_ITEM_RULES.filter((rule) => evaluateCondition(rule.when, answers)).map((rule) => ({
    id: rule.id,
    fromKey: rule.fromKey,
    status: 'todo' as const,
    text: `[TODO — AI-Policy-Research-2026-08-20.md:${rule.sourceLine} — ${rule.reason}]`,
    sourceLine: rule.sourceLine,
  }))
}

/**
 * Checks that every rule above is wired to something real.
 *
 * `notetaker_stance` is expected to have NO `not_sure` option — see G-Q2 — so
 * this asserts the KEY exists without requiring the option to. If a future
 * batch adds the option, nothing here needs to change.
 */
export function assertActionItemInvariants(): void {
  for (const rule of ACTION_ITEM_RULES) {
    if (!getQuestion(rule.fromKey)) {
      throw new Error(
        `Action item "${rule.id}" is triggered by "${rule.fromKey}", which is not a question ` +
          `in lib/intake/questions.ts.`,
      )
    }
  }
}

/** Exposed for tests, so they assert against the real rules rather than a copy. */
export const ACTION_ITEM_IDS: readonly string[] = ACTION_ITEM_RULES.map((r) => r.id)
