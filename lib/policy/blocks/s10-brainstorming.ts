// §10 Brainstorming — POLICY-ENGINE-MAP.md §11.2
//
// Sources: P30, Part 2 Brainstorming.
//
// ⚠️ brainstorming_tier = 'consumer_tier' is a COMPLIANCE GAP TO FLAG, in
// Katy's own words, not a branch that softens the clause. Flagging is a
// reviewer-facing concern and does not belong in the assembled policy.

import type { Block } from '@/lib/policy/types'

export const SECTION_10_BLOCKS: readonly Block[] = [
  {
    id: 'p30-brainstorming',
    clause: 'P30',
    when: { key: 'brainstorming', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line ("Case and strategy brainstorming shall only ' +
        'be done with professional level security"). Depends on §22 defining that term.',
      sourceLine: 324,
    },
  },
  {
    id: 'brainstorming-confidentiality',
    clause: 'Part 2 — Brainstorming',
    when: { key: 'brainstorming', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at lines 370-371 and needs transcription only: case ' +
        'specific brainstorming happens locally, with only API or Commercial Use ' +
        'licences, no training allowed.',
      sourceLine: 370,
    },
  },
]
