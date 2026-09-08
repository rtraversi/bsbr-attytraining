// §21 Enforcement and Discipline — POLICY-ENGINE-MAP.md §11.2
//
// Sources: P26, Part 2 Discipline. Always present.
//
// Placed last before Definitions deliberately, not buried mid-document: "It is
// what makes the rest enforceable, and a firm reading its own policy should
// reach it having read what it enforces" (§11.1, consequence 3).
//
// 🔴 P26 HAS TWO SLOTS AND THE INTAKE ANSWERS ONE. `discipline` is a single
// longtext covering the actions; Katy's Module S also asked who holds
// enforcement authority, and that question was never built — G-Q3.

import { NOT_DECIDED_YET } from '@/lib/intake/types'
import type { Block } from '@/lib/policy/types'

export const SECTION_21_BLOCKS: readonly Block[] = [
  {
    id: 'p26-discipline',
    clause: 'P26',
    // Katy wrote TWO slots and no wrapping sentence: "[insert the discipline
    // actions specified in the intake] [insert person at firm in charge of
    // discipline decisions]". The first fills from `discipline`, the second
    // from `discipline_owner`, added 2026-09-04 because her clause demanded an
    // answer nothing asked for.
    //
    // 🔴 A firm that answered "Unsure" gets NOTHING here and an action item
    // instead (Max, 2026-09-04: "if unsure i think nothing is added to policy,
    // but on action list they are flagged to solve this"). That is why the
    // block requires `discipline` to be answered with something real.
    when: { key: 'discipline', not: NOT_DECIDED_YET },
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      text:
        'Violations of this policy will be handled as follows: [DISCIPLINE ' +
        'ACTIONS]. [DISCIPLINE OWNER] is responsible for discipline decisions.',
      sourceLine: 316,
      slots: [
        { placeholder: '[DISCIPLINE ACTIONS]', key: 'discipline' },
        { placeholder: '[DISCIPLINE OWNER]', key: 'discipline_owner' },
      ],
    },
  },
]
