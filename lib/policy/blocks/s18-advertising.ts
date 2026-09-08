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
    // Unbranched 2026-09-02 (Katy): module R is always in every policy.
    text: {
      kind: 'verbatim',
      text:
        'ADVERTISING:  Any AI generated advertising will be independently reviewed by ' +
        'attorney for compliance with legal advertising',
      sourceLine: 338,
    },
  },
  {
    id: 'advertising-and-marketing',
    clause: 'Part 2 — Advertising and Marketing',
    // Unbranched 2026-09-02 (Katy): module R is always in every policy.
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      // Her lines 408-411 are a three-item list, not a clause: AI generated
      // artwork; marketing to AI users; AI generated social media posts. The
      // middle one is not AI-generated content at all — it is influencing what
      // an AI platform says about the firm — so her line 338 rule, which covers
      // "AI generated advertising", does not reach it. Naming what the firm
      // actually does is what makes the review duty reach all three.
      //
      // "legal advertising rules" keeps HER phrase. An earlier draft said
      // "attorney advertising rules", which is the term the bar rules use; Max
      // chose her voice. Only the missing noun is added.
      text:
        'The firm uses AI for the following: [MARKETING WAYS]. All such ' +
        'material will be independently reviewed by an attorney for compliance ' +
        'with legal advertising rules before publication.',
      sourceLine: 408,
      slots: [{ placeholder: '[MARKETING WAYS]', key: 'marketing_ways' }],
    },
  },
]
