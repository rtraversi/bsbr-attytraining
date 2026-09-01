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
  regulatory_regimes: ['hipaa'],
  research_tools: ['cocounsel', 'general_llms'],
  case_mgmt: ['clio', 'smokeball'],
  comms_platforms: ['slack', 'teams'],
  tool_grid: [{ tool: 'chatgpt', noTraining: 'yes' }],
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
