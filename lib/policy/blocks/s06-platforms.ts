// §6 Platforms and Systems — POLICY-ENGINE-MAP.md §11.2
//
// ⚠️ A GROUPING, not a heading Katy wrote. 21 of the 22 sections carry one of
// her headings; this is the exception, and it was flagged and explicitly
// approved at ratification (§11, fix 4).
//
// Sources: P10, P14 (per case_mgmt), P11 → ACTION LIST, P15 (G-Q1),
// P16 (per comms_platforms).

import { NONE_VALUE } from '@/lib/intake/questions'
import type { Block } from '@/lib/policy/types'

export const SECTION_6_BLOCKS: readonly Block[] = [
  {
    id: 'p10-case-mgmt-contractually-bound',
    clause: 'P10',
    when: { key: 'case_mgmt', not: NONE_VALUE },
    text: {
      kind: 'todo',
      reason: 'Source text EXISTS at this line and needs transcription only.',
      sourceLine: 282,
    },
  },
  {
    // G-A2 — eleven case management platforms. Until a platform's row in
    // .planning/policy-blocks.csv is researched and wired, this emits the named
    // generic block, which is why an unresearched vendor is harmless.
    id: 'p14-case-mgmt-per-platform',
    clause: 'P14',
    when: { key: 'case_mgmt', not: NONE_VALUE },
    text: { kind: 'perPlatform', answerKey: 'case_mgmt', sourceLine: 290 },
  },
  {
    id: 'p15-conflicts-checks',
    clause: 'P15',
    // Katy's Module C Q5 asked this and it was never built — G-Q1. The clause
    // text itself DOES exist, so this is a transcription away from working;
    // what is missing is the question that decides whether it applies.
    when: { key: 'case_mgmt', not: NONE_VALUE },
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only. Its own ' +
        'question is G-Q1 (does the platform run AI conflicts checks, and is the ' +
        'output independently verified) — approved for build, not yet built, so this ' +
        'currently gates on case_mgmt instead.',
      sourceLine: 292,
    },
  },
  {
    // G-A3 — five interoffice communication tools. Always present: every firm
    // answers comms_platforms, and `email_only` simply produces no platform
    // block (see NON_VENDOR_VALUES).
    id: 'p16-comms-per-platform',
    clause: 'P16',
    text: { kind: 'perPlatform', answerKey: 'comms_platforms', sourceLine: 294 },
  },
  {
    id: 'interoffice-communications',
    clause: 'Part 2 — interoffice communications',
    // `email_only` is the ABSENCE of an interoffice platform, not one of them
    // (see NON_VENDOR_VALUES). A firm that answered it has nothing for this
    // block to introduce, and without this condition it would be the only
    // content in §6 for a firm using no platforms at all.
    when: { key: 'comms_platforms', not: 'email_only' },
    text: {
      kind: 'todo',
      reason:
        'Katy wrote a bare list ("-interoffice communications (Telegram, Teams, Slack)"), ' +
        'not a clause. The substance is carried per-platform by P16 above.',
      sourceLine: 361,
    },
  },
]
