// §11 Document Review and Summarizing — POLICY-ENGINE-MAP.md §11.2
//
// 🔴 P23 AND P31 ARE MERGED HERE. The map's §5 found them to be the same
// subject — "DISCOVERY REVIEW" and "SUMMARIZING AND DOCUMENT REVIEW" both fire
// on doc_review = yes and both say human review is not replaced. Ratification
// made them one section (§11.3). Do not re-split them without reopening that.
//
// Sources: P23 + P31 merged, Part 2 Summarizing, P32.

import type { Block } from '@/lib/policy/types'

export const SECTION_11_BLOCKS: readonly Block[] = [
  {
    id: 'p23-p31-document-review',
    clause: 'P23 + P31 (merged)',
    when: { key: 'doc_review', is: 'yes' },
    text: {
      kind: 'verbatim',
      // P23 (line 310, “DISCOVERY REVIEW”) is an instruction with no clause;
      // P31 at line 326 is the clause. Merged into one block per ratification,
      // so the transcribed text is P31’s and the id names both.
      text:
        'SUMMARIZING AND DOCUMENT REVIEW:  AI shall only be used as an additional aid to ' +
        'human document review and summarizing, not as a replacement',
      sourceLine: 326,
    },
  },
  {
    id: 'summarizing',
    clause: 'Part 2 — Summarizing',
    when: { key: 'doc_review', is: 'yes' },
    text: {
      kind: 'verbatim',
      // Curly quotes around “doc review” are the source’s.
      text:
        'Summarizing (“doc review”):  be aware that while AI can sometimes efficiently ' +
        'identify items in long documents, it also can be wrong and miss items.  AI can be ' +
        'used as a supplement but not a replacement for human review.',
      sourceLine: 373,
    },
  },
  {
    id: 'p32-tar',
    clause: 'P32',
    when: { key: 'tar', is: 'yes' },
    text: {
      kind: 'verbatim',
      text:
        'TECHNOLOGY ASSISTED REVIEW:  Any TAR methodology, if used, must be documented and ' +
        'if required by local rule, disclosed.',
      sourceLine: 328,
    },
  },
]
