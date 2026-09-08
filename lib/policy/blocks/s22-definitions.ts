// §22 Definitions — POLICY-ENGINE-MAP.md §11.2, and correction D7 (§12)
//
// 🔴 THIS IS NOT THE GLOSSARY, and the distinction is D7's whole point.
//
// Two objects were conflated and then separated on 2026-08-31:
//
//   DEFINITIONS: (source line 340) — Katy's, INSIDE the policy, cross-referenced
//     from P12 as "(DEFINITIONS AT END)". One entry, unfinished. This section.
//
//   # Glossary (source line 648) — Max's, 16 AI-literacy terms. An AUTHORING
//     AID so he and Katy share a vocabulary. It does NOT ship to firms, is not
//     a deliverable of any kind, and is not behind D6. It is not this section.
//
// So §22 is an operative-terms block of roughly three entries, not a glossary.
// A firm's AI policy has no reason to define "retrieval-augmented generation";
// it has every reason to define the term its own data-security rule turns on.
//
// ── The shape, settled by Max 2026-08-31 ────────────────────────────────────
// "then lets list them as examples not an authoritative absolute list. include
// the rule." So the entry is THE RULE (a no-training agreement) plus EXAMPLES,
// not a closed list of products. That also closes the tier inconsistency in
// D7 §12.1: §5, §9 and §10 cross-reference this term, and once it means "the
// no-training agreement" they branch on tool_grid[].noTraining, which the
// intake still collects, instead of a tier it dropped on 2026-08-28.

import type { Block } from '@/lib/policy/types'

export const SECTION_22_BLOCKS: readonly Block[] = [
  {
    id: 'g-b4-professional-level',
    clause: 'Part 2 — DEFINITIONS',
    // Katy left this unfinished mid-sentence: "Professional level of data
    // protection:  API, Claude Enterpirse, ..[finish this list]".
    //
    // 🔴 HER TWO EXAMPLES WERE CUT, deliberately (Max, 2026-09-04). We have no
    // evidence for either: Claude appears nowhere in .planning/policy-blocks.csv,
    // and nothing has checked whether API access carries a no-training
    // commitment by default at the providers this product actually lists. Of the
    // 20 vendors that WERE researched, 15 came back "unclear". Naming an example
    // we cannot stand behind, inside the definition the whole policy turns on,
    // is worse than naming none. See .planning/RESEARCH-QUEUE.md §1 — they come
    // back if the research supports them.
    //
    // The rule half is her own words from line 356.
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      text:
        'Professional level of data protection: an express agreement that the ' +
        "firm's data will not be used to train the provider's models.",
      sourceLine: 342,
    },
  },
]
