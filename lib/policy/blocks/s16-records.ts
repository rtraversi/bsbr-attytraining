// §16 Records and Retention — POLICY-ENGINE-MAP.md §11.2
//
// Source: P36. One of the four Part 1 topics with no Part 2 heading behind it.

import type { Block } from '@/lib/policy/types'

export const SECTION_16_BLOCKS: readonly Block[] = [
  {
    id: 'p36-recordkeeping',
    clause: 'P36',
    text: {
      kind: 'verbatim',
      // retention_schedule is a slot fill when retain_prompts = yes — but Katy
      // wrote no bracket here, so there is nothing to fill and no slot is
      // declared. Inventing a placeholder would be inventing her clause.
      text:
        'RECORDKEEPING:  research for a client that is case specific and substantive legal ' +
        'work shall be preserved in client’s file as work product subject to the same ' +
        'retention criteria as the rest of the file.',
      sourceLine: 336,
    },
  },
]
