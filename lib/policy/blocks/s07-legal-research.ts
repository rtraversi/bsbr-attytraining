// §7 Legal Research — POLICY-ENGINE-MAP.md §11.2
//
// Sources: Part 2 LEGAL RESEARCH, P9 (per research_tools), P13.
//
// The whole section falls away when research_tools is `none`.
//
// ⚠️ P13 states the source-reporter rule, and so do Part 2's LEGAL RESEARCH and
// Part 2's Hallucinations — three statements of one rule (§5, duplication 2).
// Ratification resolved it: the rule is stated ONCE, in §8, and this section
// cross-references it rather than restating it.

import { NONE_VALUE } from '@/lib/intake/questions'
import type { Block } from '@/lib/policy/types'

export const SECTION_7_BLOCKS: readonly Block[] = [
  {
    id: 'legal-research-distinct-class',
    clause: 'Part 2 — LEGAL RESEARCH',
    when: { key: 'research_tools', not: NONE_VALUE },
    text: {
      kind: 'verbatim',
      // Its closing duty — “Firm admin must approve the specific platform” —
      // has no question behind it and is part of G-Q8, carried by §5.
      text:
        'LEGAL RESEARCH: Dedicated legal research tools are in a distinct class from ' +
        '“ordinary tasks” like letter drafting or case management.  Any legal research ' +
        'tools must be compliant.  Firm admin must approve the specific platform based on ' +
        'its reliability and safety.',
      sourceLine: 397,
    },
  },
  {
    // G-A1 — six legal research tools. `general_llms` is NOT a vendor and gets
    // no block here; P12 in §5 governs it.
    id: 'p9-research-per-tool',
    clause: 'P9',
    when: { key: 'research_tools', not: NONE_VALUE },
    text: { kind: 'perPlatform', answerKey: 'research_tools', sourceLine: 280 },
  },
  {
    id: 'p13-verify-every-case',
    clause: 'P13',
    when: { key: 'research_tools', not: NONE_VALUE },
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line. Per ratification the source-reporter rule ' +
        'is stated once in §8, so this block should become a cross-reference to it ' +
        'rather than a third restatement.',
      sourceLine: 288,
    },
  },
]
