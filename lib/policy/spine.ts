// =============================================================================
// The spine — the 22 sections, in order.
//
// Source: .planning/POLICY-ENGINE-MAP.md §11.2, RATIFIED by Max 2026-08-31.
//
// ── The ordering principle (§11.1) ──────────────────────────────────────────
// "General duties first, then the tools, then the activities in the order a
// matter moves through a firm, then the firm's own housekeeping, then
// definitions."
//
// That is the whole rule. Ratify the principle and the sections follow from it;
// argue with a section and it is a local move, not a rewrite. Section NAMES are
// cosmetic and may change without reopening ratification; which rule lives in
// which section, and the order, may not.
//
// ── What ratification settled, and this file must not undo ──────────────────
//   • P23 + P31 are ONE section (§11), not two.
//   • The source-reporter rule is stated ONCE, in §8. §7 and §9 point at it.
//   • Discipline is last before Definitions, not buried mid-document.
//   • §6 "Platforms and Systems" is a grouping with no source heading behind
//     it — flagged as such and explicitly approved.
//   • §22 is operative terms, NOT the 16-term glossary (D7).
//
// The ACTION ITEM LIST is not a section. Per D2 it is a separate deliverable —
// see lib/policy/action-items.ts.
// =============================================================================

import { getQuestion } from '@/lib/intake/questions'
import type { Block, PolicyCondition, Section, Slot } from '@/lib/policy/types'

import { SECTION_1_BLOCKS } from '@/lib/policy/blocks/s01-preamble'
import { SECTION_2_BLOCKS } from '@/lib/policy/blocks/s02-application'
import { SECTION_3_BLOCKS } from '@/lib/policy/blocks/s03-competency'
import { SECTION_4_BLOCKS } from '@/lib/policy/blocks/s04-staff-training'
import { SECTION_5_BLOCKS } from '@/lib/policy/blocks/s05-approved-tools'
import { SECTION_6_BLOCKS } from '@/lib/policy/blocks/s06-platforms'
import { SECTION_7_BLOCKS } from '@/lib/policy/blocks/s07-legal-research'
import { SECTION_8_BLOCKS } from '@/lib/policy/blocks/s08-verification'
import { SECTION_9_BLOCKS } from '@/lib/policy/blocks/s09-drafting'
import { SECTION_10_BLOCKS } from '@/lib/policy/blocks/s10-brainstorming'
import { SECTION_11_BLOCKS } from '@/lib/policy/blocks/s11-document-review'
import { SECTION_12_BLOCKS } from '@/lib/policy/blocks/s12-notetakers'
import { SECTION_13_BLOCKS } from '@/lib/policy/blocks/s13-automations'
import { SECTION_14_BLOCKS } from '@/lib/policy/blocks/s14-client-disclosure'
import { SECTION_15_BLOCKS } from '@/lib/policy/blocks/s15-billing'
import { SECTION_16_BLOCKS } from '@/lib/policy/blocks/s16-records'
import { SECTION_17_BLOCKS } from '@/lib/policy/blocks/s17-employment'
import { SECTION_18_BLOCKS } from '@/lib/policy/blocks/s18-advertising'
import { SECTION_19_BLOCKS } from '@/lib/policy/blocks/s19-malpractice'
import { SECTION_20_BLOCKS } from '@/lib/policy/blocks/s20-vendor-incidents'
import { SECTION_21_BLOCKS } from '@/lib/policy/blocks/s21-discipline'
import { SECTION_22_BLOCKS } from '@/lib/policy/blocks/s22-definitions'

