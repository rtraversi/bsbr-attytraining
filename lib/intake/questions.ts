// =============================================================================
// Policy intake — the question set.
//
// The authority for this file is .planning/intake-spec.md, which carries the
// same questions with the decision and attribution behind each one. If the two
// disagree, the spec is right and this file is a bug.
//
// ── Two rules that shape every entry ────────────────────────────────────────
//
// NO HEDGE OPTIONS (Katy, 2026-08-25: "If a firm does an action then they need
// a policy for it"). There is no "sometimes", no "it depends", no "N/A". Where
// a third state exists it is because it is a REAL state that changes what gets
// drafted — case_mgmt_ai's "not sure" puts an instruction in the policy to go
// and confirm the setting, and the tool grid's "don't know" does the same. Do
// not add a soft option to a yes/no to make it feel gentler; that is exactly
// the thing that was ruled out.
//
// EVERY QUESTION EARNS ITS PLACE. It earns it by telling Katy something she can
// act on, or by saving her a round-trip with the firm. Nothing else. Practice
// areas was cut on that test (Katy, 2026-08-26), and firm size band and the
// non-attorney headcount were cut because the roster already carries both.
//
// ── Ordering ────────────────────────────────────────────────────────────────
//
// QUESTIONS is ordered, and the order is the order the firm walks. Sections are
// CONTIGUOUS in that order, which is a requirement rather than tidiness: the
// tab strip renders progress per section, and a section the firm re-enters
// three questions later reads as going backwards.
//
// That contiguity is why billing (module P) and client-use (module T) sit
// together ahead of hiring (N) and discipline (S), where the spec's table lists
// them P, S, T interleaved with N. Same questions, same keys, grouped so the
// strip is honest.
//
// A showIf may only name a question that comes EARLIER here. That invariant is
// what lets visibleQuestions() be one forward pass; it is enforced below by
// assertQuestionSetInvariants(), not left to review.
// =============================================================================

import type { Question, QuestionOption } from './types'


// ---------------------------------------------------------------------------
// US jurisdictions — ONE list, shared
// ---------------------------------------------------------------------------
//
// Used by BOTH `jurisdictions` and `hiring_states`. Deliberately not duplicated:
// two copies drift, and the second copy is always the one that is missing a
// territory when somebody needs it.
//
// Codes are what get stored. The spec's correction #3 is the whole argument —
// jurisdiction was free text and came back as "NC", "N.C." and "North Carolina"
// for one answer, and jurisdiction is the switch that matters most in the
// drafted policy.
//
// Territories are in because attorneys are genuinely licensed there and a
// picker that cannot express the answer forces a wrong one.

export const US_STATES: readonly QuestionOption[] = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'VI', label: 'U.S. Virgin Islands' },
  { value: 'GU', label: 'Guam' },
  { value: 'AS', label: 'American Samoa' },
  { value: 'MP', label: 'Northern Mariana Islands' },
] as const

/** Extra entry on `jurisdictions` only — federal admission is not a state. */
export const FEDERAL_OPTION: QuestionOption = { value: 'FEDERAL', label: 'Federal courts' }

/** Extra entry on `hiring_states` only. Routes the same way a US state does. */
export const OUTSIDE_US_OPTION: QuestionOption = { value: 'OUTSIDE_US', label: 'Outside the US' }


// ---------------------------------------------------------------------------
// Option lists
// ---------------------------------------------------------------------------

/** The shared "None" value on the multi-selects that offer one. */
const NONE_VALUE_LITERAL = 'none'

const AI_TOOL_OPTIONS: QuestionOption[] = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'copilot', label: 'Microsoft Copilot' },
  { value: 'cocounsel', label: 'CoCounsel' },
  { value: 'westlaw_edge', label: 'Westlaw Edge' },
  { value: 'lexis_plus_ai', label: 'Lexis+ AI' },
  { value: 'harvey', label: 'Harvey' },
  { value: 'spellbook', label: 'Spellbook' },
  { value: 'draftwise', label: 'DraftWise' },
  { value: 'otter_ai', label: 'Otter.ai' },
  // A firm that has just bought an AI policy BECAUSE it is about to start is a
  // real customer, and until this existed they could not get past question 6:
  // ai_tools is required and had no "none", while research_tools, case_mgmt and
  // regulatory_regimes all did. Approved by Max 2026-08-26.
  //
  // Not a hedge in Katy's sense — it is not "I don't know", it is a firm stating
  // that today the answer is nothing, which is a policy written forward rather
  // than a policy written around existing practice.
  { value: 'none_yet', label: 'None yet' },
]

/**
 * Options that mean "and nothing else". Ticking one clears every other choice
 * in its question, and ticking any other choice clears it.
 *
 * Without this a firm can hold "None" and "Clio" at once, which is not an
 * answer — it is two answers, and Katy has to write and ask which one is true.
 */
export const EXCLUSIVE_OPTION_VALUES: ReadonlySet<string> = new Set([NONE_VALUE_LITERAL, 'none_yet'])

