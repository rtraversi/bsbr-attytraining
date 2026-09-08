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
    id: 'p9-research-tools-named',
    clause: 'P9',
    when: { key: 'research_tools', not: NONE_VALUE },
    // 🔴 The generated per-vendor paragraph was REMOVED here on 2026-09-04, for
    // the four reasons set out at the top of s06-platforms.ts. Naming the tools
    // keeps the clause firm-specific without asserting what any vendor's terms
    // say; the research moves to the action items.
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      // "The following are approved" carries any count. "tools are CoCounsel"
      // would not.
      text: 'The following are approved as the firm\'s legal research tools: [RESEARCH TOOLS].',
      sourceLine: 280,
      slots: [{ placeholder: '[RESEARCH TOOLS]', key: 'research_tools' }],
    },
  },
  {
    id: 'p13-verify-every-case',
    clause: 'P13',
    when: { key: 'research_tools', not: NONE_VALUE },
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      // Her line 288 says every case must be confirmed with the source reporter.
      // §8 already says that, so stating it a third time here was ratified out.
      //
      // ⚠️ Her line 288 carries a nuance §8 did NOT have: the holding must be
      // "correct and not misleading, and a relevant part of the case". That
      // phrase was folded into §8's verification clause in the same change, so
      // this cross-reference loses nothing. Do not remove it from §8.
      text:
        'Every case surfaced by an AI research tool must be verified with ' +
        'source reporters as required by Section 8.',
      sourceLine: 288,
    },
  },
]