export const SPINE: readonly Section[] = [
  { number: 1, key: 'preamble', title: 'Preamble', blocks: SECTION_1_BLOCKS },
  { number: 2, key: 'application', title: 'Application', blocks: SECTION_2_BLOCKS },
  { number: 3, key: 'competency', title: 'Competency', blocks: SECTION_3_BLOCKS },
  {
    number: 4,
    key: 'staff-training',
    title: 'Staff Training and Attestation',
    blocks: SECTION_4_BLOCKS,
  },
  {
    number: 5,
    key: 'approved-tools',
    title: 'Approved Tools and Data Protection',
    blocks: SECTION_5_BLOCKS,
  },
  { number: 6, key: 'platforms', title: 'Platforms and Systems', blocks: SECTION_6_BLOCKS },
  { number: 7, key: 'legal-research', title: 'Legal Research', blocks: SECTION_7_BLOCKS },
  {
    number: 8,
    key: 'verification',
    title: 'Verification and Hallucinations',
    blocks: SECTION_8_BLOCKS,
  },
  {
    number: 9,
    key: 'drafting',
    title: 'Drafting, Translation and Filings',
    blocks: SECTION_9_BLOCKS,
  },
  { number: 10, key: 'brainstorming', title: 'Brainstorming', blocks: SECTION_10_BLOCKS },
  {
    number: 11,
    key: 'document-review',
    title: 'Document Review and Summarizing',
    blocks: SECTION_11_BLOCKS,
  },
  {
    number: 12,
    key: 'notetakers',
    title: 'Meetings and AI Notetakers',
    blocks: SECTION_12_BLOCKS,
  },
  { number: 13, key: 'automations', title: 'Automations', blocks: SECTION_13_BLOCKS },
  {
    number: 14,
    key: 'client-disclosure',
    title: 'Client Disclosure and Client Use of AI',
    blocks: SECTION_14_BLOCKS,
  },
  { number: 15, key: 'billing', title: 'Billing', blocks: SECTION_15_BLOCKS },
  { number: 16, key: 'records', title: 'Records and Retention', blocks: SECTION_16_BLOCKS },
  { number: 17, key: 'employment', title: 'Employment and Hiring', blocks: SECTION_17_BLOCKS },
  {
    number: 18,
    key: 'advertising',
    title: 'Advertising and Marketing',
    blocks: SECTION_18_BLOCKS,
  },
  { number: 19, key: 'malpractice', title: 'Malpractice Insurance', blocks: SECTION_19_BLOCKS },
  { number: 20, key: 'vendor-incidents', title: 'Vendor Incidents', blocks: SECTION_20_BLOCKS },
  {
    number: 21,
    key: 'discipline',
    title: 'Enforcement and Discipline',
    blocks: SECTION_21_BLOCKS,
  },
  { number: 22, key: 'definitions', title: 'Definitions', blocks: SECTION_22_BLOCKS },
] as const

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

/**
 * Intake keys the spine may reference that do NOT exist in questions.ts yet.
 *
 * Exactly one, and it is deliberate: `automations` is the key G-Q7 will add
 * (approved under D3, out of scope for this batch). §13 is declared with its
 * real trigger so it starts working the day that question lands; until then the
 * condition is never satisfied and the section never appears.
 *
 * 🔴 Do not grow this list to silence a failure. Every other unknown key is a
 * typo, and a typo in a condition is a clause that silently never fires — the
 * exact defect this check exists to catch.
 */
export const PENDING_QUESTION_KEYS: ReadonlySet<string> = new Set(['automations'])

/** Every intake key a condition mentions. */
function conditionKeys(condition: PolicyCondition): string[] {
  if ('hasNonAttorneyStaff' in condition) return []
  if ('all' in condition) return condition.all.flatMap(conditionKeys)
  if ('any' in condition) return condition.any.flatMap(conditionKeys)
  return [condition.key]
}

/**
 * Structural checks over the spine, run at module load by assemble.ts and
 * asserted directly by tests/policy-spine.test.ts.
 *
 * These are the failures that are otherwise invisible: a clause that never
 * fires because its key is misspelled, or a slot that stopped substituting
 * because someone reworded the text around it. Both produce a plausible-looking
 * policy with something quietly missing, which is the worst failure mode this
 * layer has.
 */