// Module B. Distinct from AI_TOOL_OPTIONS on purpose even where the names
// overlap: Q6 asks what the firm HAS, Q10 asks what it RESEARCHES WITH, and a
// firm can hold a CoCounsel licence nobody uses for research.
const RESEARCH_TOOL_OPTIONS: QuestionOption[] = [
  { value: 'cocounsel', label: 'CoCounsel' },
  { value: 'lexis_plus_ai', label: 'Lexis+ AI' },
  { value: 'vincent_ai', label: 'Vincent AI' },
  { value: 'ask_practical_law', label: 'Ask Practical Law' },
  { value: 'westlaw_edge', label: 'Westlaw Edge' },
  { value: 'general_llms', label: 'General-purpose LLMs' },
  { value: 'none', label: 'None' },
]

// Module C. The spec records that Katy's list here was the legal-research list
// pasted by mistake; Clio missing from a case-management list was the tell.
// These are real practice management platforms.
const CASE_MGMT_OPTIONS: QuestionOption[] = [
  { value: 'clio', label: 'Clio' },
  { value: 'mycase', label: 'MyCase' },
  { value: 'practicepanther', label: 'PracticePanther' },
  { value: 'smokeball', label: 'Smokeball' },
  { value: 'filevine', label: 'Filevine' },
  { value: 'actionstep', label: 'Actionstep' },
  { value: 'litify', label: 'Litify' },
  { value: 'rocket_matter', label: 'Rocket Matter' },
  { value: 'cosmolex', label: 'CosmoLex' },
  { value: 'neos', label: 'Neos' },
  { value: 'monday', label: 'Monday.com' },
  { value: 'none', label: 'None' },
]

const COMMS_OPTIONS: QuestionOption[] = [
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'slack', label: 'Slack' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'signal', label: 'Signal' },
  { value: 'email_only', label: 'Email only' },
]

const REGIME_OPTIONS: QuestionOption[] = [
  { value: 'hipaa', label: 'HIPAA' },
  { value: 'gdpr', label: 'GDPR' },
  { value: 'glba', label: 'GLBA' },
  { value: 'ccpa', label: 'CCPA / CPRA' },
  { value: 'ferpa', label: 'FERPA' },
  { value: 'none', label: 'None' },
]

// Described rather than numeric, because a numeric threshold nobody defined
// produces noise: two firms would read "over 500 documents" differently and
// Katy would have to ask both what they meant.
const DOC_REVIEW_SCALE_OPTIONS: QuestionOption[] = [
  { value: 'occasional', label: 'Occasional: a few matters a year' },
  { value: 'regular', label: 'Regular: most matters' },
  { value: 'ediscovery', label: 'Large-scale e-discovery' },
]

// Module M. Two questions, not one. The spec records that Katy's refined list
// merged the consent regime and the meeting type into a single select, so its
// options overlapped and its branch tested for a NO that did not exist among
// them. This is the consent regime only.
const NOTETAKER_STANCE_OPTIONS: QuestionOption[] = [
  { value: 'not_permitted', label: 'Not permitted at all' },
  { value: 'all_consent', label: "Permitted only with everyone's consent, whatever the state allows" },
  { value: 'state_law', label: 'Permitted per the consent law of the state involved' },
]

const NOTETAKER_SCOPE_OPTIONS: QuestionOption[] = [
  { value: 'internal', label: 'Internal meetings' },
  { value: 'client', label: 'Client meetings' },
  { value: 'proceedings', label: 'Depositions or hearings where permitted' },
]

const YES_NO_NOT_SURE: QuestionOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not sure' },
]

// Module D. Katy's list has these as THREE separate yes/no questions (form,
// substantive, boilerplate). Merged into one multi-select, and the merge is a
// correction to record rather than a liberty:
//
//   - Nothing is lost. Each of her three is a stable option value, so the export
//     still reads "substantive: yes" and the three policy triggers stay distinct
//     — the drafted policy handles form, content and boilerplate separately, and
//     Katy's own policy-elements list keeps them apart.
//   - Her implementation note asks for "a single Y/N gate question per module"
//     so a solo sees 10–15 questions. Three unconditional yes/nos is the shape
//     that note exists to prevent, and this is the module's gate.
//   - `none` is the escape, and it is in EXCLUSIVE_OPTION_VALUES, so ticking it
//     clears the rest.
const DRAFTING_USE_OPTIONS: QuestionOption[] = [
  { value: 'form', label: 'Routine or form documents: emails, cover letters, notices' },
  { value: 'substantive', label: 'Substantive content: complaints, motions, briefs, contracts' },
  { value: 'boilerplate', label: 'Boilerplate: deeds, trusts, standard agreements' },
  { value: NONE_VALUE_LITERAL, label: 'None' },
]

