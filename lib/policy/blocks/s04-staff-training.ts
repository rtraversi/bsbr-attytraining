// §4 Staff Training and Attestation — POLICY-ENGINE-MAP.md §11.2
//
// P4 + Part 2's STAFF COMPETENCY + G-Q9.
//
// ── The scaling rule ────────────────────────────────────────────────────────
// Both transcribed blocks are about NON-ATTORNEY STAFF, and Katy ruled on
// 2026-08-25 that a solo with no staff needs no non-attorney training. So both
// gate on the roster carrying at least one non-attorney, rather than being
// unconditional. A one-person firm gets no §4 at all.
//
// That is the `hasNonAttorneyStaff` predicate, and the only condition in the
// spine that is not a plain intake Condition — see PolicyCondition in types.ts
// for why it is named rather than general.

import type { Block } from '@/lib/policy/types'

export const SECTION_4_BLOCKS: readonly Block[] = [
  {
    id: 'p4-iurix-training',
    clause: 'P4',
    when: { hasNonAttorneyStaff: true },
    text: {
      kind: 'verbatim',
      text:
        'All non-attorney staff shall complete Iurix training and receive Iurix ' +
        'certification, and sign personal attestations to comply, and firm will ' +
        'maintain all elements required for Iurix AI Accreditation.  Accreditation ' +
        'shall be renewed at least once each year (updated training and attestations).',
      sourceLine: 270,
    },
  },
  {
    id: 'staff-competency',
    clause: 'Part 2 — STAFF COMPETENCY',
    when: { hasNonAttorneyStaff: true },
    text: {
      kind: 'verbatim',
      // "risks or AI" is the source's typo for "risks of AI". Left alone.
      text:
        'STAFF COMPETENCY:  Staff will be trained in the potential risks or AI and ' +
        'will sign an attestation that they understand the risks and agree to abide ' +
        'by the policy.',
      sourceLine: 352,
    },
  },
  {
    id: 'gq9-training-owner',
    clause: 'G-Q9',
    // Carries P4's condition, not its own: this is P4's DETAIL, so it applies
    // exactly where P4 does. Without this a solo with no staff gets a §4
    // containing nothing but a placeholder for a question that does not exist.
    when: { hasNonAttorneyStaff: true },
    text: {
      kind: 'todo',
      // G-Q9 is one of the nine approved questions (D3) and is OUT OF SCOPE for
      // this batch. Katy specified it in Module G; only `contract_attorneys` was
      // ever built from that module.
      reason:
        'G-Q9 — who trains staff and collects attestations, and on what renewal ' +
        'cadence. Approved for build (D3) but the intake question does not exist ' +
        'yet, so there is no answer to fill a slot from. Katy wrote no clause text ' +
        'for it either.',
      sourceLine: null,
    },
  },
]
