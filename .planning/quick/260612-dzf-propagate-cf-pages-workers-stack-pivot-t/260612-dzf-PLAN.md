---
phase: quick
plan: 260612-dzf
type: execute
wave: 1
depends_on: []
files_modified:
  - CLAUDE.md
  - .planning/STATE.md
  - .planning/research/STACK.md
  - .planning/research/ARCHITECTURE.md
  - .planning/research/PITFALLS.md
  - .planning/research/SUMMARY.md
  - .planning/research/FEATURES.md
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
autonomous: true
requirements: []

must_haves:
  truths:
    - "CLAUDE.md Technology Stack section describes the Cloudflare Pages + CF Workers + custom React quiz stack, with zero Netlify/n8n/H5P guidance presented as current"
    - "CLAUDE.md trailing sections (Conventions, Architecture, Project Skills, GSD Workflow Enforcement, Developer Profile, Session handoff) are byte-for-byte unchanged"
    - "All five superseded research docs carry a STACK-SUPERSEDED banner immediately after their H1 title"
    - "STATE.md Open Decisions no longer references n8n monitoring; it references a CF Worker health endpoint uptime monitor"
    - "Pre-existing uncommitted edits to PROJECT.md, REQUIREMENTS.md, ROADMAP.md are committed unchanged (not reverted)"
  artifacts:
    - path: "CLAUDE.md"
      provides: "CF-stack project instructions"
      contains: "@cloudflare/next-on-pages"
    - path: ".planning/research/STACK.md"
      provides: "Superseded banner"
      contains: "STACK SUPERSEDED"
  key_links:
    - from: "CLAUDE.md Technology Stack"
      to: ".planning/STATE.md Locked Decisions"
      via: "stack descriptions agree (CF Pages, CF Workers, jose, pdf-lib, custom React quiz)"
      pattern: "Cloudflare Workers"
---

<objective>
Propagate the locked 2026-06-11 stack pivot (Netlify + n8n + H5P → Cloudflare Pages via `@cloudflare/next-on-pages` + CF Workers + custom React quiz) through the remaining project docs. The source of truth is `.planning/STATE.md` "Locked Decisions"; `.planning/PROJECT.md` is already migrated in the working tree and is the reference for new constraint wording.

Purpose: Keep `CLAUDE.md` (the primary always-loaded project instruction file) and the planning docs consistent with the locked stack so no executor scaffolds against the dead Netlify/n8n/H5P stack. No code exists yet, so this is docs-only.

Output: Rewritten `CLAUDE.md` stack sections, superseded banners on five research docs, a corrected STATE.md Open Decision, and three commits that also carry the pre-existing PROJECT/REQUIREMENTS/ROADMAP migration.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@CLAUDE.md

<critical_constraints>
- This is DOCS-ONLY. No source code, no tests, no dependency installs.
- The working tree ALREADY contains uncommitted migrations of `.planning/PROJECT.md`,
  `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` to the CF stack. These are CORRECT
  and part of this same pivot. NEVER revert, rewrite, or `git checkout` them. They get
  committed as-is in Task 1.
- `CLAUDE.md` is structured with GSD section markers: `<!-- GSD:project-start … -->`,
  `<!-- GSD:project-end -->`, `<!-- GSD:stack-start … -->`, `<!-- GSD:stack-end -->`,
  etc. ALL edits to CLAUDE.md happen INSIDE the `GSD:project-*` and `GSD:stack-*` marker
  pairs. Everything from `<!-- GSD:conventions-start -->` onward (Conventions, Architecture,
  Project Skills, GSD Workflow Enforcement, Developer Profile, Session handoff) MUST remain
  byte-for-byte identical. Do not touch the marker comment lines themselves.
- Use the Edit tool for surgical changes. Do NOT regenerate whole files from memory —
  preserve all unrelated wording, links, and formatting.
</critical_constraints>

