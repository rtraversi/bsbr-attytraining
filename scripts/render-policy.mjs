#!/usr/bin/env node
// =============================================================================
// Render a fixture firm's policy to Markdown, so a human can read it.
//
// Run:  node scripts/render-policy.mjs minimal
//       node scripts/render-policy.mjs            (renders every fixture)
//
// Writes to out/, which is already gitignored. FOUR files per fixture: the
// policy and the action item list (D2), each as .md and as .docx.
//
// ── Two formats, two audiences ──────────────────────────────────────────────
// The .docx is the DELIVERABLE (D8-5, Katy: never a static PDF — the firm has
// to be able to edit it, or hand it to their own AI for more customisation).
// The .md is the REVIEW COPY: it diffs, it pastes into a message, and it is
// what makes a change to lib/policy legible without opening Word. Neither is
// derived from the other — both come straight from assemble(), so the Markdown
// cannot drift into a second account of what the firm receives.
//
// ── Why this exists ─────────────────────────────────────────────────────────
// The assembler is covered by 371 tests, and every one of them asserts about a
// block id, a section number or a substring. None of them shows what the
// document READS like end to end, which is the only question Katy can actually
// answer. This turns assemble()'s output into something she can be shown.
//
// 🔴 THIS SCRIPT WRITES NO POLICY PROSE. Every sentence in its output came out
// of assemble(). What is added is structure — headings, numbering, the TODO
// framing and the footer count — and nothing that a firm would read as a rule.
// The transcription rule that governs lib/policy/blocks/ governs this file too:
// the moment a renderer starts supplying language, the delivered document
// contains text no one transcribed from Katy.
//
// ── Two documents, not one (D2) ─────────────────────────────────────────────
// The action item list is written to its own file. Merging it into the policy
// would put a list of what the firm has NOT done inside the document the firm
// adopts — see the header of lib/policy/action-items.ts, which is where that
// decision is argued. This script therefore never emits an "Action items"
// section inside the policy, even when the list is empty.
//
// ── Running .ts from a plain .mjs ───────────────────────────────────────────
// Node 26 strips types natively, so lib/policy/*.ts runs unmodified. What it
// does NOT do is resolve `@/…` or TypeScript's extensionless imports, so the
// resolve hook below supplies both. That is the whole reason this is not a
// two-line script: the alternative was adding tsx purely to run a preview tool.
// =============================================================================

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(import.meta.dirname, '..')
const OUT_DIR = join(ROOT, 'out')

// ---------------------------------------------------------------------------
// Module resolution
// ---------------------------------------------------------------------------

/**
 * Find the file a TypeScript-style extensionless specifier means.
 *
 * Order matters: `foo.ts` wins over `foo/index.ts`, which is what tsc does.
 */
function probe(base) {
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base = null
    if (specifier.startsWith('@/')) {
      // The `@/*` → `./*` mapping from tsconfig.json, which Node knows nothing
      // about. Kept in step with that file by hand; there is one mapping.
      base = join(ROOT, specifier.slice(2))
    } else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      base = join(dirname(fileURLToPath(context.parentURL)), specifier)
    }

    if (base) {
      const hit = probe(base)
      // `module-typescript` is not decoration. Without a format Node tries the
      // file as CommonJS first and prints a MODULE_TYPELESS_PACKAGE_JSON warning
      // for every module in the graph; with plain `module` it skips type
      // stripping and dies on the first `type` specifier it meets.
      if (hit) {
        return { url: pathToFileURL(hit).href, format: 'module-typescript', shortCircuit: true }
      }
    }
    return nextResolve(specifier, context)
  },
})

const { assemble } = await import('@/lib/policy/assemble')
const { policyDocuments } = await import('@/lib/policy/docx')
const { FIXTURES, FIXTURE_NAMES } = await import('@/lib/policy/fixtures')

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

/**
 * How a TODO block is set apart on the page.
 *
 * A blockquote, because it has to be impossible to mistake for policy language
 * when someone scrolls past it — assemble() already makes the text loud, and
 * this keeps it loud after Markdown rendering. The block stays exactly where it
 * falls in the section: dropping unwritten clauses would make a half-drafted
 * section look finished, which is the one thing a reviewer must not conclude.
 */
function renderTodo(text) {
  return `> ⚠️ **${text}**`
}

function renderBlock(block) {
  return block.status === 'todo' ? renderTodo(block.text) : block.text
}

