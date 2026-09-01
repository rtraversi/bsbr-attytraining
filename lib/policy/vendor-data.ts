// =============================================================================
// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Source:    .planning/policy-blocks.csv
// Generator: scripts/build-policy-vendors.mjs
// Regenerate: node scripts/build-policy-vendors.mjs
//
// Edit the CSV and re-run the generator. tests/policy-vendor-data.test.ts
// re-reads the CSV and fails if this file has drifted from it.
//
// The researcher's evidence — quoted_sentence, source_url_2, notes — is
// deliberately NOT projected here. It belongs in the CSV where a reviewer can
// check it, not in a document delivered to a firm.
// =============================================================================

/** Three-state answer. A blank cell in the CSV is read as `unclear`. */
export type VendorTri = 'yes' | 'no' | 'unclear'

/** Training answer. `no_by_contract` means only under a signed DPA. */
export type VendorTraining = 'yes' | 'no' | 'no_by_contract' | 'unclear'

/** Four-state answer, where `n_a` means the question does not apply. */
export type VendorQuad = 'yes' | 'no' | 'n_a' | 'unclear'

export interface VendorFacts {
  id: string
  displayName: string
  category: string
  hasAi: VendorTri
  aiFeatureName: string | null
  aiOnByDefault: VendorQuad
  trainsOnCustomerData: VendorTraining
  optoutAvailable: VendorQuad
  optoutLocation: string | null
  dpaAvailable: VendorTri
  dpaRequiresPlan: string | null
  sourceUrl: string
  dateChecked: string
}

