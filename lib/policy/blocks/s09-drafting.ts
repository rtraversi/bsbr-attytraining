// §9 Drafting, Translation and Filings — POLICY-ENGINE-MAP.md §11.2
//
// Sources: Part 2 Drafting, P17, P18, P19 + Part 2 Foreign language output,
// P20, P21.
//
// P21 (court disclosure) is here rather than in a section of its own: the first
// draft of the spine gave it a §10 to itself for one clause, and ratification
// merged it into the filings section it was already adjacent to (§11, fix 3).
//
// ⚠️ P17 and P18 branch on CONSUMER vs PROFESSIONAL tier, and the intake
// stopped collecting tier on 2026-08-28 (D7 §12.1). Settled: define
// "professional level of data protection" in §22 as the no-training agreement
// plus examples, and rewrite P17/P18 to branch on tool_grid[].noTraining. Until
// that rewrite these two carry the tier language they were written with.

import { NO_COURT_AI_ORDERS, NO_DRAFTING } from '@/lib/intake/questions'
import type { Block } from '@/lib/policy/types'

export const SECTION_9_BLOCKS: readonly Block[] = [
  {
    id: 'drafting-categories',
    clause: 'Part 2 — Drafting',
    when: { key: 'drafting_uses', not: NO_DRAFTING },
    text: {
      kind: 'todo',
      reason:
        'Katy wrote a three-item list (form / content / boilerplate) at lines 363-366, ' +
        'not a clause. The list maps onto drafting_uses. Line 367 (local filing rules) ' +
        'is P20 below; line 368 is carried by §3.',
      sourceLine: 363,
    },
  },
  {
    id: 'p17-template-drafting',
    clause: 'P17',
    when: { key: 'drafting_uses', not: NO_DRAFTING },
    text: {
      kind: 'verbatim',
      // “pr” is the source’s typo for “or”. Left alone.
      // Still carries the CONSUMER/PROFESSIONAL tier language the intake stopped
      // collecting on 2026-08-28; per D7 §12.1 the BRANCH must be rewritten onto
      // tool_grid[].noTraining. Katy’s words do not change when it is.
      text:
        'Consumer level pr pro level may be used for drafting of templates as long as no ' +
        'personally identifiable case or client information is used and it is strictly for ' +
        'form and not content',
      sourceLine: 298,
    },
  },
  {
    id: 'p18-client-data-drafting',
    clause: 'P18',
    when: { key: 'drafting_client_data', is: 'client_data' },
    text: {
      kind: 'verbatim',
      // Turns on “Professional level security”, the term §22 must define (G-B4).
      // Same tier rewrite as P17 — see the note there.
      text:
        'Professional level security is required for any drafting that we utilize or have ' +
        'access to case or client specific data.',
      sourceLine: 300,
    },
  },
  {
    id: 'p19-translations',
    clause: 'P19',
    when: { key: 'drafting_foreign_language', is: 'yes' },
    text: {
      kind: 'verbatim',
      // “professional lever” is the source’s typo for “professional level”.
      // Part 2 states the same duty at line 415 (“Foreign language output”);
      // one of the two is canonical and that is still open.
      text:
        'Translations shall be independently reviewed by a person competent to do so and ' +
        'will always be done with professional lever data security since it will handle ' +
        'client data.',
      sourceLine: 302,
    },
  },
  {
    id: 'p20-local-filing-rules',
    clause: 'P20',
    // Always: a transactional firm files with nobody, and the duty still reads
    // correctly with an empty court list (map §2.3).
    text: {
      kind: 'verbatim',
      // Part 2 restates this at line 367.
      text:
        'Attorneys will be responsible for ensuring that all local filing rules are ' +
        'complied with including but not limited to:  format, margins, font size, and ' +
        'content elements.',
      sourceLine: 304,
    },
  },
  {
    id: 'p21-court-ai-disclosure',
    clause: 'P21',
    // `not: 'no'` opens on BOTH "yes" and "not sure" — Katy's instruction, and
    // the reason NO_COURT_AI_ORDERS is exported from questions.ts.
    when: { key: 'court_ai_orders', not: NO_COURT_AI_ORDERS },
    text: {
      kind: 'verbatim',
      // The opening quote before “AI was used for X” is never closed in the
      // source. Left exactly as she wrote it.
      // The three-way split (yes / not_sure / court_cert_template) is a BRANCH
      // still to build around this clause, not a change to it.
      text:
        'Firm will be responsible for being aware and complying with any local or court or ' +
        'judge specific affirmative AI disclosures.  For example if a jurisdiction requires ' +
        'every filing to affirmatively state “AI was used for X, or AI was not used in the ' +
        'preparation of the filing.',
      sourceLine: 306,
    },
  },
]