// Module D, and the one place Katy's 2026-08-20 list and her 2026-08-25 ruling
// genuinely collide. Her list offers "Always client data / Sometimes / Never —
// templates only". "Sometimes" is exactly the hedge she killed five days later:
// "Eliminate all sometimes options. If a firm does an action then they need a
// policy for it." The later ruling wins, and the two states left are the two
// that draft differently — a firm that sometimes puts client data in is a firm
// whose policy must assume client data.
//
// A `single` and not a `yesno`, even at two options, because the labels ARE the
// question. "Yes / No" against "does drafting involve client data" loses which
// way round the safe answer is.
const CLIENT_DATA_OPTIONS: QuestionOption[] = [
  { value: 'client_data', label: 'Actual client-identifying information goes in' },
  { value: 'templates_only', label: 'Generic or template variables only' },
]

// Module J. "Sometimes" survives here and is NOT a hedge: it is not a way of
// avoiding the question, it IS the consequential answer. Katy's own note —
// "flags a compliance gap if the latter" — is what the second option produces.
const BRAINSTORM_TIER_OPTIONS: QuestionOption[] = [
  { value: 'no_training_only', label: 'Only paid or API-tier tools under a no-training agreement' },
  { value: 'consumer_tier', label: 'Sometimes on consumer-tier tools' },
]

// Module Q. No `none` — every firm bills somehow — so the escape on this
// unconditional required multi-select is `allowOther`, for the models nobody
// listed (subscription, hybrid-contingency, pro bono only).
const BILLING_MODEL_OPTIONS: QuestionOption[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'flat_fee', label: 'Flat fee' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'contingency', label: 'Contingency' },
]

// Module D, foreign language. Same branch as the client-data question above,
// and deliberately the same two values so Katy reads one axis in the export.
const FOREIGN_CONTENT_OPTIONS: QuestionOption[] = [
  { value: 'client_data', label: 'Client-specific content' },
  { value: 'templates_only', label: 'Template-based content' },
]

/** The `not permitted` value, exported so the branch below and its tests agree. */
export const NOTETAKER_NOT_PERMITTED = 'not_permitted'

/** "None yet" on ai_tools. Hides the tool grid; see that question's showIf. */
export const NO_TOOLS_YET = 'none_yet'

/** Module D's gate value. Hides every drafting detail question. */
export const NO_DRAFTING = NONE_VALUE_LITERAL

/**
 * Module E's gate value — the answer that skips the module.
 *
 * The branch is `not 'no'`, so BOTH "yes" and "not sure" open the detail. That
 * is Katy's instruction and not a convenience: "if Unsure, policy should include
 * an instruction to check standing orders before each filing rather than
 * assume." A firm that does not know needs the process question more than a firm
 * that does.
 */
export const NO_COURT_AI_ORDERS = 'no'

/**
 * Module Q's gate. The time-adjustment question follows the HOURS, not the
 * label — `hybrid` contains hourly work, so a hybrid firm has the same problem
 * an hourly firm has and Katy's "if hourly" reaches it.
 *
 * Flat fee and contingency are excluded because the question cannot be answered
 * there: there is no billed time to adjust.
 */
export const HOURLY_BILLING_MODELS: readonly string[] = ['hourly', 'hybrid']

/**
 * The questions the spec types as "text or 'not decided yet'".
 *
 * They get a visible affordance that writes NOT_DECIDED_YET, rather than the
 * firm typing the words — Katy's export has to tell "the firm has not taken a
 * position" apart from "a firm wrote a sentence that mentions not deciding",
 * because those two draft differently.
 */
export const NOT_DECIDED_QUESTIONS: ReadonlySet<string> = new Set([
  'discipline',
  'client_ai_approach',
])

/** The shared "None" value on the multi-selects that offer one. */
export const NONE_VALUE = NONE_VALUE_LITERAL


// ---------------------------------------------------------------------------
// The set
// ---------------------------------------------------------------------------

