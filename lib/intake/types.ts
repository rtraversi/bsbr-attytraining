// =============================================================================
// Policy intake — the shapes.
//
// Source of record: .planning/intake-spec.md. That document carries the
// question set and every decision behind it with attribution; this file is the
// type-level statement of the same thing, and questions.ts is the data.
//
// Two properties of the intake decide most of what is in here:
//
//   1. It is one question at a time, with conditional branching (Katy,
//      2026-08-25: "that is the whole point of the questions going one by one
//      so that it checks for which is next based on conditional tree"). So a
//      question has to carry its own visibility rule, and that rule has to be
//      data rather than code — see Condition.
//
//   2. The answers are read by a HUMAN drafter and then deleted. No model ever
//      reads them (Max, 2026-08-26). Nothing here is optimised for machine
//      consumption, and nothing here needs to survive the purge.
//
// Answer values are stored as jsonb in intake_answers.value (migration 0028),
// one row per question key, so every shape below has to round-trip through JSON
// unchanged. That is why there are no Dates, no Sets and no Maps.
// =============================================================================


// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------
//
// Labels are ONE WORD each, deliberately. They render as a tab strip above the
// question, and the strip has to fit on one line at any width — a two-word
// label wraps on a phone and the strip stops reading as progress. If a future
// section cannot be named in one word, the section is probably two sections.

// ── The four added 2026-08-28, with modules D E F I J Q U V ─────────────────
//
// Eight modules did not fit eight sections. The rule applied, and the reason a
// section exists at all: A SECTION IS A LANE THE FIRM RECOGNISES, and no
// section runs so long that per-section progress stops meaning anything.
//
//   drafting  ← D. Using AI on matter work product. Nothing existing covers it:
//               `tools` is the inventory of what the firm HAS, and D is what it
//               DOES with it.
//   courts    ← E, plus D's "which courts do you file with", which Katy's own
//               list marks as feeding E. Tribunal-facing, and deliberately NOT
//               `clients` — Katy is explicit that court certification "runs to
//               the tribunal, not the client".
//   records   ← U. What the firm KEEPS, as opposed to what it sends.
//   marketing ← V. Katy: "a genuinely separate compliance lane" — advertising
//               rules, not confidentiality or hallucination risk.
//
// Three modules took an existing section rather than a new tab, because each
// shares its host's lane rather than merely fitting in it:
//
//   I → data     H vets a vendor before the fact; I is the same vendor after it.
//   J → data     Case-specific brainstorming is a confidentiality question — the
//                whole branch turns on tier and no-training, which is H's axis.
//   Q → clients  Sits beside P. Both are money, and P already asks whether AI
//                cost reaches the client's bill.
//   F → staff    Competency, hiring and discipline are one lane: people and
//                conduct. Kept out of `firm` on purpose — `firm` is the first
//                section, and two more questions there is two more before the
//                firm feels any progress at all.
//
// ⚠️ NO EXISTING QUESTION CHANGED SECTION. `section` is display-only and is
// never stored, so moving one costs nothing at the database — but it moves the
// ground under a firm mid-intake for no gain this task needed.
//
// 🔴 The tab strip degrades on a phone at twelve. It is a CSS grid of
// `repeat(N, minmax(0,1fr))` with `truncate` on an 11px label, so it always
// fits on one line by construction and pays for it in characters: ~6 per label
// at eight sections and 390px, ~4 at twelve. It was already truncating
// "Meetings" before this change. Not fixed here — it is a UI decision (drop the
// labels below a breakpoint and keep the bars, since the card already names the
// current section) and it wants Max's eye, not a guess from this file.

export type SectionKey =
  | 'firm'
  | 'tools'
  | 'systems'
  | 'drafting'
  | 'courts'
  | 'data'
  | 'records'
  | 'meetings'
  | 'clients'
  | 'marketing'
  | 'staff'
  | 'history'

/** Display order of the tab strip. questions.ts is ordered to match. */
export const SECTION_ORDER: readonly SectionKey[] = [
  'firm',
  'tools',
  'systems',
  'drafting',
  'courts',
  'data',
  'records',
  'meetings',
  'clients',
  'marketing',
  'staff',
  'history',
] as const

