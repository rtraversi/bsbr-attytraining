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
      kind: 'todo',
      reason:
        'Katy wrote an instruction, though it dictates the substance: mandatory ' +
        'disclosure of the scope and cost of AI, made at hiring.',
      sourceLine: 320,
    },
  },
  {
    id: 'p34-no-billing-hours-not-spent',
    clause: 'P34',
    text: {
      kind: 'todo',
      reason: 'Source text EXISTS at this line and needs transcription only.',
      sourceLine: 332,
    },
  },
  {
    id: 'billing',
    clause: 'Part 2 — Billing',
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only: bill the actual ' +
        'reduced time, or charge a flat fee agreed at the time of engagement. Reads ' +
        'against billing_models — HOURLY_BILLING_MODELS is the set this bites on.',
      sourceLine: 399,
    },
  },
]