export const QUESTIONS: readonly Question[] = [
  // ── Firm ──────────────────────────────────────────────────────────────────
  {
    key: 'firm_name',
    section: 'firm',
    module: null,
    prompt: 'What is the name of the firm to be accredited?',
    type: 'text',
    required: true,
  },
  {
    // One screen, not one question per person — the only place the intake shows
    // a table. The admin is row one, pre-filled from their account, and their
    // own attorney answer is what decides whether they occupy a seat.
    key: 'roster',
    section: 'firm',
    module: '0',
    prompt: 'Everyone at the firm: name, email, and whether they are an attorney.',
    // Kept in the 2026-09-02 help-text purge, deliberately. It is not editorial:
    // the name typed here is what gets printed on a permanent certificate, so
    // this is a formatting instruction that changes the answer (Max: "restore
    // ok thats why i said only necessary ones").
    help: 'Write each name exactly as it should appear on that person’s certification. Non-attorney staff take the training; everyone signs the attestation.',
    type: 'roster',
    required: true,
  },
  {
    key: 'jurisdictions',
    section: 'firm',
    module: '0',
    prompt: "Every US jurisdiction where the firm's attorneys are licensed.",
    type: 'states',
    options: [FEDERAL_OPTION],
    required: true,
  },
  {
    key: 'contract_attorneys',
    section: 'firm',
    module: 'G',
    prompt: 'Does the firm work with contract or of-counsel attorneys?',
    type: 'yesno',
    required: true,
  },
  {
    key: 'existing_policy',
    section: 'firm',
    module: '0',
    prompt: 'Does the firm have any AI policy in place today?',
    type: 'yesno',
    required: true,
  },
  {
    // Optional even when shown: a firm may know it has a policy without having
    // the file to hand, and blocking the whole intake on a missing attachment
    // would be a worse outcome than drafting without it.
    key: 'existing_policy_file',
    section: 'firm',
    module: '0',
    prompt: 'Upload it, if you have it to hand.',
    help: 'PDF or Word, up to 10 MB. A person reads it. It is never scanned or parsed.',
    type: 'upload',
    required: false,
    showIf: { key: 'existing_policy', is: 'yes' },
  },

  // ── Tools (Module A) ──────────────────────────────────────────────────────
  {
    key: 'ai_tools',
    section: 'tools',
    module: 'A',
    prompt: 'Which AI tools does the firm use, or want to use?',
    type: 'multi',
    options: AI_TOOL_OPTIONS,
    allowOther: true,
    required: true,
  },
  {
    key: 'tool_grid',
    section: 'tools',
    module: 'A',
    prompt: 'For each tool, is there a signed agreement that the vendor will not train on your data?',
    // Says why the tier question is gone, at the point somebody would expect to
    // be asked it. The agreement is the fact; the tier was a guess at the fact.
    help: 'The agreement decides this, not the price tier. A consumer plan with a signed addendum counts, and an enterprise plan without one does not.',
    type: 'tool-grid',
    required: true,
    // Two conditions, not one. "Answered" alone would show an empty grid to a
    // firm whose only answer is "None yet" — a table with no rows, required and
    // unanswerable, which is a dead end on the screen after the one that caused
    // it. toolGridTools() drops none_yet as well, so the two agree.
    showIf: {
      all: [
        { key: 'ai_tools', answered: true },
        { key: 'ai_tools', not: NO_TOOLS_YET },
      ],
    },
  },
  {
    key: 'prohibited_tools',
    section: 'tools',
    module: 'A',
    prompt: 'Any tools the firm wants to prohibit by name?',
    type: 'text',
    required: false,
  },
  {
    key: 'personal_devices',
    section: 'tools',
    module: 'A',
    prompt: 'Does the firm ever allow personal devices or personal AI accounts to touch client information?',
    type: 'yesno',
    required: true,
  },

  // ── Systems (Modules B, C) ────────────────────────────────────────────────
  {
    key: 'research_tools',
    section: 'systems',
    module: 'B',
    prompt: 'Which AI-assisted legal research tools does the firm use?',
    type: 'multi',
    options: RESEARCH_TOOL_OPTIONS,
    required: true,
  },
  {
    key: 'case_mgmt',
    section: 'systems',
    module: 'C',
    prompt: 'What case or practice management platforms does the firm use?',
    type: 'multi',
    options: CASE_MGMT_OPTIONS,
    allowOther: true,
    required: true,
  },
  {
    // "not sure" is deliberate and is not a hedge: it is a real state that puts
    // an instruction in the policy to have someone confirm and document the
    // setting. A firm that does not know whether its platform's AI is on is in
    // a different position from one that knows it is off.
    key: 'case_mgmt_ai',
    section: 'systems',
    module: 'C',
    prompt: "Are the platform's built-in AI features switched on?",
    type: 'single',
    options: YES_NO_NOT_SURE,
    required: true,
    showIf: { key: 'case_mgmt', not: NONE_VALUE },
  },

  // ── Drafting (Module D) ───────────────────────────────────────────────────
  //
  // Katy's gate model, applied: one question everyone answers, four that only a
  // firm which drafts with AI ever sees. A firm that ticks "None" pays one
  // question for the whole module.
  {
    key: 'drafting_uses',
    section: 'drafting',
    module: 'D',
    prompt: 'What does the firm use AI to draft?',
    type: 'multi',
    options: DRAFTING_USE_OPTIONS,
    required: true,
  },
  {
    key: 'drafting_client_data',
    section: 'drafting',
    module: 'D',
    prompt: 'Does that drafting work involve actual client information?',
    type: 'single',
    options: CLIENT_DATA_OPTIONS,
    required: true,
    showIf: { key: 'drafting_uses', not: NO_DRAFTING },
  },
  {
    key: 'drafting_foreign_language',
    section: 'drafting',
    module: 'D',
    prompt: 'Does the firm need AI for foreign-language drafting or translation?',
    help: 'For example, a client email written for a Greek-speaking recipient, or a document for filing.',
    type: 'yesno',
    required: true,
    showIf: { key: 'drafting_uses', not: NO_DRAFTING },
  },
  {
    key: 'foreign_language_content',
    section: 'drafting',
    module: 'D',
    prompt: 'Is that translated content client-specific, or template-based?',
    type: 'single',
    options: FOREIGN_CONTENT_OPTIONS,
    required: true,
    showIf: { key: 'drafting_foreign_language', is: 'yes' },
  },
  {
    key: 'foreign_languages',
    section: 'drafting',
    module: 'D',
    prompt: 'Which languages?',
    help: 'Start typing to filter. Pick every language the firm produces output in.',
    // Was `text` until 2026-09-02. See LANGUAGES for why.
    type: 'languages',
    required: true,
    showIf: { key: 'drafting_foreign_language', is: 'yes' },
  },

  // ── Courts (Modules D, E) ─────────────────────────────────────────────────
  //
  // filing_courts carries module D, which is where Katy lists it, but it sits
  // here because it is a courts question and her own note says it "feeds Module
  // E". Module letter and section are independent fields, and grouping by what
  // the firm is being asked about is the same call already made for P and T.
  //
  // It is OPTIONAL, unlike everything else added in this batch: a transactional
  // firm files with nobody, and a required free-text field it cannot answer is
  // a dead end rather than a question.
  {
    key: 'filing_courts',
    section: 'courts',
    module: 'D',
    prompt: 'What courts or agencies does the firm file with regularly?',
    type: 'text',
    required: false,
  },
  {
    key: 'court_ai_orders',
    section: 'courts',
    module: 'E',
    prompt: 'Do any courts or judges the firm appears before require filings to certify whether AI was used?',
    type: 'single',
    options: YES_NO_NOT_SURE,
    required: true,
  },
  {
    key: 'standing_order_check',
    section: 'courts',
    module: 'E',
    prompt: 'Does the firm have a standard process for confirming current standing orders before filing in a new judge’s court?',
    type: 'yesno',
    required: true,
    showIf: { key: 'court_ai_orders', not: NO_COURT_AI_ORDERS },
  },
  {
    key: 'court_cert_template',
    section: 'courts',
    module: 'E',
    prompt: 'Should the policy include a default certification statement for filings, to be adapted per court?',
    type: 'yesno',
    required: true,
    showIf: { key: 'court_ai_orders', not: NO_COURT_AI_ORDERS },
  },

  // ── Data (Modules H, I, J, K, L) ──────────────────────────────────────────
  {
    key: 'comms_platforms',
    section: 'data',
    module: 'H',
    prompt: 'What does the firm use for internal communication?',
    type: 'multi',
    options: COMMS_OPTIONS,
    allowOther: true,
    required: true,
  },
  {
    key: 'regulatory_regimes',
    section: 'data',
    module: 'H',
    prompt: 'Does the firm handle data under any regime beyond state bar rules?',
    type: 'multi',
    options: REGIME_OPTIONS,
    required: true,
  },
  {
    // Module I. UNGATED, and that is the decision rather than an omission.
    // Katy's implementation note names E, L, N, R and V as the modules a small
    // firm skips; I is not among them, because any firm with a single vendor
    // has this exposure. A "no" is not a skip here — her note says a missing
    // protocol is "a gap the generated policy should flag rather than silently
    // fill with generic language", so the no answer is the one that changes the
    // draft most.
    key: 'vendor_incident_protocol',
    section: 'data',
    module: 'I',
    prompt: 'If an AI vendor disclosed a breach involving client information, does the firm have a notification protocol?',
    help: 'Who gets told, and in what order: client, malpractice carrier, state bar.',
    type: 'yesno',
    required: true,
  },
  {
    // Also ungated, deliberately. Gating it behind a "yes" above would drop the
    // question for exactly the firm that has no protocol — and a named person
    // to receive vendor security notices is the first line of the protocol that
    // firm is about to be told to write.
    key: 'vendor_security_contact',
    section: 'data',
    module: 'I',
    prompt: 'Who at the firm receives vendor security notices?',
    help: 'A role is enough: “managing partner”, “office administrator”.',
    type: 'text',
    required: true,
  },
  {
    key: 'brainstorming',
    section: 'data',
    module: 'J',
    prompt: 'Does the firm use AI to brainstorm strategy, arguments or theories tied to a specific, identifiable matter?',
    type: 'yesno',
    required: true,
  },
  {
    key: 'brainstorming_tier',
    section: 'data',
    module: 'J',
    prompt: 'On which tier of tool?',
    type: 'single',
    options: BRAINSTORM_TIER_OPTIONS,
    required: true,
    showIf: { key: 'brainstorming', is: 'yes' },
  },
  {
    key: 'doc_review',
    section: 'data',
    module: 'K',
    prompt: 'Does the firm use AI to review discovery or documents, or to summarise long records?',
    type: 'yesno',
    required: true,
  },
  {
    key: 'doc_review_scale',
    section: 'data',
    module: 'K',
    prompt: 'Roughly what scale?',
    type: 'single',
    options: DOC_REVIEW_SCALE_OPTIONS,
    required: true,
    showIf: { key: 'doc_review', is: 'yes' },
  },
  {
    key: 'tar',
    section: 'data',
    module: 'L',
    prompt: 'Does the litigation practice use technology-assisted review or predictive coding?',
    type: 'yesno',
    required: true,
    showIf: { key: 'doc_review', is: 'yes' },
  },

  // ── Records (Module U) ────────────────────────────────────────────────────
  //
  // Katy: "a record-keeping/work-product question, distinct from
  // confidentiality." Its own section for that reason — `data` asks what leaves
  // the firm and who touches it; this asks what the firm keeps.
  {
    key: 'retain_prompts',
    section: 'records',
    module: 'U',
    prompt: 'Are prompts and AI-generated drafts kept as part of the client file?',
    type: 'yesno',
    required: true,
  },
  {
    key: 'retention_schedule',
    section: 'records',
    module: 'U',
    prompt: 'For how long, and on what schedule?',
    type: 'longtext',
    required: true,
    showIf: { key: 'retain_prompts', is: 'yes' },
  },

  // ── Meetings (Module M) ───────────────────────────────────────────────────
  {
    key: 'notetaker_stance',
    section: 'meetings',
    module: 'M',
    prompt: "The firm's position on AI notetakers.",
    type: 'single',
    options: NOTETAKER_STANCE_OPTIONS,
    required: true,
  },
  {
    key: 'notetaker_scope',
    section: 'meetings',
    module: 'M',
    prompt: 'Where are they used?',
    type: 'multi',
    options: NOTETAKER_SCOPE_OPTIONS,
    required: true,
    showIf: { key: 'notetaker_stance', not: NOTETAKER_NOT_PERMITTED },
  },
  {
    key: 'notetaker_tools',
    section: 'meetings',
    module: 'M',
    prompt: 'Which notetaker is approved?',
    type: 'text',
    required: true,
    showIf: { key: 'notetaker_stance', not: NOTETAKER_NOT_PERMITTED },
  },

  // ── Clients (Modules P, Q, T) ─────────────────────────────────────────────
  {
    key: 'bill_ai_costs',
    section: 'clients',
    module: 'P',
    prompt: 'Does the firm want to bill clients directly for the cost of AI tools?',
    type: 'yesno',
    required: true,
  },
  {
    key: 'billing_models',
    section: 'clients',
    module: 'Q',
    prompt: 'How does the firm bill?',
    type: 'multi',
    options: BILLING_MODEL_OPTIONS,
    allowOther: true,
    required: true,
  },
  {
    // Katy's "if hourly". A no is a real answer and the one that matters: her
    // note asks that it be flagged as "a policy gap requiring a firm decision,
    // not just boilerplate", because an attorney may not bill hourly time that
    // was not actually spent.
    key: 'ai_time_adjustment',
    section: 'clients',
    module: 'Q',
    prompt: 'Is there a process for adjusting billed time when AI finishes a task faster?',
    type: 'yesno',
    required: true,
    showIf: { key: 'billing_models', includesAny: [...HOURLY_BILLING_MODELS] },
  },
  {
    key: 'client_ai',
    section: 'clients',
    module: 'T',
    prompt: "Should the policy address clients using AI to second-guess the firm's work?",
    type: 'yesno',
    required: true,
  },
  {
    key: 'client_ai_approach',
    section: 'clients',
    module: 'T',
    prompt: 'How would the firm like that handled?',
    type: 'longtext',
    required: true,
    showIf: { key: 'client_ai', is: 'yes' },
  },

  // ── Marketing (Module V) ──────────────────────────────────────────────────
  //
  // Katy: "a genuinely separate compliance lane: specialization claims,
  // guarantees, and 'results' language in AI-generated marketing content
  // implicate advertising rules, not confidentiality or hallucination risk."
  // Its own section for that reason, and one of the five she expects a small
  // firm to skip — which costs them exactly one question.
  {
    key: 'ai_marketing',
    section: 'marketing',
    module: 'V',
    prompt: 'Does the firm use AI to draft website copy, blog posts, social media or advertisements?',
    type: 'yesno',
    required: true,
  },
  {
    key: 'marketing_review',
    section: 'marketing',
    module: 'V',
    prompt: 'Does someone review that content against attorney advertising rules before it goes out?',
    help: 'No guarantees, no unsubstantiated specialization claims, required disclaimers.',
    type: 'yesno',
    required: true,
    showIf: { key: 'ai_marketing', is: 'yes' },
  },

  // ── Staff (Modules F, N, S) ───────────────────────────────────────────────
  {
    // Module F. Katy: "if Y, flag for a human conversation, since it touches the
    // 'would not be competent without AI' rule." A yes is not a branch here — it
    // is a note on the drafter's desk, because the answer routes to a
    // conversation rather than to another question.
    key: 'ai_practice_expansion',
    section: 'staff',
    module: 'F',
    prompt: 'Is the firm considering taking on work it would not take on without AI tools?',
    type: 'yesno',
    required: true,
  },
  {
    // Module F, and ungated like its sibling. Katy marks the module "usually
    // universal language, but confirm scope" — universal is the answer, so
    // neither question hides.
    key: 'cle_process',
    section: 'staff',
    module: 'F',
    prompt: 'Does the firm already track CLE or competency in some way?',
    type: 'yesno',
    required: true,
  },
  {
    // A yes routes to separate compliance counsel rather than a drafted clause.
    // The drafted policy is explicit that no standard policy can be provided
    // here — automated hiring law is state and city specific and moving.
    key: 'hiring_ai',
    section: 'staff',
    module: 'N',
    prompt: 'Does the firm use, or want to use, AI to screen job applicants?',
    type: 'yesno',
    required: true,
  },
  {
    key: 'hiring_states',
    section: 'staff',
    module: 'N',
    prompt: 'Where might applicants be based?',
    type: 'states',
    options: [OUTSIDE_US_OPTION],
    required: true,
    showIf: { key: 'hiring_ai', is: 'yes' },
  },
  {
    key: 'discipline',
    section: 'staff',
    module: 'S',
    prompt: 'How should violations of this policy be handled?',
    type: 'longtext',
    required: true,
  },

  // ── History (Modules O, R) — Katy's eyes only ─────────────────────────────
  //
  // sensitive: true routes these to intake_sensitive, which has RLS on and no
  // policy at all (migration 0028), so nothing but a service-role route reads
  // them. They are otherwise ordinary questions: always visible, always
  // required, no branch.
  //
  // Known and accepted (raised with Katy 2026-08-26, she kept both): restricting
  // who can READ these does not make them privileged and does not put them
  // beyond a subpoena.
  {
    key: 'prior_ai_error',
    section: 'history',
    module: 'O',
    prompt: 'Has the firm had an incident involving AI-generated error in a filing?',
    help: 'Seen only by the attorney drafting your policy. It is never shown in your dashboard and never included in anything sent to your staff.',
    type: 'yesno',
    required: true,
    sensitive: true,
  },
  {
    key: 'carrier_notified',
    section: 'history',
    module: 'R',
    prompt: 'Has the malpractice carrier been told the firm uses AI tools, where the application asks?',
    help: 'Seen only by the attorney drafting your policy.',
    type: 'single',
    options: YES_NO_NOT_SURE,
    required: true,
    sensitive: true,
  },
] as const

