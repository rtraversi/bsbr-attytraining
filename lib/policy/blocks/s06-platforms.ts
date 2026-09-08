// §6 Platforms and Systems — POLICY-ENGINE-MAP.md §11.2
//
// ⚠️ A GROUPING, not a heading Katy wrote. 21 of the 22 sections carry one of
// her headings; this is the exception, and it was flagged and explicitly
// approved at ratification (§11, fix 4).
//
// Sources: P10, P15, P16, Part 2 interoffice communications.
//
// ── 🔴 THE GENERATED VENDOR PARAGRAPHS WERE REMOVED, 2026-09-04 (Max) ────────
//
// Until this change §6 and §7 emitted one composed paragraph per selected
// platform, from lib/policy/vendor-block.ts and the 20 rows in
// .planning/policy-blocks.csv. They are gone from the POLICY. Four reasons, and
// the first is the one that decided it:
//
//  1. KATY HAS NEVER READ THEM. They were the only generated rather than
//     transcribed text in lib/policy, and they were the text a firm was most
//     likely to act on. Nobody with a law licence had seen a word.
//  2. They imposed "obtain written confirmation". Katy's standard, in her own
//     line 356, is an EXPRESS AGREEMENT. Those are different tests.
//  3. They bundled "shall execute the data processing addendum" into the
//     no-training sentence. A DPA is not a no-training agreement. That is a
//     substantive error, not a wording one.
//  4. They asserted what a named vendor's terms said ON A DATE, inside the
//     firm's own legal document, where it goes stale silently. Of the 20
//     vendors researched, 15 came back "unclear" — so for most of them the
//     paragraph invented a duty out of our own uncertainty.
//
// What replaces them is Katy's own clause, naming the firm's actual platforms,
// so the policy stays firm-specific without us asserting anything about a
// vendor. The research is not wasted: it moves to the ACTION ITEMS, where being
// out of date is a stale to-do rather than a policy that misstates a vendor's
// terms. See .planning/POLICY-BUILD-SPEC-2026-09-04.md §1.
//
// ⚠️ Max rejected an earlier version of this that moved the whole section to the
// action list: "seems bloated tho... legal does not mean cumbersome". Stripping
// the vendor material entirely left §6 at two generic sentences, which is the
// opposite of what the product sells. Naming the platforms is the difference.

import { NONE_VALUE } from '@/lib/intake/questions'
import type { Block } from '@/lib/policy/types'

export const SECTION_6_BLOCKS: readonly Block[] = [
  {
    id: 'p10-case-mgmt-contractually-bound',
    clause: 'P10',
    // ── Katy's Q13/Q14 logic, built 2026-09-04 ────────────────────────────
    //
    // Her instruction: selecting a platform triggers a requirement to check
    // that training is not allowed, and "YES or UNSURE triggers the platform
    // requirement specific to that software".
    //
    // So the requirement follows whether the AI is SWITCHED ON, not merely
    // whether the firm has a platform. A firm running Clio with its AI features
    // off has nothing training on anything, and used to receive this clause
    // anyway.
    when: {
      all: [
        { key: 'case_mgmt', not: NONE_VALUE },
        { key: 'case_mgmt_ai', not: 'no' },
      ],
    },
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      // Her line 282 verbatim reads "Firm shall ensure that case management
      // platforms are contractually bound to ensure that training on data is
      // disabled." Two changes, both approved: the firm's own platforms are
      // named, and her doubled "ensure ... to ensure" becomes "so that".
      //
      // "the following" carries any count. "its platforms, Clio, are" would not.
      text:
        'Firm shall ensure that the following case management platforms are ' +
        'contractually bound so that training on data is disabled: [PLATFORMS].',
      sourceLine: 282,
      slots: [{ placeholder: '[PLATFORMS]', key: 'case_mgmt' }],
    },
  },
  {
    id: 'p15-conflicts-checks',
    clause: 'P15',
    // Katy's Module C Q5 asked this and it was never built — G-Q1. The clause
    // text itself DOES exist, so this is a transcription away from working;
    // what is missing is the question that decides whether it applies.
    when: { key: 'case_mgmt', not: NONE_VALUE },
    text: {
      kind: 'verbatim',
      text: 'All conflicts checks performed by AI will be independently verified.',
      sourceLine: 292,
    },
  },
  {
    id: 'interoffice-communications',
    clause: 'Part 2 — interoffice communications',
    // `email_only` is the ABSENCE of an interoffice platform, not one of them
    // (NON_VENDOR_VALUES in platform-block.ts already excludes it from vendor
    // generation, along with `none` and `general_llms`). A firm that answered it
    // has no platform for this clause to name.
    when: { key: 'comms_platforms', not: 'email_only' },
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      // Her line 361 is a bare list — "-interoffice communications (Telegram,
      // Teams, Slack)" — with no rule attached. The rule is the same one P10
      // states for case management platforms, so it is stated the same way.
      text:
        'Interoffice communication platforms with AI features, [COMMS ' +
        'PLATFORMS], shall not be used for client information unless those ' +
        'features are disabled, or the platform is contractually bound not to ' +
        'train on firm data.',
      sourceLine: 361,
      slots: [{ placeholder: '[COMMS PLATFORMS]', key: 'comms_platforms' }],
    },
  },
  {
    id: 'interoffice-email-only',
    clause: 'Part 2 — interoffice communications',
    // The firm answered email only. It still gets the rule, because it may adopt
    // a platform tomorrow, and its answer is stated rather than silently
    // producing an empty section.
    when: { key: 'comms_platforms', is: 'email_only' },
    text: {
      kind: 'drafted',
      approved: 'Max, 2026-09-04',
      text:
        'The firm uses email only for internal communication. Interoffice ' +
        'communication platforms with AI features shall not be used for client ' +
        'information unless those features are disabled, or the platform is ' +
        'contractually bound not to train on firm data.',
      sourceLine: 361,
    },
  },
]
