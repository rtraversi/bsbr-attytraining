#!/usr/bin/env node
// =============================================================================
// deliver-policy — review a firm's assembled AI policy, and release it.
//
// The operator surface for the delivery flow. There is no console in the app
// and no cross-firm role in the deployed product, by decision (Max,
// 2026-09-01), following the rule scripts/dev-seed-firm.mjs states plainly:
// "a script cannot leak, because it is not deployed."
//
//   deliver-policy --list
//   deliver-policy --render  <session-id>
//   deliver-policy --deliver <session-id> [--note "…"] [--force-todos]
//
// ── 🔴 THE GUARD IS INVERTED FROM dev-seed-firm.mjs, AND ON PURPOSE ─────────
//
// That script REFUSES to run anywhere but staging, because it mints fake firms
// and a fake firm on production is a fake customer in every revenue number.
//
// This one must eventually run against PRODUCTION — releasing a real policy to
// a real firm is its entire job. So it cannot refuse; it has to make the target
// impossible to be wrong about instead. Every write prints the project ref, the
// environment's own name for itself, the firm and the session, and then stops
// for a typed confirmation.
//
// There is deliberately NO --yes and NO --force flag. An operator releasing a
// legal document to a law firm can type the firm's name.
//
// ⚠️ ON PRODUCTION THE CONFIRMATION ALSO REQUIRES A TTY, so it cannot be fed
// from a pipe or a CI job. Staging deliberately allows a pipe — the delivery
// flow has to be exercisable end to end, and that is exactly the environment
// where an automated run is harmless. The asymmetry is the point: the check
// that cannot be scripted is on the database where a mistake reaches a real
// firm.
//
// ── What "delivery" is ──────────────────────────────────────────────────────
//
// An APPROVAL. Since 2026-09-01 `delivered` is the only state in which
// /dashboard/policy shows a firm its document — a submitted intake gets a
// waiting screen. Marking delivered is an attorney saying the assembled policy
// is fit to be read, and 0032 records who said it.
//
// The review depth is APPROVE AS GENERATED. There is no per-firm editing here
// and there must not be: wording problems are fixed in lib/policy/blocks, where
// every firm benefits and the "same answers, same document" guarantee in
// assemble.ts survives.
//
// Usage (reads .env.local, or .env.prod when that is the target):
//
//   dotenv -e .env.local -- node scripts/deliver-policy.mjs --list
// =============================================================================

import { createInterface } from 'node:readline/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createClient } from '@supabase/supabase-js'

const ROOT = join(import.meta.dirname, '..')
const OUT_DIR = join(ROOT, 'out')

// ── Loading the TypeScript modules ─────────────────────────────────────────
//
// Node 26 strips types natively, so lib/**.ts runs unmodified; what it does not
// do is resolve `@/…` or TypeScript's extensionless imports. Same hook as
// scripts/render-policy.mjs — see that file for why this is not a two-liner.
//
// ⚠️ IT CANNOT LOAD .tsx. Node's type stripping does not parse JSX, which is
// why lib/policy/delivery-email.ts imports the email template lazily and keeps
// its copy-approved flag in a .ts file. Do not add a static .tsx import to
// anything this script reaches.

function probe(base) {
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base = null
    if (specifier.startsWith('@/')) base = join(ROOT, specifier.slice(2))
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      base = join(dirname(fileURLToPath(context.parentURL)), specifier)
    }
    if (base) {
      const hit = probe(base)
      if (hit) {
        return { url: pathToFileURL(hit).href, format: 'module-typescript', shortCircuit: true }
      }
    }
    return nextResolve(specifier, context)
  },
})

const { assemble } = await import('@/lib/policy/assemble')
const { loadAnswers } = await import('@/lib/intake/session')
const { markDelivered, pendingDeliveries } = await import('@/lib/policy/delivery')
const { sendPolicyDeliveredEmail } = await import('@/lib/policy/delivery-email')
const { actionItemParagraphs, docx, policyParagraphs } = await import('@/lib/policy/docx')
const { normalizeFirmName } = await import('@/lib/firm-name')

// ── Environment ────────────────────────────────────────────────────────────

const STAGING_REF = 'ndmzvtuywcufvkxtkjhg'
const PROD_REF = 'ttqthtzdjacrhjtrcmmy'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function die(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  die(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      '  Run through dotenv:  dotenv -e .env.local -- node scripts/deliver-policy.mjs --list',
  )
}

// Read from the URL actually loaded, never from an argument. An argument states
// an intention; this states what the connection will be.
const projectRef = (() => {
  try {
    return new URL(SUPABASE_URL).hostname.split('.')[0]
  } catch {
    return null
  }
})()

const envName =
  projectRef === PROD_REF
    ? '🔴 PRODUCTION'
    : projectRef === STAGING_REF
      ? 'staging'
      : '⚠️ UNRECOGNISED PROJECT'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Arguments ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const has = (name) => argv.includes(`--${name}`)
