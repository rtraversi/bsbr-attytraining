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
]
