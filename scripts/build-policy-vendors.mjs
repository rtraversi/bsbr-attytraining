#!/usr/bin/env node
// =============================================================================
// Generate lib/policy/vendor-data.ts from .planning/policy-blocks.csv.
//
// Run:  node scripts/build-policy-vendors.mjs
//
// ── Why a generated module rather than reading the CSV at runtime ───────────
// The assembler runs in a Cloudflare Worker, where there is no filesystem to
// read a planning document from. D1 also settles that prepared module text
// lives in versioned files in the repo. So the CSV stays the source of truth
// for the RESEARCH, and this script projects it into the source of truth for
// the CODE.
//
// Drift between the two is caught by tests/policy-vendor-data.test.ts, which
// re-reads the CSV and compares. If that test fails, re-run this script.
//
// ⚠️ Only the columns the policy layer actually uses are projected. Deliberately
// dropped: quoted_sentence, source_url_2 and notes. Those are the researcher's
// evidence and working notes — they belong in the CSV where a reviewer can
// check them, not in a document delivered to a firm.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const CSV = join(ROOT, '.planning', 'policy-blocks.csv')
const OUT = join(ROOT, 'lib', 'policy', 'vendor-data.ts')

/** Minimal RFC-4180 reader: quoted fields, doubled quotes, embedded commas. */
function parseCsv(text) {
  const rows = []
  let row = []
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

const [header, ...body] = parseCsv(readFileSync(CSV, 'utf8'))
const records = body.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])))

/** A cell that is blank means "not recorded", which reads the same as unclear. */
const tri = (v) => (v === '' ? 'unclear' : v)
const orNull = (v) => (v === '' ? null : v)

const vendors = records.map((r) => ({
  id: r.id,
  displayName: r.display_name,
  category: r.category,
  hasAi: tri(r.has_ai),
  aiFeatureName: orNull(r.ai_feature_name),
  aiOnByDefault: tri(r.ai_on_by_default),
  trainsOnCustomerData: tri(r.trains_on_customer_data),
  optoutAvailable: tri(r.optout_available),
  optoutLocation: orNull(r.optout_location),
  dpaAvailable: tri(r.dpa_available),
  dpaRequiresPlan: orNull(r.dpa_requires_plan),
  sourceUrl: r.source_url_1,
  dateChecked: r.date_checked,
}))

const lit = (v) => (v === null ? 'null' : JSON.stringify(v))

const out = `// =============================================================================
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

/** Three-state answer. A blank cell in the CSV is read as \`unclear\`. */
export type VendorTri = 'yes' | 'no' | 'unclear'

/** Training answer. \`no_by_contract\` means only under a signed DPA. */
export type VendorTraining = 'yes' | 'no' | 'no_by_contract' | 'unclear'

/** Four-state answer, where \`n_a\` means the question does not apply. */
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

/** Keyed by the intake option value, which is also the CSV \`id\`. */
export const VENDOR_FACTS: Readonly<Record<string, VendorFacts>> = {
${vendors
  .map(
    (v) => `  ${v.id}: {
    id: ${lit(v.id)},
    displayName: ${lit(v.displayName)},
    category: ${lit(v.category)},
    hasAi: ${lit(v.hasAi)},
    aiFeatureName: ${lit(v.aiFeatureName)},
    aiOnByDefault: ${lit(v.aiOnByDefault)},
    trainsOnCustomerData: ${lit(v.trainsOnCustomerData)},
    optoutAvailable: ${lit(v.optoutAvailable)},
    optoutLocation: ${lit(v.optoutLocation)},
    dpaAvailable: ${lit(v.dpaAvailable)},
    dpaRequiresPlan: ${lit(v.dpaRequiresPlan)},
    sourceUrl: ${lit(v.sourceUrl)},
    dateChecked: ${lit(v.dateChecked)},
  },`,
  )
  .join('\n')}
}

/** Facts for one intake option value, or null when the vendor is unresearched. */
export function vendorFacts(value: string): VendorFacts | null {
  return Object.prototype.hasOwnProperty.call(VENDOR_FACTS, value)
    ? VENDOR_FACTS[value]
    : null
}
`

writeFileSync(OUT, out)
console.log(`wrote ${OUT} — ${vendors.length} vendors`)
