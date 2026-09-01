// §17 Employment and Hiring — POLICY-ENGINE-MAP.md §11.2
//
// Sources: P25, Part 2 Employment decisions. Always present, stronger when
// hiring_ai = yes.
//
// Katy's own rule is that we CANNOT PROVIDE A STANDARD POLICY here, so both
// blocks route to separate compliance counsel rather than stating a duty. That
// is also why deferring per-state data (D5) costs little: this clause was never
// going to be state-specific.

import type { Block } from '@/lib/policy/types'

export const SECTION_17_BLOCKS: readonly Block[] = [
  {
    id: 'p25-employment-hiring',
    clause: 'P25',
    text: {
      kind: 'verbatim',
      // hiring_states was noted as a slot fill; Katy wrote no bracket for it,
      // so no slot is declared. She says “all local regulations”, which reads
      // correctly without naming the states.
      text:
        'EMPLOYMENT AND HIRING:  Firm shall ensure that any use of AI in selection of ' +
        'potential candidates for hiring conforms with all local regulations and if unsure ' +
        'will engage practice specific counsel about this issue.',
      sourceLine: 314,
    },
  },
  {
    id: 'employment-decisions',
    clause: 'Part 2 — Employment decisions',
    when: { key: 'hiring_ai', is: 'yes' },
    text: {
      kind: 'verbatim',
      text:
        'Employment decisions: If firm wants to use AI in screening applicants that must be ' +
        'vetted with current state compliance.  We cannot provide a standard policy.',
      sourceLine: 382,
    },
  },
]
