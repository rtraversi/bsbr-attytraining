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

import type { Block } from '@/lib/policy/types'

export const SECTION_21_BLOCKS: readonly Block[] = [
  {
    id: 'p26-discipline',
    clause: 'P26',
    text: {
      kind: 'todo',
      reason:
        'Katy wrote two slots, not a clause: "[insert the discipline actions specified ' +
        'in the intake] [insert person at firm in charge of discipline decisions]". The ' +
        'first fills from `discipline` (which may carry NOT_DECIDED_YET); the second ' +
        'has no question until G-Q3 lands.',
      sourceLine: 316,
    },
  },
  {
    id: 'discipline',
    clause: 'Part 2 — Discipline',
    text: {
      kind: 'todo',
      reason:
        'Katy wrote a directive ("Specify the consequences of policy violations by ' +
        'staff"), not policy text.',
      sourceLine: 401,
    },
  },
]