<locked_stack_reference>
Source of truth = STATE.md Locked Decisions (2026-06-11). Summary the rewrite must match:
- Frontend/hosting: Next.js 15.5 (App Router, Edge Runtime throughout) on Cloudflare Pages via `@cloudflare/next-on-pages`. No Netlify for this product.
- Automation: CF Workers for ALL automation — cert PDF gen (`pdf-lib`, pure JS, no headless browser), email (Resend REST API called from a Worker), scheduled jobs (CF Workers Cron Triggers). No n8n, no VPS.
- Stripe webhook: CF Pages Route Handler, Edge Runtime; raw body via `await req.text()`; verify with `stripe.webhooks.constructEventAsync` (Web Crypto, edge-compatible) — NOT the sync `constructEvent`; idempotency table `processed_stripe_events(event_id PK)`.
- Stream signed-URL JWTs: `jose` (edge-compatible), NOT `jsonwebtoken` (Node-only).
- Quiz: custom React component (~150–200 lines) over the Cloudflare Stream native player; postMessage events gate quiz reveal at ~95% watched; score submit → Server Action / route handler → `quiz_attempts` insert. NOT H5P, NOT Articulate Rise. H5P Path A is documented fallback ONLY if custom quiz exceeds ~5 days.
- Tooling: Wrangler CLI for dev/deploy (`wrangler pages dev`, `wrangler deploy`, secrets via `wrangler secret put` / CF dashboard). CF Pages preview deployments replace Netlify branch deploys (preview env → dev Supabase + Stripe test mode; production env → prod Supabase + Stripe live).
- ADVISORY (do NOT change the locked decision, just flag): Cloudflare now recommends `@opennextjs/cloudflare` (Workers) for new Next.js apps; `@cloudflare/next-on-pages` is in maintenance mode / Edge-Runtime-only. Team should verify the adapter choice against current CF docs before Max scaffolds — switching is free now (no code), expensive later.
</locked_stack_reference>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Commit the pre-existing planning-doc migration</name>
  <files>.planning/PROJECT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md</files>
  <action>
  The working tree already contains uncommitted edits to these three files that migrate them
  to the CF Pages + CF Workers stack (same pivot as this whole task). Do NOT modify them —
  just stage and commit them as the first commit so they are preserved and grouped with the pivot.

  Run `git status --short` first to confirm exactly these three files (plus possibly this PLAN
  directory) are dirty. Stage ONLY the three planning docs and commit:

    git add .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md
    git commit -m "docs: migrate planning docs to CF Pages + Workers stack [PROJECT/REQUIREMENTS/ROADMAP]"

  Do NOT use `git add -A` or `git add .` — other untracked planning/quick files must not be
  swept in. If any of the three shows unexpected reverted content, STOP and report rather than
  re-editing.

  Append the standard `Co-Authored-By: Claude <noreply@anthropic.com>` trailer per repo convention.
  </action>
  <verify>
    <automated>git log -1 --name-only --format="%s" | grep -q "migrate planning docs to CF Pages" &amp;&amp; git show --stat HEAD | grep -E "PROJECT.md|REQUIREMENTS.md|ROADMAP.md"</automated>
  </verify>
  <done>HEAD commit message contains "migrate planning docs to CF Pages + Workers stack" and its diffstat lists PROJECT.md, REQUIREMENTS.md, and ROADMAP.md. No other files in the commit.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite CLAUDE.md stack sections to the CF stack</name>
  <files>CLAUDE.md</files>
  <action>
  Edit ONLY content inside the `GSD:project-*` and `GSD:stack-*` marker pairs. Preserve every
  section from `<!-- GSD:conventions-start -->` onward byte-for-byte. Make these specific changes:

  CONSTRAINTS block (inside GSD:project markers):
  - frontend/hosting → "Next.js 15.5 (App Router, Edge Runtime throughout) on Cloudflare Pages via `@cloudflare/next-on-pages` — CF, not Netlify".
  - Replace the `automation` line with: API/automation → Cloudflare Workers for all serverless
    functions, cert generation, email, and scheduled jobs; no n8n, no VPS.
  - interactive video/quiz → "Custom React quiz component (~150–200 lines) over the Cloudflare
    Stream native player — no H5P, no Articulate Rise".
  - Leave pricing, target-market, compliance-framing, operator-burden, backend (Supabase), and
    video (Cloudflare Stream) constraint lines unchanged.

  CORE TECHNOLOGIES table:
  - Next.js "Why" cell: change "Current LTS on Netlify" framing to CF Pages; keep the 15.5-vs-16
    LTS rationale. Note App Router + Edge Runtime throughout (next-on-pages requires `export const
    runtime = 'edge'` on dynamic routes).
  - Replace the Netlify row with a "Cloudflare Pages + Workers" row: hosting + serverless via
    `@cloudflare/next-on-pages`; no 26-second-timeout concern; cert generation fits in a Worker
    because `pdf-lib` needs no headless browser; note Workers paid-plan CPU limits as the real
    constraint; CF Pages preview deployments give staging-vs-prod environments.
  - Replace the n8n row with a "Cloudflare Workers" automation row: all automation runs as Workers —
    Cron Triggers for scheduled jobs, Database-Webhook-triggered authenticated HTTP endpoints for
    reactive jobs, app-initiated fetch POSTs for fire-and-forget work. No VPS, no n8n.
  - Replace the H5P row with a "Custom React quiz" row: ~150–200 line component over the CF Stream
    iframe player; postMessage gates quiz reveal at ~95% watched; score submit → Server Action /
    route handler → `quiz_attempts`.
  - Add a `@cloudflare/next-on-pages` row AND a Wrangler CLI row (Wrangler may instead live in
    Development Tools — pick one; do not duplicate).
  - Add ONE clearly-marked advisory (a "⚠️ Verify before scaffold" note in the next-on-pages row or
    a callout directly under the table): Cloudflare now recommends `@opennextjs/cloudflare` (Workers)
    for new Next.js apps; `@cloudflare/next-on-pages` is in maintenance mode / Edge-Runtime-only;
    verify adapter choice against current CF docs before scaffolding — switching is free now, costly
    later. Explicitly state this does NOT change the locked decision; it is a verification flag.

  SUPPORTING LIBRARIES table:
  - Remove the `h5p-standalone` row.
  - Change `pdf-lib` from "*(fallback only)*" to PRIMARY cert-PDF library: pure JS, Workers-compatible,
    no headless browser; runs inside the cert-generation Worker.
  - Add a `jose` row: edge-compatible JWT signing for Cloudflare Stream signed URLs (replaces
    `jsonwebtoken`, which is Node-only).
  - `hls.js`: keep but note it is only needed if a custom player replaces the CF Stream iframe.
  - `react-email`: update "When to Use" so it renders HTML that a CF Worker sends via the Resend REST
    API (drop the "n8n" phrasing).
  - `zod` "Purpose": drop "H5P xAPI events" (no H5P); keep Stripe webhook + firm metadata validation.

  DEVELOPMENT TOOLS table:
  - Add a Wrangler CLI row (if not placed in Core Technologies): `wrangler pages dev` for local dev,
    `wrangler deploy`, secrets via `wrangler secret put` / CF dashboard.
  - Keep pnpm, eslint, prettier, Supabase CLI, Stripe CLI, Playwright unchanged in substance. Update
    the `dotenv-cli` / env note so Stripe + Supabase service-role + Stream signing keys are described
    as CF Pages/Workers env vars and Wrangler secrets, not "server-side only" via Netlify.

  INTEGRATION PATTERNS:
  - §1 retitle "1. Next.js 15 on Cloudflare Pages — routing & rendering split". Keep App-Router-only
    and the Next.js 15 fetch-caching gotcha. Add: Edge Runtime throughout (next-on-pages implies
    `export const runtime = 'edge'` on dynamic routes). Replace the Netlify-26s-timeout bullet with
    a note that cert PDF gen runs in a CF Worker (pdf-lib, no browser). Replace the Netlify lag/branch
    bullets with: stay on 15.5 LTS; CF Pages preview deployments replace branch deploys — preview env
    (its own env vars) → dev Supabase + Stripe test mode; production env → prod Supabase + Stripe live.
  - §3 (Cloudflare Stream): replace the H5P Path A / Path B wording with the custom-React-quiz framing —
    CF Stream iframe + a custom React quiz component below it; postMessage drives quiz reveal at ~95%.
  - §4 (Stripe): keep tiers/portal. Update the webhook bullets: Route Handler on Edge Runtime, raw body
    via `await req.text()`, verify with `stripe.webhooks.constructEventAsync` (Web Crypto — the sync
    `constructEvent` uses Node crypto, unavailable on edge); idempotency via `processed_stripe_events`.
  - §5 retitle "5. Cloudflare Workers — automation runtime". Rebuild the event-source table:
    Supabase Database Webhook → authenticated POST to a Worker endpoint (validate `X-Webhook-Secret`
    header, 401 on mismatch); app-initiated `fetch()` POST from a Route Handler (fire-and-forget work);
    CF Workers Cron Triggers for scheduled jobs (expiry reminders at 90/30/7 days; 5-min drain of a
    `cert_generation_queue` dead-letter queue); "reprint" link → Worker re-signs the Storage URL.
    Replace the N8N_ENCRYPTION_KEY / reverse-proxy / backup bullets with: secrets via `wrangler secret
    put` / CF dashboard; shared-secret header on inbound webhooks; Workers state is stateless (no DB to
    back up).
  - §6 retitle to the custom-React-quiz decision. Replace the H5P-vs-Rise table/prose with: quiz is a
    ~150–200 line React component over the CF Stream iframe; postMessage gates reveal at ~95% watched;
    score submit → Server Action / route handler → `quiz_attempts` insert. State H5P Path A (CF iframe +
    H5P Question Set) is the documented fallback ONLY if the custom quiz exceeds ~5 days of work.

  ALTERNATIVES CONSIDERED table:
  - Top row: "Next.js on Cloudflare Pages" vs alternatives — Vercel/`@opennextjs/cloudflare` as the
    "when to use alternative" (and reference the adapter advisory). Netlify is no longer the recommended
    choice.
  - Replace the "n8n self-hosted | Make / Zapier" row with "CF Workers | n8n / Make / Zapier" (all out of
    scope — no VPS).
  - Replace the "H5P | Articulate Rise" and "H5P | Custom React quiz" rows with a single "Custom React
    quiz | H5P Path A" row (fallback only if custom quiz exceeds ~5 days).
  - Replace the "Puppeteer in n8n (PDF) | …" row with "pdf-lib in a CF Worker | external PDF API (DocRaptor/
    Carbone)" — use external only if pdf-lib layout fidelity becomes painful.
  - Keep Supabase, Cloudflare Stream, Stripe, Resend rows unchanged in substance.

  WHAT NOT TO USE table:
  - Keep all Supabase/Stripe security rows unchanged: auth-helpers-nextjs, getSession() for authz,
    user_metadata for firm_id/role, Pages Router, next lint, fetch() default caching, Stripe per-seat
    quantity, storing secret keys client-side, free-tier Supabase in prod, old Supabase API keys. (Update
    the "Storing STRIPE_SECRET_KEY…" Use-Instead cell to say CF Pages/Workers env vars instead of Netlify.)
  - Change "Next.js 16.x on Netlify (today)" to "Next.js 16.x on Cloudflare Pages (today)" with the same
    "stay on 15.5 LTS" rationale (CF runtime trails on new releases).
  - Remove the H5P-specific avoid rows (H5P Interactive Video with CF Stream; `@lumieducation/h5p-server`
    GPLv3) and the "Articulate Rise postMessage" row.
  - Remove "Running PDF generation inside Netlify functions" row; add "`jsonwebtoken` (Node-only) for
    Stream JWTs → use `jose` (edge-compatible)" and "PDF generation that needs a headless browser
    (Puppeteer/Chrome) on edge → use `pdf-lib` (pure JS) in a Worker".

  STACK PATTERNS BY VARIANT: drop the H5P-in-video bullet (replace with a note about custom-quiz pacing
  if in-video interaction points are ever needed). Keep Stripe/Cloudflare-Stream-cost bullets.

  VERSION COMPATIBILITY table:
  - Drop the `h5p-standalone@^3.8` and `n8n-nodes-puppeteer` rows.
  - Add: `@cloudflare/next-on-pages` ↔ `next@15.5` (requires Edge Runtime on dynamic routes; maintenance
    mode — see adapter advisory); `jose` (Workers/edge-compatible, no Node crypto); `stripe@17` edge note
    (use `constructEventAsync`, not `constructEvent`); `pdf-lib` (pure JS, runs in a Worker, no native deps).
  - Keep the next/react, eslint-config-next, supabase/ssr, stripe-api-version, tailwind rows.

  CONFIDENCE ASSESSMENT table:
  - Rename "Next.js 15.5 on Netlify PRO" → "Next.js 15.5 on Cloudflare Pages" (note: adapter advisory is
    the one open verification → MEDIUM-HIGH).
  - Replace "H5P over Rise decision" with "Custom React quiz" (HIGH — small surface, no vendor lock).
  - Replace "n8n + Puppeteer for PDF" with "pdf-lib in CF Worker" (MEDIUM-HIGH — pure JS, no browser).
  - Keep Supabase, Cloudflare Stream, Stripe, Resend, Tailwind rows.

  SOURCES: trim links that only supported Netlify/n8n/H5P (Netlify guides/pricing, all H5P/Articulate
  links, n8n/puppeteer links). Add: Cloudflare Pages Next.js / `@cloudflare/next-on-pages` docs, the
  `@opennextjs/cloudflare` docs (for the advisory), CF Workers Cron Triggers docs, and a Stripe
  edge/`constructEventAsync` reference. Keep Supabase, Cloudflare Stream, and the remaining Stripe links.

  Do NOT add fenced code blocks beyond what already exists; keep the table/prose style. After editing,
  confirm the GSD marker comments are intact and the trailing sections are unchanged.
  </action>
  <verify>
    <automated>grep -q "Cloudflare Pages" CLAUDE.md &amp;&amp; grep -q "Cloudflare Workers — automation runtime" CLAUDE.md &amp;&amp; grep -q "constructEventAsync" CLAUDE.md &amp;&amp; grep -q "jose" CLAUDE.md &amp;&amp; ! grep -q "h5p-standalone" CLAUDE.md &amp;&amp; ! grep -qi "n8n.katychavezlaw" CLAUDE.md &amp;&amp; grep -q "GSD:conventions-start" CLAUDE.md &amp;&amp; grep -q "Session handoff (SHARED" CLAUDE.md</automated>
  </verify>
  <done>CLAUDE.md stack sections describe CF Pages + CF Workers + custom React quiz; `constructEventAsync`, `jose`, `@cloudflare/next-on-pages`, and the adapter advisory are present; no `h5p-standalone` or `n8n.katychavezlaw` references remain in current guidance; all GSD markers and the trailing Conventions→Session-handoff sections are intact and unchanged. Commit: `docs: rewrite CLAUDE.md for CF stack`.</done>
