// =============================================================================
// The named generic platform block.
//
// Source: .planning/POLICY-BLOCKS-RESEARCH.md §7, verbatim.
//
// ── Why this exists ─────────────────────────────────────────────────────────
// Three of Katy's brackets — P9 (legal research tools), P14 (case management),
// P16 (interoffice communications) — say "research the specifics" and expect a
// prepared paragraph per vendor. Those are gaps G-A1, G-A2 and G-A3, twenty
// vendors in total, and the research is tracked in .planning/policy-blocks.csv.
//
// This module is what fires for a vendor whose CSV row is still empty. Per the
// research brief §7: the generic text "is true for every vendor, needs no
// research, and never goes stale. A completed row UPGRADES that generic text to
// something specific. So this research is an improvement to a working engine,
// not a prerequisite for one."
//
// 🔴 That property is load-bearing and this file is where it lives. Without it,
// a firm on Smokeball gets an empty section; with it, they get a true
// instruction. Nothing in the assembler may special-case a vendor in a way that
// reintroduces the empty-section failure.
//
// ── The two shapes, and which one a vendor gets ─────────────────────────────
// As of this batch all 20 rows are researched, so a listed vendor gets the
// COMPOSED block from lib/policy/vendor-block.ts — feature name, default state,
// where the control lives, and what the vendor's terms do not address.
//
// The generic text below is still reached, and still load-bearing, for:
//   • an `other:` free-text platform the firm typed, which has no row and never
//     will
//   • any option value added to the intake before its CSV row is filled
//
// So the property the brief describes survives: an unresearched vendor is
// harmless rather than an empty section.
// =============================================================================

import { getQuestion } from '@/lib/intake/questions'
import { isOtherValue, otherText } from '@/lib/intake/types'
import { composeVendorBlock } from '@/lib/policy/vendor-block'
import { vendorFacts } from '@/lib/policy/vendor-data'

/**
 * Option values that are not vendors and get no platform block.
 *
 * Straight from the research brief §8, "Out of scope": *"Do not research
 * `general_llms`, `email_only` or `none`. Not vendors. Already handled by P12
 * and by the absence of a third party."*
 *
 * - `none`        — case_mgmt / research_tools: the firm uses no such platform
 * - `general_llms`— research_tools: P12 governs these, not a vendor block
 * - `email_only`  — comms_platforms: the absence of a platform, not one
 */
export const NON_VENDOR_VALUES: ReadonlySet<string> = new Set([
  'none',
  'general_llms',
  'email_only',
])

/**
 * The vendor's display name for a selected option value.
 *
 * Taken from the intake question's own option labels, so the policy calls a
 * platform what the firm was shown when they picked it — "Monday.com", not
 * "monday". A free-text `other:` entry yields exactly what the firm typed.
 *
 * Returns null when the value is not a vendor, or names no option we know.
 */
export function platformDisplayName(answerKey: string, value: string): string | null {
  if (NON_VENDOR_VALUES.has(value)) return null

  if (isOtherValue(value)) {
    const typed = otherText(value)
    return typed && typed.trim() ? typed.trim() : null
  }

  const question = getQuestion(answerKey)
  const option = question?.options?.find((o) => o.value === value)
  return option ? option.label : null
}

/**
 * The generic block for one platform.
 *
 * ⚠️ TRANSCRIBED VERBATIM from .planning/POLICY-BLOCKS-RESEARCH.md §7. The only
 * change is substituting the platform's name for the document's `[Platform]`
 * placeholder, which is what that placeholder is for. Do not reword this — it
 * is reviewed text and it ships to every firm using an unresearched vendor.
 */
export function genericPlatformText(displayName: string): string {
  // The brief writes the possessive as "[Platform]'s". Rendering that slot for a
  // name already ending in "s" takes an apostrophe alone — this is how the
  // placeholder reads, not a change to the wording.
  const its = displayName.endsWith('s') ? `${displayName}'` : `${displayName}'s`
  return (
    `The firm uses ${displayName}. The firm shall confirm whether ${its} AI ` +
    `features are enabled, review ${its} terms of service for data-training ` +
    `language, and record the result.`
  )
}

/** One expanded platform block: the value that produced it and its text. */
export interface PlatformBlock {
  value: string
  displayName: string
  text: string
  /**
   * `researched` — composed from that vendor's row in policy-blocks.csv.
   * `generic`    — the named fallback, because no row exists for this value.
   */
  source: 'researched' | 'generic'
}

/**
 * The block for one platform: the researched text where there is a row for it,
 * and the named generic block where there is not.
 */
export function platformText(
  value: string,
  displayName: string,
): { text: string; source: 'researched' | 'generic' } {
  // An `other:` entry is free text the firm typed; it can never have a row.
  const facts = isOtherValue(value) ? null : vendorFacts(value)
  return facts
    ? { text: composeVendorBlock(facts), source: 'researched' }
    : { text: genericPlatformText(displayName), source: 'generic' }
}

/**
 * Expand a firm's selection for one question into platform blocks, in the
 * order the intake lists the options — NOT the order the firm happened to
 * click. Two firms on Clio and Slack get the same document.
 *
 * Non-vendor values and unrecognised values are dropped, so a firm answering
 * `none` produces no blocks at all and the calling section falls away.
 */
export function platformBlocks(answerKey: string, selected: readonly string[]): PlatformBlock[] {
  const question = getQuestion(answerKey)
  const optionOrder = question?.options?.map((o) => o.value) ?? []

  const rank = (value: string): number => {
    const i = optionOrder.indexOf(value)
    // `other:` entries sort after every listed option, stably among themselves.
    return i === -1 ? optionOrder.length : i
  }

  return selected
    .filter((value, i) => selected.indexOf(value) === i)
    .map((value) => ({ value, displayName: platformDisplayName(answerKey, value) }))
    .filter((row): row is { value: string; displayName: string } => row.displayName !== null)
    .sort((a, b) => rank(a.value) - rank(b.value))
    .map(({ value, displayName }) => ({
      value,
      displayName,
      ...platformText(value, displayName),
    }))
}
