// =============================================================================
// Transcription fidelity.
//
// 🔴 THIS IS THE TEST THAT MATTERS MOST IN lib/policy.
//
// Every block marked `verbatim` claims to be Katy's words, copied from
// .planning/AI-Policy-Research-2026-08-20.md at a stated line. This test opens
// that file and checks the claim. A paraphrase, a "clarified" sentence, or a
// silently fixed typo fails here.
//
// Why it is worth the file I/O: policy text that reads plausibly but is not
// what the attorney wrote is the single worst defect this layer can ship, and
// it is invisible to every other kind of test. Reviewers cannot reliably catch
// a reworded clause by eye either — they would have to hold both documents open
// and diff them by hand, for 38 clauses, on every change.
//
// ── Normalisation, and its limits ───────────────────────────────────────────
// The source is markdown: nearly every line is wrapped in `**`, brackets are
// escaped `\[`, and nested items carry tabs and `\-` bullets. None of that is
// policy language, so it is stripped from BOTH sides before comparison.
//
// Nothing else is touched. Spacing inside a sentence, punctuation, curly
// quotes and Katy's typos ("pr" for "or", "risks or AI", "Enterpirse") all
// have to match exactly.
// =============================================================================

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { allBlocks, SPINE } from '@/lib/policy/spine'

const SOURCE_PATH = join(
  process.cwd(),
  '.planning',
  'AI-Policy-Research-2026-08-20.md',
)

const SOURCE_LINES = readFileSync(SOURCE_PATH, 'utf8').split('\n')

/** Strip markdown artefacts that are not policy language. */
function normalise(text: string): string {
  return text
    .replace(/\*\*/g, '') // bold wrappers
    .replace(/\\/g, '') // escaped brackets and bullets: \[ \] \- \<
    .replace(/\t/g, '') // nested-list indentation
    .trim()
}

const verbatimBlocks = allBlocks().filter(
  (b): b is typeof b & { text: { kind: 'verbatim'; text: string; sourceLine: number } } =>
    b.text.kind === 'verbatim',
)

describe('the policy source document', () => {
  it('is present and is the full version, including the operative draft', () => {
    // G-B0: the committed .txt was missing Part 1 entirely. The .md is the copy
    // that carries it, and every source line below is an offset into this file —
    // so if the wrong version is ever committed, this fails first and loudly
    // rather than every line number silently pointing at the wrong text.
    expect(SOURCE_LINES.length).toBeGreaterThan(800)
    expect(SOURCE_LINES[263]).toContain('ARTIFICIAL INTELLIGENCE POLICY FOR')
    expect(SOURCE_LINES[345]).toContain('Preamble')
  })
})

describe('every verbatim block is genuinely transcribed', () => {
  it('has blocks to check', () => {
    // Guards against the whole suite passing vacuously if the filter breaks.
    expect(verbatimBlocks.length).toBeGreaterThanOrEqual(9)
  })

  it.each(verbatimBlocks.map((b) => [b.id, b] as const))(
    '%s matches its source line',
    (_id, block) => {
      const line = SOURCE_LINES[block.text.sourceLine - 1]
      expect(line, `no line ${block.text.sourceLine} in the source`).toBeDefined()

      const sourceText = normalise(line)
      const blockText = normalise(block.text.text)

      // Containment, not equality: a source line may carry a bracketed
      // instruction alongside the clause (P6 at line 274 is exactly this), and
      // the block legitimately transcribes only the clause half.
      expect(
        sourceText,
        `Block "${block.id}" claims to transcribe line ${block.text.sourceLine}, but its text ` +
          `does not appear there.\n\n  block:  ${blockText}\n  source: ${sourceText}\n`,
      ).toContain(blockText)
    },
  )
})

describe('source line references', () => {
  it('every declared source line exists in the document', () => {
    for (const block of allBlocks()) {
      const line = block.text.kind === 'perPlatform' ? block.text.sourceLine : block.text.sourceLine
      if (line === null) continue
      expect(SOURCE_LINES[line - 1], `block "${block.id}" cites line ${line}`).toBeDefined()
      expect(
        SOURCE_LINES[line - 1].trim(),
        `block "${block.id}" cites line ${line}, which is blank`,
      ).not.toBe('')
    }
  })
})

describe('TODO blocks name where the text should come from', () => {
  it('cites a source line, or says explicitly that Katy wrote none', () => {
    const todos = allBlocks().filter((b) => b.text.kind === 'todo')
    expect(todos.length).toBeGreaterThan(0)

    for (const block of todos) {
      if (block.text.kind !== 'todo') continue
      // A null line is allowed only for the gaps where there is genuinely no
      // instruction in the source — the unbuilt questions G-Q6, G-Q8, G-Q9.
      if (block.text.sourceLine === null) {
        expect(block.text.reason, `block "${block.id}"`).toMatch(/G-Q\d/)
      } else {
        expect(block.text.reason.length, `block "${block.id}" needs a reason`).toBeGreaterThan(20)
      }
    }
  })
})

describe('provenance', () => {
  it('every block names the clause it came from', () => {
    // A block with no provenance is a block someone invented.
    for (const block of allBlocks()) {
      expect(block.clause, `block "${block.id}"`).toBeTruthy()
    }
  })

  it('covers Part 1 clauses P1-P38 that the spine claims', () => {
    const clauses = allBlocks()
      .map((b) => b.clause)
      .filter((c) => /^P\d+$/.test(c))
    // Every P# appears at most once — P23/P31 are merged into one block whose
    // clause is "P23 + P31 (merged)" and so is excluded by the regex above.
    expect(new Set(clauses).size).toBe(clauses.length)
  })

  it('declares 22 sections', () => {
    expect(SPINE).toHaveLength(22)
  })
})
