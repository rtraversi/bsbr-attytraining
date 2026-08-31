// §14 Client Disclosure and Client Use of AI — POLICY-ENGINE-MAP.md §11.2
//
// A three-way merge, per the spine's provenance note: Part 2's Disclosure,
// POLICY REGARDING CLIENT USE OF AI, and Give examples become one section.
//
// Sources: Part 2 Disclosure, P33 (G-B3), P27, Part 2 client use, Part 2
// "Give examples" (G-Q4).

import type { Block } from '@/lib/policy/types'

export const SECTION_14_BLOCKS: readonly Block[] = [
  {
    id: 'disclosure-reasoning',
    clause: 'Part 2 — Disclosure',
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at lines 391-395 and needs transcription only. This is the ' +
        'raw material for G-B3: not every use needs disclosure, but delegating ' +
        'SUBSTANTIVE tasks is akin to outsourcing and needs advance informed consent.',
      sourceLine: 391,
    },
  },
  {
    id: 'p33-disclosure-situations',
    clause: 'P33',
    // Katy's own trigger: billing for AI, or substantive drafting.
    when: {
      any: [
        { key: 'bill_ai_costs', is: 'yes' },
        { key: 'drafting_uses', includesAny: ['substantive'] },
      ],
    },
    text: {
      kind: 'todo',
      reason:
        'G-B3 — Katy wrote "required if [research the situations]". THE SITUATIONS LIST ' +
        'IS UNWRITTEN and is one of the live v1 gaps. Line 391-395 above is the ' +
        'reasoning it must be derived from.',
      sourceLine: 330,
    },
  },
  {
    id: 'p27-client-use-of-ai',
    clause: 'P27',
    when: { key: 'client_ai', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Katy wrote an instruction, not a clause. Slot-filled from the ' +
        'client_ai_approach longtext, which may carry the NOT_DECIDED_YET sentinel — ' +
        'that case gets prepared template text rather than the firm\'s words.',
      sourceLine: 318,
    },
  },
  {
    id: 'client-use-of-ai-stance',
    clause: 'Part 2 — POLICY REGARDING CLIENT USE OF AI',
    when: { key: 'client_ai', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Katy wrote a directive to the firm ("Determine how the firm wishes to address ' +
        'the clients use of AI"), not policy text. G-Q4 would add the tone/stance ' +
        'question behind it.',
      sourceLine: 403,
    },
  },
  {
    id: 'give-examples',
    clause: 'Part 2 — Give examples',
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line (safe chat questions — mailing address, filing ' +
        'fee). G-Q4 makes including it optional, per Katy\'s Module T Q3; until that ' +
        'question exists there is no answer to gate it on.',
      sourceLine: 417,
    },
  },
]
