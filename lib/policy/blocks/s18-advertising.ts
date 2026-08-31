// §18 Advertising and Marketing — POLICY-ENGINE-MAP.md §11.2
//
// Sources: P37, Part 2 Advertising and Marketing.
//
// ⚠️ marketing_review = 'no' is a flag for Katy's review, not a branch.

import type { Block } from '@/lib/policy/types'

export const SECTION_18_BLOCKS: readonly Block[] = [
  {
    id: 'p37-advertising',
    clause: 'P37',
    when: { key: 'ai_marketing', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only: AI-generated ' +
        'advertising is independently reviewed by an attorney for compliance with ' +
        'legal advertising rules.',
      sourceLine: 338,
    },
  },
  {
    id: 'advertising-and-marketing',
    clause: 'Part 2 — Advertising and Marketing',
    when: { key: 'ai_marketing', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Katy wrote a three-item list at lines 408-411 (AI-generated artwork; marketing ' +
        'to AI users; AI-generated social media posts), not a clause.',
      sourceLine: 408,
    },
  },
]
