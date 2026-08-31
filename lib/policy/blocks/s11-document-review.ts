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
      kind: 'todo',
      reason:
        'P31 has source text at line 326 ("AI shall only be used as an additional aid ' +
        'to human document review and summarizing, not as a replacement"); P23 at line ' +
        '310 is an instruction only. One merged clause, per ratification. ' +
        'doc_review_scale currently changes nothing — Katy wanted heavier language at ' +
        '`ediscovery`, which is an open decision.',
      sourceLine: 326,
    },
  },
  {
    id: 'summarizing',
    clause: 'Part 2 — Summarizing',
    when: { key: 'doc_review', is: 'yes' },
    text: {
      kind: 'todo',
      reason: 'Source text EXISTS at this line and needs transcription only.',
      sourceLine: 373,
    },
  },
  {
    id: 'p32-tar',
    clause: 'P32',
    when: { key: 'tar', is: 'yes' },
    text: {
      kind: 'todo',
      reason: 'Source text EXISTS at this line and needs transcription only.',
      sourceLine: 328,
    },
  },
]
