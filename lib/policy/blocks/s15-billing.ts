// §15 Billing — POLICY-ENGINE-MAP.md §11.2
//
// Sources: P28, P34, Part 2 Billing.
//
// ⚠️ ai_time_adjustment = 'no' is a POLICY GAP REQUIRING A FIRM DECISION, in
// Katy's words — not boilerplate, and not something the assembler resolves.

import type { Block } from '@/lib/policy/types'

export const SECTION_15_BLOCKS: readonly Block[] = [
  {
    id: 'p28-bill-ai-costs',
    clause: 'P28',
    when: { key: 'bill_ai_costs', is: 'yes' },
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      // Her line 320 is the whole spec: "{if intake indicated that clients will
      // be billed then add that mandatory disclosure of scope and cost of AI
      // will be made at hiring". Her September list agrees — "Yes-triggers
      // disclosure duty". One sentence, on yes only.
      text:
        'Mandatory disclosure of the scope and cost of AI will be made to the ' +
        'client at hiring.',
      sourceLine: 320,
    },
  },
  {
    id: 'p34-no-billing-hours-not-spent',
    clause: 'P34',
    text: {
      kind: 'verbatim',
      text:
        'FIRM shall never bill for hours not actually spent on case for any reason, ' +
        'including that the task would have taken longer without AI.',
      sourceLine: 332,
    },
  },
  {
    id: 'billing',
    clause: 'Part 2 — Billing',
    text: {
      kind: 'verbatim',
      // Reads against billing_models — HOURLY_BILLING_MODELS is the set this
      // bites on. That is a BRANCH still to build, not an edit to the clause.
      text:
        'Billing:  Attorney may not bill hourly time unless that time was actually spent on ' +
        'the matter.  If AI allows an attorney to complete the same task in less time then ' +
        'they must bill for the actual reduced time, or must charge a flat fee for their ' +
        'service at the time of agreement',
      sourceLine: 399,
    },
  },
]
