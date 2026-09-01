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
      kind: 'verbatim',
      // Turns on “professional level security”, the term §22 must define (G-B4).
      text:
        'BRAINSTORMING:  Case and strategy brainstorming shall only be done with ' +
        'professional level security',
      sourceLine: 324,
    },
  },
  {
    id: 'brainstorming-confidentiality',
    clause: 'Part 2 — Brainstorming',
    when: { key: 'brainstorming', is: 'yes' },
    text: {
      kind: 'verbatim',
      // ⚠️ THE CITED LINE MOVED, 370 → 371. Line 370 is the bare heading
      // “Brainstorming:”; the clause is the bullet under it. The leading “-” is
      // Katy’s list marker, not policy language, and is dropped with the “**”.
      text:
        'Maintain confidentiality: Any case specific brainstorming must happen locally with ' +
        'only API or Commercial Use licenses with no training allowed',
      sourceLine: 371,
    },
  },
]
