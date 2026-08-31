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
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only. hiring_states ' +
        'is a slot fill.',
      sourceLine: 314,
    },
  },
  {
    id: 'employment-decisions',
    clause: 'Part 2 — Employment decisions',
    when: { key: 'hiring_ai', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only: screening ' +
        'applicants must be vetted against current state compliance, and "We cannot ' +
        'provide a standard policy."',
      sourceLine: 382,
    },
  },
]
