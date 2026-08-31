// =============================================================================
// Policy assembler — the shapes.
//
// Source of record for the STRUCTURE: .planning/POLICY-ENGINE-MAP.md §11, the
// 22-section spine ratified by Max on 2026-08-31.
//
// Source of record for the TEXT: .planning/AI-Policy-Research-2026-08-20.md.
// Nothing in lib/policy/blocks/ is written; every sentence is transcribed from
// that file and carries the line it came from. Where Katy wrote an INSTRUCTION
// to a drafter rather than a clause ("[research the specifics]"), there is no
// text to transcribe and the block is a `todo` naming the line. That is the
// whole reason `todo` exists: the alternative is inventing policy language, and
// this document is relied on by attorneys.
//
// ── The rule that does not move ─────────────────────────────────────────────
// 🔴 THE ASSEMBLER IS DETERMINISTIC. Intake answers are never sent to a model.
// Everything here is a lookup, a branch, or a string substitution (Katy, and
// restated at POLICY-ENGINE-MAP.md's header). There is no generation step to
// add later — `assemble()` is a pure function and the tests depend on it being
// one.
//
// ── Two outputs, not one ────────────────────────────────────────────────────
// Decision D2 (POLICY-ENGINE-MAP.md §7): the ACTION ITEM LIST is a separate
// deliverable, not an appendix. Katy's own bracket says "ADD TO ACTION ITEM
// LIST APART FROM POLICY". A firm's adopted policy never contains a list of
// what the firm has not done yet, so assemble() returns the two side by side
// and nothing merges them.
// =============================================================================

import type { AnswerMap, Condition } from '@/lib/intake/types'

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

/**
 * A branch condition on a block.
 *
 * Almost always an intake `Condition`, evaluated by the intake's own
 * evaluator — see evaluateCondition() in lib/intake/branching.ts for why this
 * layer does not own a second one.
 *
 * ── The one extension, and why it is not a Condition ────────────────────────
 * `hasNonAttorneyStaff` is a predicate over the ROSTER, and the intake's
 * condition language deliberately only compares answer values: `roster` is
 * RosterRow[], and "does any row have isAttorney false" is not expressible as
 * an equality test. It is needed because §4 scales at zero non-attorney staff
 * (Katy, 2026-08-25: a solo with no staff needs no non-attorney training).
 *
 * It is named rather than general on purpose. A general predicate escape hatch
 * would let arbitrary code into the spine, and the spine has to stay
 * serialisable enough to diff in a review — the same argument the intake makes
 * for its own condition language being data.
 */
export type PolicyCondition = Condition | { hasNonAttorneyStaff: true }

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

/**
 * A fixed substitution inside a verbatim clause.
 *
 * `placeholder` is the EXACT bracket Katy wrote, typos and all — see the
 * `[FIRM NAME}` slot in blocks/s02-application.ts, whose closing brace is hers.
 * Keeping her literal string means the transcription stays verbatim and the
 * slot is checked against it: assertSpineInvariants() fails if a placeholder is
 * not present in the text it claims to fill, so a reworded clause cannot
 * silently stop substituting.
 */
export interface Slot {
  /** Exact substring of the block's text to replace. */
  placeholder: string
  /** Intake question key supplying the value. Must exist in questions.ts. */
  key: string
  /**
   * Option values to drop before rendering.
   *
   * For when the surrounding sentence ALREADY says what an option would say, so
   * filling it in prints the same thing twice. P2 is the case this exists for:
   * Katy's clause opens "comply with all requirements of Federal Courts,
   * Agencies, Circuits, as well as state(s) of …", so a firm that also ticked
   * "Federal courts" on `jurisdictions` would read Federal twice in one
   * sentence.
   *
   * 🔴 This is a LOGIC fix and never a licence to edit her wording. The clause
   * is transcribed verbatim; only what goes into the slot changes.
   */
  exclude?: readonly string[]
}

// ---------------------------------------------------------------------------
// Block text
// ---------------------------------------------------------------------------

