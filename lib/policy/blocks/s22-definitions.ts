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
    id: 'p38-professional-data-protection',
    clause: 'P38',
    text: {
      kind: 'todo',
      reason:
        'G-B4 — Katy left this unfinished in the source: "Professional level of data ' +
        'protection:  API, Claude Enterpirse, ..[finish this list]". Per Max the ' +
        'finished entry is the RULE (an express no-training agreement) plus EXAMPLES, ' +
        'explicitly not an authoritative list. Wording beyond that shape is out of ' +
        'scope for this batch. P12, P17, P18, P19 and P30 all depend on it.',
      sourceLine: 342,
    },
  },
]
