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
      kind: 'todo',
      reason:
        'Source text EXISTS at this line ("Consumer level pr pro level may be used…"). ' +
        'Per D7 §12.1 it must be rewritten to branch on tool_grid[].noTraining rather ' +
        'than on a tier the intake no longer collects.',
      sourceLine: 298,
    },
  },
  {
    id: 'p18-client-data-drafting',
    clause: 'P18',
    when: { key: 'drafting_client_data', is: 'client_data' },
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line. Same tier rewrite as P17 (D7 §12.1); it ' +
        'turns on "Professional level security", the term §22 must define.',
      sourceLine: 300,
    },
  },
  {
    id: 'p19-translations',
    clause: 'P19',
    when: { key: 'drafting_foreign_language', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line, and Part 2 states the same duty at line 415 ' +
        '("Foreign language output"). One of the two is canonical; the languages ' +
        'themselves are a slot fill from foreign_languages.',
      sourceLine: 302,
    },
  },
  {
    id: 'p20-local-filing-rules',
    clause: 'P20',
    // Always: a transactional firm files with nobody, and the duty still reads
    // correctly with an empty court list (map §2.3).
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line, and Part 2 restates it at line 367. ' +
        'filing_courts is an optional slot fill.',
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
      kind: 'todo',
      reason:
        'Source text EXISTS at this line. Three-way per the map: `yes` states the ' +
        'duty; `not_sure` adds a check-before-filing instruction; court_cert_template ' +
        '= yes appends a certification statement template.',
      sourceLine: 306,
    },
  },
]
