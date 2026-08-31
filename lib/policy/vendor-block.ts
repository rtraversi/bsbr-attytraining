// =============================================================================
// Per-vendor policy blocks — composed from researched facts.
//
// This is G-A1 / G-A2 / G-A3: the prepared text behind P9 (legal research
// tools), P14 (case management) and P16 (interoffice communications), the three
// brackets where Katy wrote "research the specifics".
//
// ── What these blocks say, and why that changed ─────────────────────────────
// The first design turned on a TRAINING VERDICT — does this vendor train on
// client data. The completed research does not support that: across 20 vendors
// the terms settle it for FIVE. Fifteen publish a no-training claim on a
// marketing or trust page and keep it out of the governing agreement, so under
// the brief's terms-first rule the honest answer is `unclear`.
//
// A block built on a verdict we mostly lack would say "go and check" twenty
// times, which is what the generic fallback already says. So these blocks
// deliver what the research DOES establish (Max, this batch):
//
//   1. the AI feature's name
//   2. whether it is on or off by default
//   3. where the control to disable it lives
//   4. WHAT THE VENDOR'S TERMS DO NOT ADDRESS — stated explicitly, as a fact
//      about the agreement rather than a gap in our work
//
// The five vendors whose terms DO settle training get a stronger, definite
// clause instead of an instruction.
//
// ── Provenance, and what still needs review ────────────────────────────────
// 🔴 THE SENTENCES BELOW ARE NOT KATY'S. They are composed from CSV facts, and
// they are the one place in lib/policy where text is generated rather than
// transcribed. That is sanctioned rather than a lapse — research brief §8:
// "Do not draft policy language. The CSV holds facts. The policy sentences are
// generated from them, IN ONE PLACE, so wording stays consistent across all
// 20." This file is that one place.
//
// It still needs Katy's review before any of it ships. What is safe about it:
// every clause is a mechanical projection of a researched cell, the closing
// duty is her own P14 wording ("use of AI enhanced CLIO shall comply with this
// policy"), and the restriction in the unsettled and trains-on-data branches is
// her Part 2 rule at source line 356 — that any tool touching client data must
// be used "under an express agreement that data will NOT be used for training
// the models" — applied rather than invented.
//
// Deterministic: same facts in, same sentence out. No model, ever.
// =============================================================================

import type { VendorFacts } from '@/lib/policy/vendor-data'

/**
 * Possessive of a product name.
 *
 * Needed because two vendors in the set end in "s" — "Microsoft Teams" and
 * "Neos" — and the naive `${name}'s` renders "Microsoft Teams's". A firm
 * reading its own policy notices that.
 */
