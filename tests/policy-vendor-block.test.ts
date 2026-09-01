// =============================================================================
// Per-vendor blocks, and the generated vendor data behind them.
//
// Two jobs:
//
//   1. DRIFT. lib/policy/vendor-data.ts is generated from
//      .planning/policy-blocks.csv. This re-reads the CSV and fails if the two
//      have parted company — otherwise the CSV stops being the source of truth
//      the moment someone edits it and forgets the generator.
//
//   2. COMPOSITION. Every branch of composeVendorSentences, and the reframe
//      itself: the block must deliver feature name, default state, opt-out
//      location and what the terms do NOT address, and the five vendors whose
//      terms settle training must get a definite clause instead of an
//      instruction.
// =============================================================================

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { genericPlatformText, platformBlocks, platformText } from '@/lib/policy/platform-block'
import { composeVendorBlock, composeVendorSentences, trainingIsSettled } from '@/lib/policy/vendor-block'
import { VENDOR_FACTS, vendorFacts, type VendorFacts } from '@/lib/policy/vendor-data'

const ALL = Object.values(VENDOR_FACTS)

// ---------------------------------------------------------------------------
// Drift
// ---------------------------------------------------------------------------

/** Minimal RFC-4180 reader, matching scripts/build-policy-vendors.mjs. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

const [header, ...body] = parseCsv(
  readFileSync(join(process.cwd(), '.planning', 'policy-blocks.csv'), 'utf8'),
)
const csvRows = body.map((r) =>
  Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])),
) as Record<string, string>[]

describe('vendor-data.ts tracks the CSV', () => {
  it('has the same vendors, in the same order', () => {
    expect(Object.keys(VENDOR_FACTS)).toEqual(csvRows.map((r) => r.id))
  })

  it.each(csvRows.map((r) => [r.id, r] as const))('%s matches its CSV row', (id, row) => {
    const facts = VENDOR_FACTS[id]
    expect(facts, `no generated facts for "${id}" — re-run the generator`).toBeDefined()

    // A blank cell means "not recorded", which the policy reads as unclear.
    const tri = (v: string): string => (v === '' ? 'unclear' : v)
    const orNull = (v: string): string | null => (v === '' ? null : v)

    expect(facts.displayName).toBe(row.display_name)
    expect(facts.category).toBe(row.category)
    expect(facts.hasAi).toBe(tri(row.has_ai))
    expect(facts.aiFeatureName).toBe(orNull(row.ai_feature_name))
    expect(facts.aiOnByDefault).toBe(tri(row.ai_on_by_default))
    expect(facts.trainsOnCustomerData).toBe(tri(row.trains_on_customer_data))
    expect(facts.optoutAvailable).toBe(tri(row.optout_available))
    expect(facts.optoutLocation).toBe(orNull(row.optout_location))
    expect(facts.dpaAvailable).toBe(tri(row.dpa_available))
    expect(facts.sourceUrl).toBe(row.source_url_1)
    expect(facts.dateChecked).toBe(row.date_checked)
  })

  it('carries all 20 intake option values', () => {
    expect(ALL).toHaveLength(20)
  })

  it('does not project the researcher evidence into the policy layer', () => {
    // quoted_sentence, source_url_2 and notes belong in the CSV where a reviewer
    // checks them — not in a document delivered to a firm.
    //
    // Asserted on FIELD NAMES, not on a serialised blob: Slack's feature name
    // contains the words "huddle notes", so a substring search over the JSON
    // matches vendor prose and tests nothing.
    const expected = [
      'id',
      'displayName',
      'category',
      'hasAi',
      'aiFeatureName',
      'aiOnByDefault',
      'trainsOnCustomerData',
      'optoutAvailable',
      'optoutLocation',
      'dpaAvailable',
      'dpaRequiresPlan',
      'sourceUrl',
      'dateChecked',
    ]
    for (const facts of ALL) {
      expect(Object.keys(facts).sort(), facts.id).toEqual([...expected].sort())
    }
  })
})

// ---------------------------------------------------------------------------
// The reframe
// ---------------------------------------------------------------------------

describe('the block delivers what the research established', () => {
  it('names the AI feature where the research found one', () => {
    expect(composeVendorBlock(VENDOR_FACTS.clio)).toContain(
      'Clio provides AI features: Manage AI (formerly Clio Duo).',
    )
  })

  it('states the default where it is known, in both directions', () => {
    expect(composeVendorBlock(VENDOR_FACTS.clio)).toContain(
      'These features are not enabled until an administrator turns them on.',
    )
    expect(composeVendorBlock(VENDOR_FACTS.cocounsel)).toContain(
      'These features are enabled by default.',
    )
  })

  it('gives the opt-out location verbatim from the research', () => {
    expect(composeVendorBlock(VENDOR_FACTS.monday)).toContain(
      'They can be disabled — Administration > AI governance > AI permissions > Enable AI features.',
    )
  })

  it('states what the terms do NOT address, as a fact about the agreement', () => {
    // The reframe. This is the sentence the batch exists for.
    expect(composeVendorBlock(VENDOR_FACTS.clio)).toContain(
      "As of 2026-08-31, Clio's published terms do not address whether customer data is used " +
        'to train models and whether its AI features can be disabled.',
    )
  })

  it('folds an unknown has_ai into the same list rather than a second dated sentence', () => {
    const text = composeVendorBlock(VENDOR_FACTS.practicepanther)
    expect(text).toContain('The firm uses PracticePanther.')
    expect(text).toContain('do not address whether it provides AI features, whether customer data')
    // Exactly one "As of <date>" sentence, however many gaps there are.
    expect(text.match(/As of 2026-08-31/g)).toHaveLength(1)
  })
})

describe('the five settled vendors get the stronger clause', () => {
  const settled = ALL.filter(trainingIsSettled)

  it('is exactly the five the research settled', () => {
    expect(settled.map((v) => v.id).sort()).toEqual(
      ['ask_practical_law', 'cocounsel', 'monday', 'slack', 'teams'].sort(),
    )
  })

  it('states the no-training commitment definitely, with no instruction to go and check', () => {
    for (const facts of settled.filter((v) => v.trainsOnCustomerData === 'no')) {
      const text = composeVendorBlock(facts)
      expect(text).toContain("terms, the firm's data is not used to train models.")
      expect(text).not.toContain('shall obtain written confirmation')
    }
  })

  it('restricts client data where the vendor does train on it', () => {
    // Katy's Part 2 rule at source line 356, applied: a tool with access to
    // client data must be under an express no-training agreement.
    const text = composeVendorBlock(VENDOR_FACTS.slack)
    expect(text).toContain("Under Slack's terms, the firm's data is used to train models.")
    expect(text).toContain(
      'Client confidential information shall not be disclosed through Slack unless the firm ' +
        'has completed the opt-out described above and recorded that it has done so.',
    )
  })

  it('instructs the other fifteen to get it in writing', () => {
    for (const facts of ALL.filter((v) => !trainingIsSettled(v))) {
      expect(composeVendorBlock(facts), facts.id).toContain(
        `The firm shall obtain written confirmation from ${facts.displayName}`,
      )
    }
  })
})

// ---------------------------------------------------------------------------
// Prose mechanics
// ---------------------------------------------------------------------------

describe('prose mechanics', () => {
  it('takes a bare apostrophe for a name ending in s', () => {
    expect(composeVendorBlock(VENDOR_FACTS.teams)).toContain("Microsoft Teams' terms")
    expect(composeVendorBlock(VENDOR_FACTS.teams)).not.toContain("Microsoft Teams's")
    expect(composeVendorBlock(VENDOR_FACTS.neos)).not.toContain("Neos's")
  })

  it('does not leave a comma before "before" when there is no addendum', () => {
    // practicepanther has dpa_available = unclear, so no addendum clause.
    expect(composeVendorBlock(VENDOR_FACTS.practicepanther)).toContain(
      'not used to train models before client confidential information',
    )
  })

  it('includes the addendum clause, comma-paired, when a DPA exists', () => {
    expect(composeVendorBlock(VENDOR_FACTS.clio)).toContain(
      "and shall execute Clio's data processing addendum, before client confidential",
    )
  })

  it('closes every block with Katy\'s own compliance duty', () => {
    for (const facts of ALL) {
      expect(composeVendorBlock(facts), facts.id).toMatch(
        /Use of AI-enhanced .+ shall comply with this policy\.$/,
      )
    }
  })

  it('produces well-formed prose for all 20 — no empty or doubled sentences', () => {
    for (const facts of ALL) {
      const sentences = composeVendorSentences(facts)
      expect(sentences.length, facts.id).toBeGreaterThan(1)
      for (const s of sentences) {
        expect(s.trim(), facts.id).not.toBe('')
        expect(s.trim(), facts.id).toMatch(/\.$/)
        expect(s, facts.id).not.toContain('  ')
        expect(s, facts.id).not.toContain('undefined')
        expect(s, facts.id).not.toContain('null')
      }
      // No sentence repeated within a block.
      expect(new Set(sentences).size, facts.id).toBe(sentences.length)
    }
  })

  it('is deterministic', () => {
    for (const facts of ALL) {
      expect(composeVendorBlock(facts)).toBe(composeVendorBlock(facts))
    }
  })

  it('handles a vendor with no AI features', () => {
    // No row answers this today; the branch still has to be right.
    const none: VendorFacts = { ...VENDOR_FACTS.clio, hasAi: 'no', displayName: 'Acme' }
    expect(composeVendorBlock(none)).toBe(
      'Acme does not provide AI features. Use of AI-enhanced Acme shall comply with this policy.',
    )
  })
})

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

describe('routing between researched and generic', () => {
  it('gives a researched vendor its composed block', () => {
    const { text, source } = platformText('clio', 'Clio')
    expect(source).toBe('researched')
    expect(text).toBe(composeVendorBlock(VENDOR_FACTS.clio))
  })

  it('gives an "other:" free-text platform the generic block', () => {
    // A firm can type anything; it will never have a CSV row.
    const { text, source } = platformText('other:Leap', 'Leap')
    expect(source).toBe('generic')
    expect(text).toBe(genericPlatformText('Leap'))
  })

  it('falls back to generic for an option value with no row', () => {
    // The property the brief describes: an unresearched vendor is harmless.
    expect(vendorFacts('some_new_platform')).toBeNull()
    const { source } = platformText('some_new_platform', 'Some New Platform')
    expect(source).toBe('generic')
  })

  it('renders the generic possessive correctly for a name ending in s', () => {
    expect(genericPlatformText('Acme Systems')).toContain("Acme Systems' AI features")
    expect(genericPlatformText('Acme Systems')).not.toContain("Acme Systems's")
  })

  it('marks every researched platform as researched through the expansion', () => {
    const blocks = platformBlocks('case_mgmt', ['clio', 'smokeball', 'other:Leap'])
    expect(blocks.map((b) => [b.value, b.source])).toEqual([
      ['clio', 'researched'],
      ['smokeball', 'researched'],
      ['other:Leap', 'generic'],
    ])
  })
})
