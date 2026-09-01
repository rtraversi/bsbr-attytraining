// §3 Competency — POLICY-ENGINE-MAP.md §11.2
//
// P22 plus three Part 2 blocks. All unconditional.
//
// P22's own question, `ai_practice_expansion`, deliberately does NOT gate this
// section: POLICY-ENGINE-MAP.md §2.3 records that a `yes` there is "a flag for
// Katy, not a clause change". The competency rule applies to every firm.

import type { Block } from '@/lib/policy/types'

export const SECTION_3_BLOCKS: readonly Block[] = [
  {
    id: 'p22-no-practice-beyond-competence',
    clause: 'P22',
    text: {
      kind: 'verbatim',
      text:
        'No attorney will engage in the practice of any area of law that they would ' +
        'not deem themselves competent to engage in without the help of AI.',
      sourceLine: 308,
    },
  },
  {
    id: 'competency',
    clause: 'Part 2 — Competency',
    text: {
      kind: 'verbatim',
      text:
        'Competency:  Firm cannot take on a matter that the lawyer would not be ' +
        'competent to handle if AI was not available.  AI does not relieve the ' +
        'attorney of maintaining currency and competency in their field.',
      sourceLine: 348,
    },
  },
  {
    id: 'attorney-reviews-every-filing',
    clause: 'Part 2 — every attorney reviews every filing before signing',
    text: {
      kind: 'verbatim',
      text:
        'Every attorney is responsible for personally reviewing every filing before ' +
        'signing and submitting to a tribunal or agency.',
      sourceLine: 350,
    },
  },
  {
    id: 'no-tool-you-do-not-understand',
    clause: 'Part 2 — may not use a tool they do not understand',
    text: {
      kind: 'verbatim',
      // Source line begins with a tab and an escaped bullet ("\-"), both
      // markdown artefacts of Katy's nested list. The trailing comma is hers.
      text:
        'Attorney may not use a tool they do not understand.  Attorney must always ' +
        'be able to fully explain how and why they came to a conclusion,',
      sourceLine: 368,
    },
  },
]