function renderPolicy(fixtureName, result) {
  const { sections } = result.policy
  const firmName = FIXTURES[fixtureName].firm_name ?? '(no firm name answered)'
  const blocks = sections.flatMap((section) => section.blocks)
  const verbatim = blocks.filter((b) => b.status === 'verbatim').length
  const todo = blocks.filter((b) => b.status === 'todo').length

  const lines = [`# Artificial Intelligence Policy for ${firmName}`, '']

  for (const section of sections) {
    // Spine numbers, not sequential ones. A firm that skips a section keeps the
    // gap, so two firms citing "§11" always mean the same rule — assemble()'s
    // header makes the same point about renumbering.
    lines.push(`## §${section.number} ${section.title}`, '')
    for (const block of section.blocks) {
      lines.push(renderBlock(block), '')
    }
  }

  lines.push(
    '---',
    '',
    footer(sections.length, verbatim, todo),
    '',
    `Rendered by \`scripts/render-policy.mjs\` from the \`${fixtureName}\` fixture. ` +
      'Preview only — not a deliverable.',
    '',
  )

  return { markdown: lines.join('\n'), verbatim, todo, sectionCount: sections.length }
}

/**
 * The counting line.
 *
 * This is the number the whole preview is for. §5–§22 are largely untranscribed,
 * and a reader scrolling a long document will not tally the blockquotes — so the
 * ratio is stated outright at the bottom of every render.
 */
function footer(sectionCount, verbatim, todo) {
  const total = verbatim + todo
  const pct = total === 0 ? 0 : Math.round((verbatim / total) * 100)
  return (
    `**${sectionCount} sections · ${total} blocks — ${verbatim} verbatim, ${todo} TODO ` +
    `(${pct}% transcribed).**`
  )
}

/**
 * The second document (D2).
 *
 * Written even when the list is empty, and says so. A missing file reads as
 * "the renderer did not run"; an empty one reads as "this firm has no
 * homework", and those are different facts.
 */
function renderActionItems(fixtureName, result) {
  const items = result.actionItems
  const firmName = FIXTURES[fixtureName].firm_name ?? '(no firm name answered)'

  const lines = [
    `# Action Items for ${firmName}`,
    '',
    'Separate from the AI policy — see `lib/policy/action-items.ts`.',
    '',
  ]

  if (items.length === 0) {
    lines.push(
      'No action items — this firm answered "not sure" to none of the three questions that',
      'produce one (`case_mgmt_ai`, `notetaker_stance`, `carrier_notified`).',
      '',
    )
  } else {
    for (const item of items) {
      lines.push(`- ${renderTodo(item.text)}`, `  <sub>from \`${item.fromKey}\`</sub>`, '')
    }
  }

  const todo = items.filter((i) => i.status === 'todo').length
  lines.push(
    '---',
    '',
    `**${items.length} action items — ${items.length - todo} verbatim, ${todo} TODO.**`,
    '',
    `Rendered by \`scripts/render-policy.mjs\` from the \`${fixtureName}\` fixture. ` +
      'Preview only — not a deliverable.',
    '',
  )

  return { markdown: lines.join('\n'), todo }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const requested = process.argv.slice(2)
const unknown = requested.filter((name) => !(name in FIXTURES))
if (unknown.length > 0) {
  console.error(
    `Unknown fixture(s): ${unknown.join(', ')}\nAvailable: ${FIXTURE_NAMES.join(', ')}`,
  )
  process.exit(1)
}

const names = requested.length > 0 ? requested : FIXTURE_NAMES
mkdirSync(OUT_DIR, { recursive: true })

for (const name of names) {
  const result = assemble(FIXTURES[name])
  const firmName = FIXTURES[name].firm_name ?? '(no firm name answered)'
  const pad = ' '.repeat(name.length + 1)

  const policy = renderPolicy(name, result)
  const policyPath = join(OUT_DIR, `policy-${name}.md`)
  writeFileSync(policyPath, policy.markdown, 'utf8')

  const actions = renderActionItems(name, result)
  const actionsPath = join(OUT_DIR, `policy-${name}-action-items.md`)
  writeFileSync(actionsPath, actions.markdown, 'utf8')

  // The deliverables. Two documents, never merged — D2, and the same split the
  // Markdown above makes, from the same assemble() call.
  const documents = policyDocuments(result, firmName)
  const policyDocxPath = join(OUT_DIR, `policy-${name}.docx`)
  const actionsDocxPath = join(OUT_DIR, `policy-${name}-action-items.docx`)
  writeFileSync(policyDocxPath, documents.policy)
  writeFileSync(actionsDocxPath, documents.actionItems)

  console.log(
    `${name}: ${relative(ROOT, policyPath)} — ${policy.sectionCount} sections, ` +
      `${policy.verbatim} verbatim, ${policy.todo} TODO`,
  )
  console.log(`${pad} ${relative(ROOT, policyDocxPath)} — ${documents.policy.length} bytes`)
  console.log(
    `${pad} ${relative(ROOT, actionsPath)} — ${result.actionItems.length} action items`,
  )
  console.log(`${pad} ${relative(ROOT, actionsDocxPath)} — ${documents.actionItems.length} bytes`)
}