</task>

<task type="auto">
  <name>Task 3: Banner superseded research docs + fix STATE.md, then commit</name>
  <files>.planning/research/STACK.md, .planning/research/ARCHITECTURE.md, .planning/research/PITFALLS.md, .planning/research/SUMMARY.md, .planning/research/FEATURES.md, .planning/STATE.md</files>
  <action>
  Add a superseded-stack banner immediately after the H1 title line (line 1) of EACH of the five
  research docs. Do not rewrite the bodies. Insert this block (a blank line, the banner, a blank line)
  right below the `# …` title:

  > ⚠️ **STACK SUPERSEDED (2026-06-11):** This document was researched for the original Netlify + n8n + H5P stack. The locked stack is now Cloudflare Pages (`@cloudflare/next-on-pages`) + CF Workers + custom React quiz — see `.planning/STATE.md` Locked Decisions and `CLAUDE.md`. Netlify/n8n/H5P-specific guidance below is historical; domain findings (Stripe, Supabase RLS, Cloudflare Stream, compliance) remain valid.

  The five title lines are: STACK.md `# Stack Research`, ARCHITECTURE.md `# Architecture Research`,
  PITFALLS.md `# Pitfalls Research`, SUMMARY.md `# Research Summary — AI Compliance Training Platform
  (Built Smart by Rob)`, FEATURES.md `# Feature Research`. Insert the banner after each, not before.

  STATE.md fix: in the "Open Decisions" list, replace the line
    "- [ ] n8n monitoring service picked (UptimeRobot vs BetterStack)"
  with
    "- [ ] External uptime monitor for CF Worker health endpoint picked (UptimeRobot vs BetterStack)".
  Leave the rest of STATE.md untouched (the Locked Decisions section is already correct).

  Then commit Task 2 + Task 3 changes. Recommended: this commit covers the banners + STATE.md fix as
  `docs: banner superseded research + STATE.md fix`, and the CLAUDE.md rewrite from Task 2 as its own
  commit `docs: rewrite CLAUDE.md for CF stack`. Stage files explicitly (never `git add -A`):

    git add CLAUDE.md
    git commit -m "docs: rewrite CLAUDE.md for CF stack"
    git add .planning/research/STACK.md .planning/research/ARCHITECTURE.md .planning/research/PITFALLS.md .planning/research/SUMMARY.md .planning/research/FEATURES.md .planning/STATE.md
    git commit -m "docs: banner superseded research + STATE.md fix"

  Append the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer to each commit.
  </action>
  <verify>
    <automated>for f in STACK ARCHITECTURE PITFALLS SUMMARY FEATURES; do grep -q "STACK SUPERSEDED (2026-06-11)" ".planning/research/$f.md" || { echo "missing banner in $f"; exit 1; }; done &amp;&amp; grep -q "CF Worker health endpoint" .planning/STATE.md &amp;&amp; ! grep -q "n8n monitoring service picked" .planning/STATE.md &amp;&amp; git log -3 --format="%s" | grep -q "rewrite CLAUDE.md for CF stack" &amp;&amp; git log -3 --format="%s" | grep -q "banner superseded research"</automated>
  </verify>
  <done>All five research docs carry the STACK SUPERSEDED banner directly under their H1; STATE.md Open Decisions references the CF Worker health-endpoint uptime monitor and no longer mentions "n8n monitoring service picked"; the last three commits are the planning-doc migration, the CLAUDE.md rewrite, and the banner+STATE fix.</done>
