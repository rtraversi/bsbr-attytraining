// §8 Verification and Hallucinations — POLICY-ENGINE-MAP.md §11.2
//
// 🔴 THE CANONICAL SOURCE-REPORTER RULE LIVES HERE, and only here.
//
// §5 of the map found it stated three times across the source (P13, Part 2
// LEGAL RESEARCH, Part 2 Hallucinations). Ratification made §8 its one home;
// §7 and §9 point at this section and never restate it (§11.1, consequence 2).
//
// Unconditional — it applies to every firm regardless of what they use AI for.

import type { Block } from '@/lib/policy/types'

export const SECTION_8_BLOCKS: readonly Block[] = [
  {
    id: 'hallucinations',
    clause: 'Part 2 — Hallucinations',
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at lines 386-389 and needs transcription only. Four parts: ' +
        'independent verification from source material; no defence in relying on ' +
        'another attorney or staff member; citations, holdings and facts verified ' +
        'against SOURCE reporters; the duty to correct and disclose a discovered error.',
      sourceLine: 386,
    },
  },
]