export const SECTION_LABELS: Record<SectionKey, string> = {
  firm: 'Firm',
  tools: 'Tools',
  systems: 'Systems',
  drafting: 'Drafting',
  courts: 'Courts',
  data: 'Data',
  records: 'Records',
  meetings: 'Meetings',
  clients: 'Clients',
  marketing: 'Marketing',
  staff: 'Staff',
  history: 'History',
}


// ---------------------------------------------------------------------------
// Question types
// ---------------------------------------------------------------------------
//
// `single` and `yesno` are separate even though yes/no is a two-option single
// select. Katy's rule is that there are no hedge options, so a yesno renders as
// exactly two buttons and cannot quietly grow a third; a `single` is where a
// third state is deliberate (case_mgmt_ai's "not sure", carrier_notified's).

export type QuestionType =
  | 'text'       // one line
  | 'longtext'   // a paragraph
  | 'yesno'      // exactly two options, always
  | 'single'     // one of `options`
  | 'multi'      // any of `options`
  | 'states'     // US_STATES, plus any extras in `options`
  | 'roster'     // RosterRow[] — one screen, not one question per person
  | 'tool-grid'  // ToolGridRow[] — rows derived from the ai_tools answer
  | 'upload'     // UploadRef

export interface QuestionOption {
  /**
   * Stored in the answer. Stable across rewording — this is the whole reason
   * options are not bare strings. The spec's own correction #3 makes the
   * argument for jurisdictions ("NC", "N.C." and "North Carolina" for one
   * answer); it applies just as much to every other list here.
   */
  value: string
  /** Shown to the firm. Safe to change without touching stored answers. */
  label: string
}


// ---------------------------------------------------------------------------
// Answer shapes
// ---------------------------------------------------------------------------

/** One person on the roster. */
export interface RosterRow {
  /**
   * Name as it should appear on the certification, and authoritative — staff no
   * longer type their own name at password-set. See the roster-wins-on-names
   * note in .planning/intake-spec.md for what today's code does instead and
   * what batch 4 owes this field.
   */
  name: string
  email: string
  /**
   * Attorney status. Orthogonal to the app's `role`, and promoted to
   * firm_members.is_attorney (migration 0028). Does not yet change what a seat
   * costs — that is a later batch.
   */
  isAttorney: boolean
}

/**
 * One row of the per-tool grid. The grid is an explicit exception to
 * one-question-at-a-time (Katy, 2026-08-26): one screen, one row per tool.
 */
export interface ToolGridRow {
  /** An ai_tools answer value, including an `other:`-prefixed free-text entry. */
  tool: string
  /**
   * Generic on purpose. Real tier names differ per vendor and would be wrong
   * for most of them, so the question asks what the tier IS rather than what
   * the vendor calls it.
   */
  tier: 'personal' | 'team' | 'enterprise' | null
  /**
   * "Is there a signed agreement that the vendor will not train on your data?"
   *
   * `unknown` is a real answer here and not a hedge: a firm that does not know
   * gets an instruction in the policy to go and find out, which is a different
   * clause from either yes or no.
   */
  noTraining: 'yes' | 'no' | 'unknown' | null
}

/**
 * A file in the intake bucket. Mirrors the columns of intake_uploads (0028) so
 * the promote step is a field-for-field copy with nothing to decide.
 */
export interface UploadRef {
  storagePath: string
  originalName: string
  contentType: string
  bytes: number
}

export type AnswerValue =
  | string
  | string[]
  | RosterRow[]
  | ToolGridRow[]
  | UploadRef

/**
 * Every answer for one intake session, keyed by question key.
 *
 * A key with no entry is unanswered. Nothing writes an explicit null — an
 * answer that is cleared is deleted, so that "answered" is one test everywhere
 * instead of two.
 */
export type AnswerMap = Record<string, AnswerValue | undefined>

/**
 * The sentinel for the two questions the spec types as "text or 'not decided
 * yet'" (discipline, client_ai_approach).
 *
 * It is a constant rather than free text the firm happens to type, because
 * Katy's export has to be able to tell "the firm has not decided" apart from "a
 * firm wrote a sentence that mentions not deciding". They draft differently:
 * the first gets prepared template text, the second gets read.
 *
 * This is NOT a hedge option in Katy's sense. It is not offered on any yes/no
 * or select — only on the two questions that ask the firm to write a policy
 * position they may genuinely not have taken yet.
 */