/** Every question by key. Built once. */
export const QUESTIONS_BY_KEY: ReadonlyMap<string, Question> = new Map(
  QUESTIONS.map((q) => [q.key, q]),
)

export function getQuestion(key: string): Question | undefined {
  return QUESTIONS_BY_KEY.get(key)
}

/** The full option list a `states` question renders: US_STATES plus its extras. */
export function stateOptionsFor(question: Question): QuestionOption[] {
  return [...US_STATES, ...(question.options ?? [])]
}

/**
 * The languages a firm can name for translation review.
 *
 * ── Why a list and not free text ────────────────────────────────────────────
 *
 * `foreign_languages` was `type: 'text'` until 2026-09-02. Max, walking the
 * intake in a browser: "best to have a list and not free text ... bc they can
 * 100 just type, idk lol, like i am going to do rn." The answer names the
 * languages in a policy clause, so free text puts whatever someone types into a
 * legal document.
 *
 * ── What is in it ───────────────────────────────────────────────────────────
 *
 * 95 entries: the languages with meaningful US speaker counts, ordered by US
 * prevalence rather than alphabetically, so the ones a firm is most likely to
 * want are the ones it sees before typing anything. Hardcoded rather than
 * pulled from a package — it ships to a Worker, it does not change, and a
 * dependency for 95 strings is not worth the bundle. Same call, and the same
 * shape, as US_STATES above.
 *
 * Values are ISO 639 codes where one exists. They are stored, so DO NOT renumber
 * or repurpose one: a stored answer would silently become a different language.
 *
 * A firm serving a language that is not here uses the "Other" write-in, which
 * is a deliberate narrow exception rather than the default (Max, 2026-09-02:
 * "95 fine. other with free text is fine.").
 */
