// §13 Automations — POLICY-ENGINE-MAP.md §11.2
//
// 🔴 THIS SECTION HAS NO TRIGGER YET AND THEREFORE NEVER APPEARS.
//
// Part 2 carries a full AUTOMATIONS block (line 384) that has NO clause in
// Part 1 and no question anywhere in the intake — gap G-B5, question G-Q7.
// G-Q7 is approved for build (D3) and is one of the three new always-on
// questions, but it is out of scope for this batch.
//
// The condition below names `automations`, the key G-Q7 will add. That key does
// not exist in questions.ts today, so the condition is never satisfied and the
// section is omitted from every assembled policy. It is declared rather than
// left out so the spine states the intent, and so the day G-Q7 lands this
// section starts working with no structural change.
//
// See PENDING_QUESTION_KEYS in lib/policy/spine.ts — the invariant check knows
// this key is deliberately unbuilt and will fail on any OTHER unknown key.

import type { Block } from '@/lib/policy/types'

export const SECTION_13_BLOCKS: readonly Block[] = [
  {
    id: 'automations',
    clause: 'Part 2 — AUTOMATIONS',
    when: { key: 'automations', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only: the firm may ' +
        'build automations with AI-written code because client data is not shared, and ' +
        'may use third-party automations, provided they run locally and send client ' +
        'information only through an API or under a commercial confidentiality ' +
        'agreement. Blocked on G-Q7 for its trigger.',
      sourceLine: 384,
    },
  },
]