/**
 * Where a block's words come from.
 *
 * `verbatim` — transcribed from the policy source at `sourceLine`.
 *
 *   Markdown artefacts are dropped in transcription: the source wraps nearly
 *   every line in `**` and escapes brackets as `\[`, neither of which is
 *   policy language. Words, spacing and punctuation inside the sentence are
 *   untouched, INCLUDING Katy's typos ("pr" for "or", "Enterpirse", "tot he").
 *   Fixing them here would put this file and her document out of sync, and the
 *   place to fix them is her document.
 *
 * `todo` — the source has no clause to transcribe at `sourceLine`, only an
 *   instruction to a drafter. Carries the line so whoever writes the text can
 *   find what Katy asked for. Renders as a visible marker, never as silence:
 *   a section that quietly dropped its unwritten clauses would look finished.
 *
 * `perPlatform` — expands at assemble time into one block per platform the
 *   firm selected, via lib/policy/platform-block.ts. This is P9, P14 and P16,
 *   the three brackets that say "research the specifics".
 */
export type BlockText =
  | {
      kind: 'verbatim'
      text: string
      sourceLine: number
      slots?: readonly Slot[]
    }
  | {
      kind: 'todo'
      /** What is missing, and the gap ID from POLICY-ENGINE-MAP.md §6 if it has one. */
      reason: string
      /** Line in the policy source carrying Katy's instruction. null when she wrote none. */
      sourceLine: number | null
    }
  | {
      kind: 'perPlatform'
      /** Intake question key holding the selected platforms. */
      answerKey: string
      sourceLine: number
    }

// ---------------------------------------------------------------------------
// Blocks and sections
// ---------------------------------------------------------------------------

export interface Block {
  /** Stable id, unique across the whole spine. Used by tests and by review tooling. */
  id: string
  /**
   * Provenance. `P1`…`P38` are Part 1 clause IDs from POLICY-ENGINE-MAP.md §2;
   * a quoted string is a Part 2 heading. Never null — every block came from
   * somewhere, and a block that did not is a block someone invented.
   */
  clause: string
  text: BlockText
  /** Absent means the block is in every policy. */
  when?: PolicyCondition
}

export interface Section {
  /** 1…22, matching POLICY-ENGINE-MAP.md §11.2. */
  number: number
  key: string
  /**
   * Cosmetic. Ratification covered which rule lives in which section and the
   * order; section names "may change at any time without reopening this"
   * (POLICY-ENGINE-MAP.md §11).
   */
  title: string
  blocks: readonly Block[]
}

// ---------------------------------------------------------------------------
// Output — the policy
// ---------------------------------------------------------------------------

export interface AssembledBlock {
  id: string
  clause: string
  /**
   * The block's final words, slots filled.
   *
   * For a `todo` block this is a marker naming the source line, e.g.
   * `[TODO — AI-Policy-Research-2026-08-20.md:284 — …]`. Deliberately loud.
   */
  text: string
  /** Whether `text` is real policy language or a placeholder. */
  status: 'verbatim' | 'todo'
  /** Line in the policy source, where there is one. */
  sourceLine: number | null
}

export interface AssembledSection {
  number: number
  key: string
  title: string
  blocks: readonly AssembledBlock[]
}

export interface AssembledPolicy {
  /**
   * Sections in spine order, with EMPTY SECTIONS OMITTED. A firm that does no
   * document review has no §11, rather than a §11 heading over nothing.
   */
  sections: readonly AssembledSection[]
}

// ---------------------------------------------------------------------------
// Output — the action item list (D2)
// ---------------------------------------------------------------------------

/**
 * One entry on the separate action item list.
 *
 * Fed by the three "not sure" answers Katy routes out of the policy:
 * case_mgmt_ai, notetaker_stance and carrier_notified
 * (POLICY-ENGINE-MAP.md §11.2, closing note).
 *
 * ⚠️ `text` is a `todo` in this batch for all three. Katy's brackets describe
 * what the action item should tell the firm to do; they are not the sentence
 * the firm reads. Writing that sentence here would be inventing it.
 */
export interface ActionItem {
  id: string
  /** The intake question whose "not sure" produced this. */
  fromKey: string
  text: string
  status: 'verbatim' | 'todo'
  sourceLine: number | null
}

/** What assemble() returns. Two deliverables, never merged — see D2 above. */
export interface AssembleResult {
  policy: AssembledPolicy
  actionItems: readonly ActionItem[]
}

export type { AnswerMap }