export const LANGUAGES: readonly QuestionOption[] = [
  { value: 'es', label: 'Spanish' },
  { value: 'zh-cmn', label: 'Chinese, Mandarin' },
  { value: 'zh-yue', label: 'Chinese, Cantonese' },
  { value: 'tl', label: 'Tagalog' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'fr', label: 'French' },
  { value: 'ko', label: 'Korean' },
  { value: 'ru', label: 'Russian' },
  { value: 'ht', label: 'Haitian Creole' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'pl', label: 'Polish' },
  { value: 'ur', label: 'Urdu' },
  { value: 'ja', label: 'Japanese' },
  { value: 'fa', label: 'Persian (Farsi)' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'bn', label: 'Bengali' },
  { value: 'te', label: 'Telugu' },
  { value: 'ta', label: 'Tamil' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'hy', label: 'Armenian' },
  { value: 'he', label: 'Hebrew' },
  { value: 'km', label: 'Khmer' },
  { value: 'hmn', label: 'Hmong' },
  { value: 'th', label: 'Thai' },
  { value: 'lo', label: 'Lao' },
  { value: 'nv', label: 'Navajo' },
  { value: 'am', label: 'Amharic' },
  { value: 'so', label: 'Somali' },
  { value: 'ne', label: 'Nepali' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'ro', label: 'Romanian' },
  { value: 'el', label: 'Greek' },
  { value: 'nl', label: 'Dutch' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'cs', label: 'Czech' },
  { value: 'sk', label: 'Slovak' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'sq', label: 'Albanian' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'tr', label: 'Turkish' },
  { value: 'sw', label: 'Swahili' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'kn', label: 'Kannada' },
  { value: 'si', label: 'Sinhala' },
  { value: 'my', label: 'Burmese' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ms', label: 'Malay' },
  { value: 'mn', label: 'Mongolian' },
  { value: 'ps', label: 'Pashto' },
  { value: 'prs', label: 'Dari' },
  { value: 'ku', label: 'Kurdish' },
  { value: 'uz', label: 'Uzbek' },
  { value: 'kk', label: 'Kazakh' },
  { value: 'ka', label: 'Georgian' },
  { value: 'az', label: 'Azerbaijani' },
  { value: 'sr', label: 'Serbian' },
  { value: 'hr', label: 'Croatian' },
  { value: 'bs', label: 'Bosnian' },
  { value: 'sv', label: 'Swedish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'yi', label: 'Yiddish' },
  { value: 'yo', label: 'Yoruba' },
  { value: 'ig', label: 'Igbo' },
  { value: 'ha', label: 'Hausa' },
  { value: 'tw', label: 'Twi' },
  { value: 'wo', label: 'Wolof' },
  { value: 'ti', label: 'Tigrinya' },
  { value: 'om', label: 'Oromo' },
  { value: 'ff', label: 'Fulani' },
  { value: 'bm', label: 'Bambara' },
  { value: 'ln', label: 'Lingala' },
  { value: 'rw', label: 'Kinyarwanda' },
  { value: 'kar', label: 'Karen' },
  { value: 'rhg', label: 'Rohingya' },
  { value: 'bo', label: 'Tibetan' },
  { value: 'chk', label: 'Chuukese' },
  { value: 'mh', label: 'Marshallese' },
  { value: 'sm', label: 'Samoan' },
  { value: 'to', label: 'Tongan' },
  { value: 'ch', label: 'Chamorro' },
  { value: 'haw', label: 'Hawaiian' },
  { value: 'ilo', label: 'Ilocano' },
  { value: 'ceb', label: 'Cebuano' },
  { value: 'quc', label: 'K\'iche\'' },
  { value: 'mam', label: 'Mam' },
  { value: 'qu', label: 'Quechua' },
  { value: 'mix', label: 'Mixtec' },
  { value: 'zap', label: 'Zapotec' },
]

/** The full option list a `languages` question renders: LANGUAGES plus its extras. */
export function languageOptionsFor(question: Question): QuestionOption[] {
  return [...LANGUAGES, ...(question.options ?? [])]
}

/**
 * The options a question actually renders, whatever its type.
 *
 * `states` and `languages` both keep their bulk list in a constant and use
 * `options` for EXTRAS ONLY, so reading `question.options` directly on either
 * yields just the extras — every state renders as a bare code, sorted after
 * "Federal courts". That mistake was already written out three times (the
 * review formatter, the policy assembler, the field itself) before `languages`
 * existed, and adding a second such type would have made it six.
 *
 * One function, so a third list-backed type is a change in one place.
 */
export function optionsForQuestion(question: Question): QuestionOption[] {
  if (question.type === 'states') return stateOptionsFor(question)
  if (question.type === 'languages') return languageOptionsFor(question)
  return question.options ?? []
}



// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------
//
// Checked at module load rather than in a test, because both of these are
// assumptions the branching engine RELIES on rather than merely prefers, and a
// violation would show up as a question silently never appearing — the kind of
// bug that reaches Katy as a policy drafted from a blank.

function conditionKeys(c: import('./types').Condition, out: string[] = []): string[] {
  if ('all' in c) c.all.forEach((s) => conditionKeys(s, out))
  else if ('any' in c) c.any.forEach((s) => conditionKeys(s, out))
  else out.push(c.key)
  return out
}

export function assertQuestionSetInvariants(questions: readonly Question[] = QUESTIONS): void {
  const seen = new Set<string>()
  const sectionFirstSeen = new Map<string, number>()
  let previousSection: string | null = null

  questions.forEach((q, i) => {
    if (seen.has(q.key)) throw new Error(`intake: duplicate question key "${q.key}"`)
    seen.add(q.key)

    // A showIf may only reference an EARLIER question. This is what makes
    // visibleQuestions() one forward pass instead of a fixpoint loop.
    if (q.showIf) {
      for (const key of conditionKeys(q.showIf)) {
        if (!seen.has(key)) {
          throw new Error(
            `intake: "${q.key}" has a showIf on "${key}", which is not an earlier question`,
          )
        }
      }
    }

    // Sections must be contiguous, or the tab strip reads as going backwards.
    if (q.section !== previousSection) {
      if (sectionFirstSeen.has(q.section)) {
        throw new Error(`intake: section "${q.section}" is not contiguous (re-entered at "${q.key}")`)
      }
      sectionFirstSeen.set(q.section, i)
      previousSection = q.section
    }
  })
}

assertQuestionSetInvariants()
