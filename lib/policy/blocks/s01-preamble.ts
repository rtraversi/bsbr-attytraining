// §1 Preamble — POLICY-ENGINE-MAP.md §11.2
//
// One block, unconditional. Part 2's opening line, which the interleave order
// places before everything else.

import type { Block } from '@/lib/policy/types'

export const SECTION_1_BLOCKS: readonly Block[] = [
  {
    id: 'preamble',
    clause: 'Part 2 — Preamble',
    text: {
      kind: 'verbatim',
      // ⚠️ Katy's own "Preamble:" label is kept. Stripping it because the
      // section is already titled "Preamble" is an editorial change, and the
      // transcription rule does not allow one. If the duplication reads badly
      // once there is a renderer, that is a decision for Katy on her document,
      // not a silent fix here.
      text:
        'Preamble: Under the prevailing law AI is considered a tool and in some cases ' +
        'treated like a staff member.',
      sourceLine: 346,
    },
  },
]