function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`
}

/**
 * Join a list the way a sentence does: "a", "a and b", "a, b and c".
 *
 * No serial comma, matching the surrounding policy prose.
 */
function sentenceList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * The things this vendor's terms leave open, in a fixed order.
 *
 * Order is by how much the answer matters to the firm — training first, since
 * that is what decides whether client data may go near the tool at all.
 */
function unaddressed(facts: VendorFacts): string[] {
  const gaps: string[] = []
  // Folded in rather than stated separately: a vendor whose terms do not
  // establish that it HAS AI features would otherwise produce two consecutive
  // "as of <date>, X's published terms do not…" sentences.
  if (facts.hasAi === 'unclear') {
    gaps.push('whether it provides AI features')
  }
  if (facts.trainsOnCustomerData === 'unclear') {
    gaps.push('whether customer data is used to train models')
  }
  if (facts.aiOnByDefault === 'unclear') {
    gaps.push('whether its AI features are enabled by default')
  }
  if (facts.optoutAvailable === 'unclear') {
    gaps.push('whether its AI features can be disabled')
  }
  if (facts.dpaAvailable === 'unclear') {
    gaps.push('whether a data processing addendum is available')
  }
  return gaps
}

/** Katy's own closing, from her P14 bracket. Every vendor block ends with it. */
function complianceDuty(name: string): string {
  return `Use of AI-enhanced ${name} shall comply with this policy.`
}

/**
 * Compose the policy block for one researched vendor.
 *
 * Returns the sentences in order; the caller joins them. Split rather than
 * pre-joined so tests can assert on one clause without matching whole
 * paragraphs.
 */
export function composeVendorSentences(facts: VendorFacts): string[] {
  const name = facts.displayName
  const out: string[] = []

  // ── 1. The feature ────────────────────────────────────────────────────────
  if (facts.hasAi === 'no') {
    // No vendor in the current set answers this, but the branch is real: a
    // firm should be told a platform has no AI rather than told nothing.
    out.push(`${name} does not provide AI features.`)
    out.push(complianceDuty(name))
    return out
  }

  if (facts.hasAi === 'unclear') {
    // Named, so the block still opens by saying which platform it governs. The
    // open question itself is carried by the "does not address" sentence below.
    out.push(`The firm uses ${name}.`)
  } else if (facts.aiFeatureName) {
    out.push(`${name} provides AI features: ${facts.aiFeatureName}.`)
  } else {
    out.push(`${name} provides AI features.`)
  }

  // ── 2. Default state ──────────────────────────────────────────────────────
  // `unclear` is not stated here — it is collected into the "does not address"
  // sentence below, so the firm reads one list of open questions, not four.
  if (facts.aiOnByDefault === 'yes') {
    out.push('These features are enabled by default.')
  } else if (facts.aiOnByDefault === 'no') {
    out.push('These features are not enabled until an administrator turns them on.')
  }

  // ── 3. The control ────────────────────────────────────────────────────────
  if (facts.optoutAvailable === 'yes') {
    out.push(
      facts.optoutLocation
        // An em dash rather than "at:", because an opt-out is not always a menu
        // path — Slack's is an email to its support address, and "disabled at:
        // Org Owner emails feedback@slack.com" does not parse.
        ? `They can be disabled — ${facts.optoutLocation}.`
        : `They can be disabled, though ${name} does not publish where that control lives. ` +
            `The firm shall locate it and record where it is.`,
    )
  } else if (facts.optoutAvailable === 'no') {
    out.push(`${name} does not offer a control to disable them.`)
  }

  // ── 4. Training — the clause that differs ─────────────────────────────────
  if (facts.trainsOnCustomerData === 'no' || facts.trainsOnCustomerData === 'no_by_contract') {
    // SETTLED, and favourably. A definite statement, not an instruction.
    out.push(
      facts.trainsOnCustomerData === 'no_by_contract'
        ? `Under a signed data processing addendum, ${name} is contractually bound not to use ` +
            `the firm's data to train models. The firm shall ensure that addendum is executed.`
        : `Under ${possessive(name)} terms, the firm's data is not used to train models.`,
    )
  } else if (facts.trainsOnCustomerData === 'yes') {
    // SETTLED, and unfavourably. Katy's Part 2 rule at source line 356 is that
    // any tool with access to client data must be used under an express
    // no-training agreement. Applied here rather than restated in the abstract.
    out.push(
      `Under ${possessive(name)} terms, the firm's data is used to train models. Client ` +
        `confidential information shall not be disclosed through ${name} unless the firm has ` +
        `completed the opt-out described above and recorded that it has done so.`,
    )
  }

  // ── 5. What the terms do not address ──────────────────────────────────────
  const gaps = unaddressed(facts)
  if (gaps.length > 0) {
    out.push(
      `As of ${facts.dateChecked}, ${possessive(name)} published terms do not address ` +
        `${sentenceList(gaps)}.`,
    )
  }

  // ── 6. The duty that follows from an unsettled training answer ────────────
  if (facts.trainsOnCustomerData === 'unclear') {
    // The comma pair belongs to the addendum clause. Without an addendum there
    // is no parenthetical, and no comma before "before".
    const addendum =
      facts.dpaAvailable === 'yes'
        ? `, and shall execute ${possessive(name)} data processing addendum${
            facts.dpaRequiresPlan ? ` (${facts.dpaRequiresPlan})` : ''
          },`
        : ''
    out.push(
      `The firm shall obtain written confirmation from ${name} that the firm's data is not ` +
        `used to train models${addendum} before client confidential information is disclosed ` +
        `through its AI features.`,
    )
  }

  out.push(complianceDuty(name))
  return out
}

/** The composed block as one paragraph. */
export function composeVendorBlock(facts: VendorFacts): string {
  return composeVendorSentences(facts).join(' ')
}

/**
 * Whether this vendor's terms settle the training question either way.
 *
 * Exposed because it is the line between the two shapes of block, and a test
 * asserts it holds for exactly the five rows the research settled.
 */
export function trainingIsSettled(facts: VendorFacts): boolean {
  return facts.trainsOnCustomerData !== 'unclear'
}
