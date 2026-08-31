// §12 Meetings and AI Notetakers — POLICY-ENGINE-MAP.md §11.2
//
// Sources: P24, Part 2 AI Notetakers including the Iurix non-assurance note.
//
// Three stances today, and a fourth — `not_sure` — approved as G-Q2. Katy's
// P24 bracket routes an unsure firm to the action list, and that path is
// currently UNREACHABLE because notetaker_stance offers only not_permitted /
// all_consent / state_law. The branch is wired in lib/policy/action-items.ts
// anyway; it simply never fires until the option lands.

import type { Block } from '@/lib/policy/types'

export const SECTION_12_BLOCKS: readonly Block[] = [
  {
    id: 'p24-notetaking',
    clause: 'P24',
    text: {
      kind: 'todo',
      reason:
        'Katy wrote an instruction, not a clause: insert the firm\'s choice, or route ' +
        'an UNSURE firm to the action list. Needs one prepared block per stance — ' +
        'three today, four once G-Q2 lands. notetaker_scope narrows the wording and ' +
        'notetaker_tools names the tool.',
      sourceLine: 312,
    },
  },
  {
    id: 'ai-notetakers',
    clause: 'Part 2 — AI Notetakers',
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at lines 375-380: the stance list, and the Iurix ' +
        'non-assurance note ("Iurix cannot assure compliance with regard to notetakers ' +
        'and firms must determine their own liability and local regulations"), which is ' +
        'unconditional and must survive every stance branch.',
      sourceLine: 375,
    },
  },
]