/** Keyed by the intake option value, which is also the CSV `id`. */
export const VENDOR_FACTS: Readonly<Record<string, VendorFacts>> = {
  clio: {
    id: "clio",
    displayName: "Clio",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "Manage AI (formerly Clio Duo)",
    aiOnByDefault: "no",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.clio.com/tos/",
    dateChecked: "2026-08-31",
  },
  mycase: {
    id: "mycase",
    displayName: "MyCase",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "8am IQ (Document Assistant, Writing Assistant, Case Assistant, and Discovery Assistant)",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "yes",
    optoutLocation: "Settings > Firm Settings > Preferences > Edit Preferences > uncheck Enabled; Discovery Assistant requires a request to support@mycase.com",
    dpaAvailable: "unclear",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.8am.com/terms-of-service/",
    dateChecked: "2026-08-31",
  },
  practicepanther: {
    id: "practicepanther",
    displayName: "PracticePanther",
    category: "case_mgmt",
    hasAi: "unclear",
    aiFeatureName: null,
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "unclear",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.practicepanther.com/terms/",
    dateChecked: "2026-08-31",
  },
  smokeball: {
    id: "smokeball",
    displayName: "Smokeball",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "Smokeball AI; Archie AI",
    aiOnByDefault: "no",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "yes",
    optoutLocation: "User-based access permissions (exact menu path not stated)",
    dpaAvailable: "unclear",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.smokeball.com/terms",
    dateChecked: "2026-08-31",
  },
  filevine: {
    id: "filevine",
    displayName: "Filevine",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "AI-Enabled Features, including LOIS",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.filevine.com/legal/subscription-agreement/",
    dateChecked: "2026-08-31",
  },
  actionstep: {
    id: "actionstep",
    displayName: "Actionstep",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "Actionstep AI; AI-generated Business Intelligence dashboard insights (beta)",
    aiOnByDefault: "no",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "yes",
    optoutLocation: "Administrator-set boundaries (exact control path not publicly documented)",
    dpaAvailable: "unclear",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.actionstep.com/terms",
    dateChecked: "2026-08-31",
  },
  litify: {
    id: "litify",
    displayName: "Litify",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "Litify AI; Litify Agentic Case Expert (ACE)",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "unclear",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.litify.com/litify-ai",
    dateChecked: "2026-08-31",
  },
  rocket_matter: {
    id: "rocket_matter",
    displayName: "Rocket Matter",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "AI-powered grid filtering",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "unclear",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.rocketmatter.com/subscription-agreement/",
    dateChecked: "2026-08-31",
  },
  cosmolex: {
    id: "cosmolex",
    displayName: "CosmoLex",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "AI Document Summaries; AI-powered filtering; AI Client Intake",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.cosmolex.com/privacy-policy/",
    dateChecked: "2026-08-31",
  },
  neos: {
    id: "neos",
    displayName: "Neos",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "NeosAI; NeosAI Platinum",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "yes",
    optoutLocation: "Ordered module; use is at the customer's sole discretion (no UI path stated)",
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.assemblysoftware.com/legal/terms-conditions",
    dateChecked: "2026-08-31",
  },
  monday: {
    id: "monday",
    displayName: "Monday.com",
    category: "case_mgmt",
    hasAi: "yes",
    aiFeatureName: "monday AI, including Sidekick, AI Blocks, AI Workflows, and agents",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "no",
    optoutAvailable: "yes",
    optoutLocation: "Administration > AI governance > AI permissions > Enable AI features",
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://monday.com/l/legal/ai/",
    dateChecked: "2026-08-31",
  },
  cocounsel: {
    id: "cocounsel",
    displayName: "CoCounsel",
    category: "research_tool",
    hasAi: "yes",
    aiFeatureName: "CoCounsel Legal (AI Assistant, skills, workflows, knowledge search, web search, and tabular analysis)",
    aiOnByDefault: "yes",
    trainsOnCustomerData: "no",
    optoutAvailable: "yes",
    optoutLocation: "Admin settings > User permissions",
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.thomsonreuters.com/content/dam/ewp-m/documents/thomsonreuters/en/pdf/other/product-specific-terms-for-legal-products-and-services-with-ai-functionality.pdf",
    dateChecked: "2026-08-31",
  },
  westlaw_edge: {
    id: "westlaw_edge",
    displayName: "Westlaw Edge",
    category: "research_tool",
    hasAi: "yes",
    aiFeatureName: "AI-Assisted Research; AI Jurisdictional Surveys; WestSearch Plus; Quick Check; KeyCite Overruling Risk",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://legal.thomsonreuters.com/en/products/westlaw-edge/features",
    dateChecked: "2026-08-31",
  },
  lexis_plus_ai: {
    id: "lexis_plus_ai",
    displayName: "Lexis+ AI",
    category: "research_tool",
    hasAi: "yes",
    aiFeatureName: "Lexis+ with Protégé (formerly Lexis+ AI)",
    aiOnByDefault: "yes",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.lexisnexis.com/en-us/products/lexis-plus-protege.page",
    dateChecked: "2026-08-31",
  },
  vincent_ai: {
    id: "vincent_ai",
    displayName: "Vincent AI",
    category: "research_tool",
    hasAi: "yes",
    aiFeatureName: "Vincent AI",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "unclear",
    dpaRequiresPlan: null,
    sourceUrl: "https://vlex.com/terms",
    dateChecked: "2026-08-31",
  },
  ask_practical_law: {
    id: "ask_practical_law",
    displayName: "Ask Practical Law",
    category: "research_tool",
    hasAi: "yes",
    aiFeatureName: "Ask Practical Law AI; Search & Summarize Practical Law",
    aiOnByDefault: "no",
    trainsOnCustomerData: "no",
    optoutAvailable: "yes",
    optoutLocation: "CoCounsel Admin settings > User permissions",
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.thomsonreuters.com/content/dam/ewp-m/documents/thomsonreuters/en/pdf/other/product-specific-terms-for-legal-products-and-services-with-ai-functionality.pdf",
    dateChecked: "2026-08-31",
  },
  teams: {
    id: "teams",
    displayName: "Microsoft Teams",
    category: "comms",
    hasAi: "yes",
    aiFeatureName: "Microsoft 365 Copilot and Copilot Chat in Teams",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "no",
    optoutAvailable: "yes",
    optoutLocation: "Microsoft 365 admin center > Integrated Apps > Copilot; manage Teams access through the Copilot app in the Teams admin center",
    dpaAvailable: "yes",
    dpaRequiresPlan: null,
    sourceUrl: "https://www.microsoft.com/licensing/terms/en-US/product/ForOnlineServices/",
    dateChecked: "2026-08-31",
  },
  slack: {
    id: "slack",
    displayName: "Slack",
    category: "comms",
    hasAi: "yes",
    aiFeatureName: "Slack AI features (including Slackbot, conversation summaries, huddle notes, search answers, and recaps)",
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "yes",
    optoutAvailable: "yes",
    optoutLocation: "Org or Workspace Owner/Primary Owner emails feedback@slack.com with the Workspace/Org URL and subject 'Slack Global model opt-out request'",
    dpaAvailable: "yes",
    dpaRequiresPlan: "None; available to all customers regardless of Slack plan",
    sourceUrl: "https://slack.com/slack-supplemental-terms",
    dateChecked: "2026-08-31",
  },
  telegram: {
    id: "telegram",
    displayName: "Telegram",
    category: "comms",
    hasAi: "yes",
    aiFeatureName: "AI summaries; AI Editor; AI-powered sticker and GIF search",
    aiOnByDefault: "yes",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "unclear",
    dpaRequiresPlan: null,
    sourceUrl: "https://telegram.org/tos/content-licensing",
    dateChecked: "2026-08-31",
  },
  signal: {
    id: "signal",
    displayName: "Signal",
    category: "comms",
    hasAi: "unclear",
    aiFeatureName: null,
    aiOnByDefault: "unclear",
    trainsOnCustomerData: "unclear",
    optoutAvailable: "unclear",
    optoutLocation: null,
    dpaAvailable: "unclear",
    dpaRequiresPlan: null,
    sourceUrl: "https://signal.org/legal/",
    dateChecked: "2026-08-31",
  },
}

/** Facts for one intake option value, or null when the vendor is unresearched. */
export function vendorFacts(value: string): VendorFacts | null {
  return Object.prototype.hasOwnProperty.call(VENDOR_FACTS, value)
    ? VENDOR_FACTS[value]
    : null
}
