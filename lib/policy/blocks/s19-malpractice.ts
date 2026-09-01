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
      kind: 'verbatim',
      // Line 334 is half instruction, half clause. The opening bracket — “[add
      // to action list to check if malpractice insurance requires notification
      // of AI tools]” — is the action-list route, carried by
      // lib/policy/action-items.ts, and the words after it are the clause. The
      // same split as P6 at line 274.
      text: 'Firm shall comply with any requirements to disclose AI use to malpractice carrier.',
      sourceLine: 334,
    },
  },
  {
    id: 'malpractice-insurance',
    clause: 'Part 2 — Malpractice insurance',
    text: {
      kind: 'verbatim',
      text:
        'Malpractice insurance:  Firm will insure that necessary disclosures are made to ' +
        'Professional Liability carrier',
      sourceLine: 413,
    },
  },
]
