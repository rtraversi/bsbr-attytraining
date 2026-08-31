// §19 Malpractice Insurance — POLICY-ENGINE-MAP.md §11.2
//
// Sources: P35, Part 2 Malpractice insurance. Always present.
//
// carrier_notified = 'not_sure' also feeds the ACTION ITEM LIST — see
// lib/policy/action-items.ts. Katy's bracket at line 334 is explicit that the
// check goes on the action list, and the clause itself still applies.

import type { Block } from '@/lib/policy/types'

export const SECTION_19_BLOCKS: readonly Block[] = [
  {
    id: 'p35-malpractice-disclosure',
    clause: 'P35',
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line for the second half ("Firm shall comply with ' +
        'any requirements to disclose AI use to malpractice carrier"); the first half ' +
        'is the action-list bracket. G-Q5 (AI-specific exclusions or riders) was ' +
        'specified in Module R and never built.',
      sourceLine: 334,
    },
  },
  {
    id: 'malpractice-insurance',
    clause: 'Part 2 — Malpractice insurance',
    text: {
      kind: 'todo',
      reason: 'Source text EXISTS at this line and needs transcription only.',
      sourceLine: 413,
    },
  },
]
