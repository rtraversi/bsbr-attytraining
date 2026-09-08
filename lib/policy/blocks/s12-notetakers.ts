// §12 Meetings and AI Notetakers — POLICY-ENGINE-MAP.md §11.2
//
// Sources: P24, Part 2 AI Notetakers including the Iurix non-assurance note.
//
// ── Composed from THREE answers, 2026-09-04 (Max) ───────────────────────────
//
// Katy's P24 is an instruction, not a clause: "[INSERT THE FIRMS CHOICE ABOUT AI
// NOTETAKING, or if marked UNSURE then add to action list at end to resaerrch
// and redo the intake in the near future". So the firm's chosen option IS the
// policy sentence, and there is one block per stance.
//
// 🔴 Until this landed, ALL THREE notetaker answers reached nothing. A firm
// answered its position, where notetakers are used and which tool is approved,
// and its policy printed one disclaimer identical to every other firm's.
//
// `not_sure` produces NO block at all — an action item instead, which is the
// second half of her own instruction.

import { NOTETAKER_NOT_PERMITTED, NOTETAKER_NOT_SURE } from '@/lib/intake/questions'
import type { Block } from '@/lib/policy/types'

/** Shared by both permitted stances; only the consent rule differs. */
const TOOL_SENTENCE =
  ' The approved tool is [NOTETAKER TOOL]. No other notetaking tool may be used.'

const VENUE_SLOT = { placeholder: '[VENUES]', key: 'notetaker_scope' } as const
const TOOL_SLOT = { placeholder: '[NOTETAKER TOOL]', key: 'notetaker_tools' } as const

export const SECTION_12_BLOCKS: readonly Block[] = [
  {
    id: 'p24-notetaking-prohibited',
    // One clause, three prepared blocks — Katy's P24 is "[INSERT THE FIRMS
    // CHOICE]", so the firm's stance selects which one. Labelled the way the
    // spine already labels a split clause (see "P23 + P31 (merged)"), so the
    // provenance test's one-block-per-P# rule still means what it says.
    clause: 'P24 (prohibited)',
    when: { key: 'notetaker_stance', is: NOTETAKER_NOT_PERMITTED },
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      text: 'AI notetakers are not permitted at any firm meeting.',
      sourceLine: 312,
    },
  },
  {
    id: 'p24-notetaking-all-consent',
    clause: 'P24 (both party consent)',
    // Her own menu wording: "ONLY allowed with both party content [consent]".
    when: { key: 'notetaker_stance', is: 'all_consent' },
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      // The venue list sits after a colon on purpose. The option labels are
      // written for a checkbox and start with a capital — "Client meetings" —
      // which reads as an error mid-sentence and reads correctly after a colon.
      text:
        'AI notetakers are permitted only with the consent of both parties, and ' +
        'only at the following: [VENUES].' + TOOL_SENTENCE,
      sourceLine: 312,
      slots: [VENUE_SLOT, TOOL_SLOT],
    },
  },
  {
    id: 'p24-notetaking-state-law',
    clause: 'P24 (single party states)',
    // Her own menu wording: "Allowed only in states allowing single party".
    when: { key: 'notetaker_stance', is: 'state_law' },
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      text:
        'AI notetakers are permitted only in states allowing single party ' +
        'consent, and only at the following: [VENUES].' + TOOL_SENTENCE,
      sourceLine: 312,
      slots: [VENUE_SLOT, TOOL_SLOT],
    },
  },
  {
    id: 'ai-notetakers',
    clause: 'Part 2 — AI Notetakers',
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      // ⚠️ THE CITED LINE MOVED, 375 → 380, and deliberately.
      // Line 375 is a heading plus a menu intro (“AI Notetakers:  Subject to
      // firm preference:”) and 376-379 are the stance MENU — the firm’s choice,
      // which is P24’s material and is now composed above.
      //
      // 🔴 WHY THIS IS NO LONGER VERBATIM. Her line 380 reads "NOTE that IURIX
      // cannot assure compliance with regard to notetakers and firms must
      // determine their own liability and local regulations." That is the vendor
      // speaking inside the customer's own policy — the same defect as "We
      // cannot provide a standard policy" in §17. Her substance, the firm's duty
      // to determine its own liability, is kept and put in the firm's voice.
      //
      // The half that was dropped is a limitation on what IURIX warrants, which
      // belongs in the terms of service, not in a document the firm adopts as
      // its own. Flagged for Katy.
      text:
        'The firm is responsible for determining its own liability and ' +
        'compliance with local regulations regarding AI notetakers.',
      sourceLine: 380,
    },
  },
]

/**
 * `not_sure` deliberately produces NO §12 clause.
 *
 * Max, 2026-09-04, on the same question in §21: "if unsure i think nothing is
 * added to policy, but on action list they are flagged to solve this." A firm
 * that has not taken a position has nothing to state, and inventing a holding
 * sentence for it would put words in its policy it never chose.
 *
 * The action item is raised in lib/policy/action-items.ts.
 */
export const NOTETAKER_STANCE_WITHOUT_CLAUSE = NOTETAKER_NOT_SURE