export function assertSpineInvariants(sections: readonly Section[] = SPINE): void {
  // 1. Section numbering is 1..22, in order.
  sections.forEach((section, i) => {
    if (section.number !== i + 1) {
      throw new Error(
        `Spine out of order: position ${i} carries §${section.number} "${section.title}". ` +
          `The order is ratified (POLICY-ENGINE-MAP.md §11.2) — renumbering is not a local fix.`,
      )
    }
  })

  const seenSectionKeys = new Set<string>()
  const seenBlockIds = new Set<string>()

  for (const section of sections) {
    if (seenSectionKeys.has(section.key)) {
      throw new Error(`Duplicate section key "${section.key}".`)
    }
    seenSectionKeys.add(section.key)

    for (const block of section.blocks) {
      // 2. Block ids are unique across the WHOLE spine, not just per section —
      //    they are how a review refers to one clause.
      if (seenBlockIds.has(block.id)) {
        throw new Error(`Duplicate block id "${block.id}" (§${section.number}).`)
      }
      seenBlockIds.add(block.id)

      // 3. Every key a condition names must be a real intake question.
      if (block.when) {
        for (const key of conditionKeys(block.when)) {
          if (!getQuestion(key) && !PENDING_QUESTION_KEYS.has(key)) {
            throw new Error(
              `Block "${block.id}" (§${section.number}) branches on "${key}", which is not ` +
                `a question in lib/intake/questions.ts and is not a declared pending key. ` +
                `A condition on an unknown key never fires — the clause would silently vanish.`,
            )
          }
        }
      }

      // 4. A perPlatform block's answerKey must be a real question with options.
      if (block.text.kind === 'perPlatform') {
        const question = getQuestion(block.text.answerKey)
        if (!question) {
          throw new Error(
            `Block "${block.id}" expands over "${block.text.answerKey}", which is not a question.`,
          )
        }
        if (!question.options?.length) {
          throw new Error(
            `Block "${block.id}" expands over "${block.text.answerKey}", which has no options ` +
              `to expand. Platform display names come from those option labels.`,
          )
        }
      }

      // 5. Every slot's placeholder must actually occur in the text it fills,
      //    and name a real question.
      if (block.text.kind === 'verbatim' && block.text.slots) {
        for (const slot of block.text.slots as readonly Slot[]) {
          if (!block.text.text.includes(slot.placeholder)) {
            throw new Error(
              `Block "${block.id}" declares slot "${slot.placeholder}" but its text does not ` +
                `contain that string. The clause was reworded and the slot stopped filling.`,
            )
          }
          if (!getQuestion(slot.key)) {
            throw new Error(`Block "${block.id}" slot fills from unknown question "${slot.key}".`)
          }
          // 6. dropWhenEmpty may only DELETE a span of Katy's own text, and that
          //    span must carry the placeholder with it — otherwise a truncation
          //    could leave the bracket behind, or cut a clause the slot does not
          //    own.
          if (slot.dropWhenEmpty !== undefined) {
            if (!block.text.text.includes(slot.dropWhenEmpty)) {
              throw new Error(
                `Block "${block.id}" declares dropWhenEmpty "${slot.dropWhenEmpty}", which is not ` +
                  `a substring of its text. Truncation may only remove text that is actually there.`,
              )
            }
            if (!slot.dropWhenEmpty.includes(slot.placeholder)) {
              throw new Error(
                `Block "${block.id}" declares dropWhenEmpty "${slot.dropWhenEmpty}", which does ` +
                  `not contain the placeholder "${slot.placeholder}". Dropping it would leave the ` +
                  `bracket in the delivered policy.`,
              )
            }
          }
        }
      }
    }
  }
}

/** Every block in the spine, flattened. Order preserved. */
export function allBlocks(sections: readonly Section[] = SPINE): Block[] {
  return sections.flatMap((s) => s.blocks)
}