export const NOT_DECIDED_YET = '__not_decided_yet__'

/**
 * Prefix marking a free-text entry in an `allowOther` multi-select, e.g.
 * `other:Perplexity`.
 *
 * A prefix rather than a parallel `*_other` answer key, because the tool grid
 * has to produce a row for a free-text tool exactly as it does for a listed
 * one. One list in, one list out.
 */
export const OTHER_PREFIX = 'other:'

/** Wrap free text as an `other:` answer value. Trims; empty text yields null. */
export function otherValue(text: string): string | null {
  const t = text.trim()
  return t ? `${OTHER_PREFIX}${t}` : null
}

/** Whether an answer value is a free-text `other:` entry. */
export function isOtherValue(value: string): boolean {
  return value.startsWith(OTHER_PREFIX)
}

/** The text a firm typed, for an `other:` value. Returns null for anything else. */
export function otherText(value: string): string | null {
  return isOtherValue(value) ? value.slice(OTHER_PREFIX.length) : null
}


// ---------------------------------------------------------------------------
// Conditions — the branching language
// ---------------------------------------------------------------------------
//
// Data, not predicate functions, for three reasons that all bite later:
// the whole tree has to be serialisable so a question set can be diffed in a
// review; pruneOrphans has to be able to ask "which questions does this answer
// govern" without executing anything; and Katy's export has to be able to print
// the branch a firm took beside the answers.
//
// `all` and `any` nest, so depth is arbitrary. No question in the current set
// needs more than one level — that is not a reason to build a language that
// cannot express two.
//
// ── The invariant that makes this cheap ─────────────────────────────────────
// A showIf may only reference questions that come EARLIER in the ordered set.
// visibleQuestions() is therefore one forward pass with no fixpoint loop, and
// assertQuestionSetInvariants() in questions.ts enforces it at module load
// rather than leaving it as a comment nobody reads.

export type Condition =
  /** The answer for `key` equals `is`. For an array answer, the array is exactly [is]. */
  | { key: string; is: string }
  /**
   * `key` IS answered, and its answer is not `not` (for an array answer: does
   * not contain `not`).
   *
   * The "is answered" half is load-bearing. Without it an unanswered question
   * would satisfy every `not` vacuously, and case_mgmt_ai would appear before
   * the firm has said what platform they use.
   */
  | { key: string; not: string }
  /** The array answer for `key` contains at least one of these values. */
  | { key: string; includesAny: string[] }
  /** `key` has any answer at all. */
  | { key: string; answered: true }
  | { all: Condition[] }
  | { any: Condition[] }


// ---------------------------------------------------------------------------
// Question
// ---------------------------------------------------------------------------

export interface Question {
  /** Stable key. Written to intake_answers.question_key; never reworded. */
  key: string
  section: SectionKey
  /**
   * The policy module this answer feeds, so Katy's export reads module by
   * module and template-vs-bespoke is one pass down the page. null for
   * questions that feed no module (firm_name is the only one).
   */
  module: string | null
  prompt: string
  /** Secondary line under the prompt. Not a tooltip — the intake has no hover state. */
  help?: string
  type: QuestionType
  /**
   * Choices for single/multi. For a `states` question these are EXTRA entries
   * appended to US_STATES (jurisdictions adds federal; hiring_states adds
   * outside-the-US), not a replacement for it.
   */
  options?: QuestionOption[]
  /** Required questions block submission — but only while they are VISIBLE. */
  required: boolean
  /** Offer a free-text entry alongside `options`, stored `other:`-prefixed. */
  allowOther?: boolean
  /**
   * Written to intake_sensitive rather than intake_answers (migration 0028),
   * which has RLS on and NO POLICY, so only a service-role route can read it.
   *
   * The flag decides the DESTINATION TABLE and nothing else. Both sensitive
   * questions are always visible and always required, exactly like any other.
   */
  sensitive?: boolean
  /** Absent means always visible. */
  showIf?: Condition
}