</task>

</tasks>

<verification>
- `git log -3 --format="%s"` shows, in order: planning-doc migration, CLAUDE.md rewrite, banner+STATE fix.
- `grep -rl "STACK SUPERSEDED" .planning/research/` lists all five docs.
- CLAUDE.md contains `Cloudflare Pages`, `Cloudflare Workers — automation runtime`, `constructEventAsync`, `jose`, `@cloudflare/next-on-pages`, and the adapter verification advisory; contains no current-guidance references to `h5p-standalone`, `n8n.katychavezlaw`, or Netlify-as-recommended.
- CLAUDE.md trailing sections (Conventions through Session handoff) and all `<!-- GSD:* -->` markers are unchanged.
- STATE.md Locked Decisions section is unchanged; only the Open Decisions n8n-monitor line changed.
</verification>

<success_criteria>
- CLAUDE.md stack sections fully describe the CF Pages + CF Workers + custom React quiz stack, including the one-time `@opennextjs/cloudflare` adapter verification advisory, with the locked decision unchanged.
- Five research docs banner-flagged as superseded without body rewrites.
- STATE.md Open Decisions corrected.
- Three clean commits; the pre-existing PROJECT/REQUIREMENTS/ROADMAP working-tree changes are committed unchanged and never reverted.
</success_criteria>

<output>
Create `.planning/quick/260612-dzf-propagate-cf-pages-workers-stack-pivot-t/260612-dzf-SUMMARY.md` when done.
</output>
