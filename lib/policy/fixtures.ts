// =============================================================================
// Two example firms, and the ONE place they are defined.
//
// These were tests/policy-assemble.test.ts's local fixtures until the renderer
// needed them too. They are lifted here rather than copied because a copy is
// exactly the failure that matters: scripts/render-policy.mjs exists so a human
// can read what a firm actually receives, and a renderer fed a drifted copy of
// the fixtures would show a document the test suite never checked. One
// definition, two consumers.
//
// ⚠️ NOT PRODUCTION DATA AND NOT A SEED. Nothing in the app imports this — it is
// for the test suite and the renderer only. `firm_name` is Katy's firm because
// that is the name the source policy is written around; the roster addresses
// are `.test`, which is a reserved TLD and can never resolve.
//
// ── What the two are for ────────────────────────────────────────────────────
// They are the two ends of the branching, not two arbitrary firms. MINIMAL is
// the floor: whatever survives it is in EVERY policy, so it is what proves
// exclusion works. MAXIMAL takes nearly every branch, so it is what proves
// inclusion works. Rendering both is what makes the difference between them
// legible — the sections MINIMAL is missing are the conditional ones.
// =============================================================================

import { NONE_VALUE, NO_DRAFTING } from '@/lib/intake/questions'
import type { RosterRow } from '@/lib/intake/types'
import type { AnswerMap } from '@/lib/policy/types'

export const ATTORNEY: RosterRow = {
  name: 'A. Partner',
  email: 'partner@firm.test',
  isAttorney: true,
}

export const PARALEGAL: RosterRow = {
  name: 'P. Staff',
  email: 'staff@firm.test',
  isAttorney: false,
}

/**
 * A firm that answers "no" or "none" to everything optional.
 *
 * This is the floor: whatever survives here is in EVERY policy, so it is the
 * fixture that proves exclusion works.
 */
export const MINIMAL: AnswerMap = {
  firm_name: 'Chavez Law',
  roster: [ATTORNEY],
  jurisdictions: ['NC'],
  contract_attorneys: 'no',
  existing_policy: 'no',
  research_tools: [NONE_VALUE],
  case_mgmt: [NONE_VALUE],
  comms_platforms: ['email_only'],
  // ── Why the FLOOR firm has a grid at all (2026-09-04) ──────────────────────
  //
  // The grid derives its rows from ai_tools + case_mgmt + comms_platforms, and
  // comms_platforms is required with NO "none" option — `email_only` is a real
  // answer. So every firm that finishes the intake has at least one grid row,
  // and a MINIMAL that set none would be a fixture in a state no real firm can
  // submit. That is the exact trap that hid Katy's core no-training clause for
  // a day; see the note above ai_tools on MAXIMAL.
  //
  // `yes` because MINIMAL is the floor: whatever survives it is in EVERY
  // policy. A firm that HOLDS the agreement owes no follow-up, so this fixture
  // still proves an empty action item list, and every per-tool outcome is
  // exercised on MAXIMAL instead.
  tool_grid: [{ tool: 'email_only', noTraining: 'yes' }],
  regulatory_regimes: [NONE_VALUE],
  drafting_uses: [NO_DRAFTING],
  court_ai_orders: 'no',
  personal_devices: 'no',
  brainstorming: 'no',
  doc_review: 'no',
  client_ai: 'no',
  ai_marketing: 'no',
  hiring_ai: 'no',
  bill_ai_costs: 'no',
  retain_prompts: 'no',
  notetaker_stance: 'not_permitted',
  carrier_notified: 'yes',
}

/** A firm that takes nearly every branch. */
export const MAXIMAL: AnswerMap = {
  ...MINIMAL,
  roster: [ATTORNEY, PARALEGAL],
  jurisdictions: ['NC', 'FEDERAL'],
  contract_attorneys: 'yes',
  existing_policy: 'yes',
  regulatory_regimes: ['hipaa', 'gdpr'],
  research_tools: ['cocounsel', 'general_llms'],
  case_mgmt: ['clio', 'smokeball'],
  // Required since 2026-09-04: §6's platform clause follows Katy's Q13/Q14
  // logic and fires on yes OR not sure, not merely on having a platform. An
  // unanswered case_mgmt_ai fails the `not` condition (see the "is answered"
  // rule in lib/intake/types.ts) and the clause silently vanishes.
  case_mgmt_ai: 'yes',
  comms_platforms: ['slack', 'teams'],
  // 🔴 EVERY SOURCE QUESTION MUST BE SET ALONGSIDE tool_grid, AND THE GRID MUST
  // COVER ALL OF THEM. isAnswered() for a tool-grid derives its rows from
  // ai_tools + case_mgmt + comms_platforms (TOOL_GRID_SOURCES in
  // lib/intake/branching.ts) and requires EVERY derived row to be filled. A
  // fixture that misses one reports the grid UNANSWERED, and every block gated
  // on it silently vanishes — including Katy's core no-training clause at
  // source line 356. That cost a day on 2026-09-03, when the grid was set
  // without ai_tools and the empty preview was blamed on the condition
  // evaluator. A real firm cannot reach that state; a fixture can.
  //
  // So: case_mgmt above contributes clio and smokeball, comms_platforms
  // contributes slack and teams, and ai_tools contributes chatgpt. Five rows,
  // and all three outcomes are exercised — `yes` owes nothing, `no` and
  // `unknown` each raise their own per-tool action item.
  ai_tools: ['chatgpt'],
  tool_grid: [
    { tool: 'chatgpt', noTraining: 'yes' },
    { tool: 'clio', noTraining: 'no' },
    { tool: 'smokeball', noTraining: 'unknown' },
    { tool: 'slack', noTraining: 'no' },
    { tool: 'teams', noTraining: 'unknown' },
  ],
  prohibited_tools: 'DeepSeek',
  personal_devices: 'yes',
  drafting_uses: ['form', 'substantive'],
  drafting_client_data: 'client_data',
  drafting_foreign_language: 'yes',
  court_ai_orders: 'not_sure',
  brainstorming: 'yes',
  doc_review: 'yes',
  tar: 'yes',
  client_ai: 'yes',
  ai_marketing: 'yes',
  hiring_ai: 'yes',
  bill_ai_costs: 'yes',
  // Added 2026-09-07 with the questions themselves. MAXIMAL exists to take
  // nearly every branch, so a new question that nobody answers here silently
  // removes its whole section from the preview — which is exactly how §21 and
  // §13 came to be invisible.
  billing_models: ['hourly', 'flat_fee'],
  ai_time_adjustment: 'no',
  automations: 'yes',
  automations_location: 'third_party',
  marketing_use: 'yes',
  marketing_ways: ['artwork', 'written'],
  notetaker_stance: 'state_law',
  notetaker_scope: ['client', 'internal'],
  notetaker_tools: 'Otter.ai',
  vendor_security_contact: 'the office administrator',
  discipline:
    'a verbal warning for a first violation, a written warning for a second, and ' +
    'suspension of AI tool access or termination for repeated or serious violations',
  discipline_owner: 'The managing partner',
  hiring_states: ['NC', 'CA', 'OUTSIDE_US'],
  doc_review_scale: 'regular',
}

/**
 * The fixtures by name, for callers that take one on a command line.
 *
 * Keys are lower case because that is what a human types. Adding a fixture here
 * makes it renderable without touching the renderer.
 */
export const FIXTURES: Readonly<Record<string, AnswerMap>> = {
  minimal: MINIMAL,
  maximal: MAXIMAL,
}

export const FIXTURE_NAMES: readonly string[] = Object.keys(FIXTURES)
