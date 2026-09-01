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
      kind: 'verbatim',
      // 🔴 SPLIT ACROSS FOUR BLOCKS, one per source line, because the fidelity
      // test in tests/policy-transcription.test.ts checks a block against ONE
      // line. Katy’s sub-bullets at 387-389 are separate rules anyway, and each
      // now carries the line it came from. The leading “-” on each is her list
      // marker, dropped with the “**”.
      text:
        'Hallucinations:  All content must be independently verified from source material.  ' +
        'This requirement is not specific to AI, it just extends the regular duty of care ' +
        'of all submissions to the court, but notes that attorneys must have a heightened ' +
        'awareness of the potential for hallucinations.',
      sourceLine: 386,
    },
  },
  {
    id: 'hallucinations-no-defence',
    clause: 'Part 2 — Hallucinations',
    text: {
      kind: 'verbatim',
      text:
        'It is not a defense that attorney relied on the work of another attorney nor a ' +
        'staff member',
      sourceLine: 387,
    },
  },
  {
    id: 'hallucinations-source-reporters',
    clause: 'Part 2 — Hallucinations',
    text: {
      kind: 'verbatim',
      // 🔴 THE CANONICAL SOURCE-REPORTER RULE. §7 (P13) and Part 2’s LEGAL
      // RESEARCH state it too; ratification made this the one home.
      text:
        'All citations, case holdings, and case facts MUST be verified with SOURCE ' +
        'reporters (not an AI summary).  Staff can be in charge of finding the cases, but ' +
        'in all cases the attorney is the one ultimately responsible for verification.',
      sourceLine: 388,
    },
  },
  {
    id: 'hallucinations-duty-to-correct',
    clause: 'Part 2 — Hallucinations',
    text: {
      kind: 'verbatim',
      text: 'Attorney has the duty to correct and disclose an error if discovered.',
      sourceLine: 389,
    },
  },
]