const value = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i !== -1 && i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[i + 1] : null
}

const USAGE = `
  deliver-policy — review and release a firm's assembled AI policy

    --list                              firms waiting for review
    --render  <session-id>              write the documents to out/ and read them
    --deliver <session-id>              approve and release; asks for confirmation
       --note "…"                       recorded against the delivery
       --force-todos                    release a policy with unwritten clauses

  Target is whatever env file you load. Currently: ${envName} (${projectRef ?? 'unparseable'})
`

// ── Commands ───────────────────────────────────────────────────────────────

const dateOf = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '—')

async function list() {
  const queue = await pendingDeliveries(admin)

  console.log(`\n  Delivery queue — ${envName} (${projectRef})\n`)
  if (queue.length === 0) {
    console.log('  Nothing waiting.\n')
    return
  }

  for (const item of queue) {
    // A resubmission is called out rather than left to be inferred from two
    // dates. It is the D8-2 case: this firm already HAS a policy, edited its
    // answers, and is waiting on a revision — which reads very differently from
    // a firm that has never been delivered to.
    const again = item.previouslyDeliveredAt
      ? `  ⟲ RESUBMITTED (previously delivered ${dateOf(item.previouslyDeliveredAt)})`
      : ''
    console.log(`  ${item.firmName}${again}`)
    console.log(`    session    ${item.sessionId}`)
    console.log(`    submitted  ${dateOf(item.submittedAt)}`)
    console.log(
      `    policy     ${item.verbatimBlocks} clauses` +
        (item.todoBlocks > 0 ? `, ⚠️ ${item.todoBlocks} UNWRITTEN` : '') +
        `, ${item.actionItems} action items`,
    )
    console.log('')
  }
  console.log(`  ${queue.length} waiting.\n`)
}

async function findSession(sessionId) {
  const { data } = await admin
    .from('intake_sessions')
    .select('id, firm_id, status, submitted_at, policy_delivered_at')
    .eq('id', sessionId)
    .maybeSingle()
  if (!data) die(`No intake session ${sessionId} on ${envName}.`)

  const { data: firm } = await admin
    .from('firms')
    .select('name, owner_id')
    .eq('id', data.firm_id)
    .maybeSingle()

  // 🔴 The NORMALISED name or null — deliberately NOT a display fallback.
  //
  // This used to be `firm?.name ?? '(unknown firm)'`, and `??` does not fire on
  // an empty string. Since the Stripe webhook began creating firms with
  // name: '' (2026-09-02), a blank name reached the confirmation prompt as
  // `Type the firm name to confirm (""):` — and pressing ENTER passed it,
  // because '' === ''. A bare Enter released a policy.
  //
  // Callers decide what a missing name means. deliver() refuses; the read-only
  // paths may print a placeholder, because printing one cannot release
  // anything.
  return {
    session: data,
    firmName: normalizeFirmName(firm?.name),
    ownerId: firm?.owner_id ?? null,
  }
}

async function renderTo(sessionId) {
  const { session, firmName: storedName } = await findSession(sessionId)
  // Read-only: this writes files to disk and releases nothing, so a placeholder
  // is safe here in a way it is not in deliver().
  const firmName = storedName ?? '(unnamed firm)'
  const result = assemble(await loadAnswers(admin, session.id))
  const blocks = result.policy.sections.flatMap((s) => s.blocks)
  const todo = blocks.filter((b) => b.status === 'todo').length

  mkdirSync(OUT_DIR, { recursive: true })
  const slug = sessionId.slice(0, 8)

  // Markdown for reading in a terminal or a diff; .docx because that is the
  // deliverable and the only way to see what the firm actually receives.
  const md = [`# Artificial Intelligence Policy for ${firmName}`, '']
  for (const section of result.policy.sections) {
    md.push(`## §${section.number} ${section.title}`, '')
    for (const block of section.blocks) {
      md.push(block.status === 'todo' ? `> ⚠️ **${block.text}**` : block.text, '')
    }
  }

  const written = [
    [join(OUT_DIR, `delivery-${slug}.md`), md.join('\n')],
    [join(OUT_DIR, `delivery-${slug}.docx`), docx(policyParagraphs(result.policy, firmName))],
    [
      join(OUT_DIR, `delivery-${slug}-action-items.docx`),
      docx(actionItemParagraphs(result.actionItems, firmName)),
    ],
  ]
  for (const [path, body] of written) writeFileSync(path, body)

  console.log(`\n  ${firmName} — session ${sessionId}\n`)
  console.log(`    ${result.policy.sections.length} sections, ${blocks.length} clauses`)
  console.log(`    ${blocks.length - todo} written, ${todo} UNWRITTEN`)
  console.log(`    ${result.actionItems.length} action items\n`)
  for (const [path] of written) console.log(`    ${relative(ROOT, path)}`)
  console.log('')
  if (todo > 0) {
    console.log(`  ⚠️  ${todo} clauses are unwritten. --deliver will refuse without --force-todos.\n`)
  }
}

async function deliver(sessionId) {
  const { session, firmName, ownerId } = await findSession(sessionId)

  // 🔴 REFUSE ON A BLANK NAME. Do not substitute a display string here.
  //
  // The confirmation below is "type the firm name", and it is the only thing
  // standing between this command and an irreversible delivery. With no name
  // there is nothing to type, so the check degrades to pressing Enter — the
  // prompt stops being a check at all.
  //
  // A blank name is also a real signal in its own right: firms are created with
  // name: '' and it is filled in at onboarding, so a firm that reached a
  // submitted intake without one has something wrong with it that wants looking
  // at before a policy goes out with a nameless title page.
  if (!firmName) {
    die(
      `Firm for session ${sessionId} has no name on ${envName}.\n` +
        '  Refusing to deliver: the confirmation prompt asks the operator to type the\n' +
        '  firm name, and there is nothing to type. Set firms.name first.',
    )
  }

  const result = assemble(await loadAnswers(admin, session.id))
  const todo = result.policy.sections
    .flatMap((s) => s.blocks)
    .filter((b) => b.status === 'todo').length

  // ── The confirmation ─────────────────────────────────────────────────────
  //
  // Everything that could be wrong, printed, before anything is written: which
  // database, which firm, and what state the document is in. Typing the firm's
  // name is the check — a y/n prompt is answered reflexively and does not prove
  // the operator read which firm this is.
  console.log(`\n  ═══ RELEASE A POLICY ═══\n`)
  console.log(`    target     ${envName}  (${projectRef})`)
  console.log(`    firm       ${firmName}`)
  console.log(`    session    ${sessionId}`)
  console.log(`    submitted  ${dateOf(session.submitted_at)}`)
  if (session.policy_delivered_at) {
    console.log(`    ⟲ REVISION — previously delivered ${dateOf(session.policy_delivered_at)}`)
  }
  console.log(
    `    policy     ${result.policy.sections.length} sections` +
      (todo > 0 ? `, ⚠️ ${todo} UNWRITTEN CLAUSES` : ''),
  )
  if (todo > 0 && !has('force-todos')) {
    console.log(`\n  This will be refused: ${todo} unwritten clauses and no --force-todos.\n`)
  }
  console.log('')

  // See the header. A piped confirmation is fine on staging and refused on
  // production, where the whole value of the prompt is that a human read it.
  if (projectRef === PROD_REF && !process.stdin.isTTY) {
    die(
      'Refusing to deliver on PRODUCTION without an interactive terminal.\n' +
        '  The confirmation exists to be read by a person. Run this by hand.',
    )
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const typed = await rl.question(`  Type the firm name to confirm ("${firmName}"): `)
  rl.close()

  if (typed.trim() !== firmName) {
    die('Not confirmed. Nothing was written.')
  }

  const outcome = await markDelivered(admin, sessionId, ownerId, {
    note: value('note'),
    force: has('force-todos'),
  })

  if (!outcome.ok) {
    die(`${outcome.reason}: ${outcome.message}`)
  }

  console.log(`\n  ✓ Delivered — ${outcome.firmName} at ${outcome.deliveredAt}`)

  // ── The notification ─────────────────────────────────────────────────────
  //
  // AFTER the write, and it cannot undo it. A firm whose policy was approved
  // has an approved policy whether or not the mail went out. What matters is
  // that the operator is TOLD when nobody was emailed, because then they are
  // the only one who can tell the firm.
  let adminEmail = null
  if (ownerId) {
    const { data } = await admin.auth.admin.getUserById(ownerId)
    adminEmail = data?.user?.email ?? null
  }

  const notice = await sendPolicyDeliveredEmail({ to: adminEmail, firmName: outcome.firmName })
  if (notice.sent) {
    console.log(`    emailed ${adminEmail}\n`)
  } else {
    console.log(`\n  ⚠️  NOT EMAILED — ${notice.reason}`)
    console.log(`      ${notice.detail}`)
    console.log(`      The policy IS delivered. ${adminEmail ?? 'The firm'} has not been told.\n`)
  }
}

// ── Dispatch ───────────────────────────────────────────────────────────────

if (has('list')) {
  await list()
} else if (has('render')) {
  const id = value('render')
  if (!id) die('--render needs a session id.')
  await renderTo(id)
} else if (has('deliver')) {
  const id = value('deliver')
  if (!id) die('--deliver needs a session id.')
  await deliver(id)
} else {
  console.log(USAGE)
  process.exit(1)
}
