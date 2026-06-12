---
phase: quick-260612-efr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/STATE.md
  - CLAUDE.md
  - .planning/PROJECT.md
  - .planning/ROADMAP.md
  - .planning/research/SUMMARY.md
  - .planning/research/STACK.md
  - .planning/research/PITFALLS.md
  - .planning/research/FEATURES.md
  - .planning/research/ARCHITECTURE.md
  - .planning/NEXT-10-STEPS.md
autonomous: true
requirements: []

must_haves:
  truths:
    - "All project docs state the hosting adapter as @opennextjs/cloudflare on Cloudflare Workers (Node.js runtime via nodejs_compat)"
    - "No doc carries the obsolete 'Edge Runtime throughout' framing or implies @cloudflare/next-on-pages is the active choice"
    - ".planning/NEXT-10-STEPS.md exists as a 10-step onboarding checklist for Max, updated for the OpenNext adapter and current statuses"
  artifacts:
    - path: ".planning/NEXT-10-STEPS.md"
      provides: "10-step onboarding checklist replacing the operator's spreadsheet"
      contains: "opennextjs/cloudflare"
    - path: "CLAUDE.md"
      provides: "Updated stack/integration guidance inside GSD markers (lines 1-260); Conventions onward unchanged"
      contains: "opennextjs/cloudflare"
    - path: ".planning/STATE.md"
      provides: "Re-locked adapter decision + refreshed infra-prereq statuses"
      contains: "opennextjs/cloudflare"
  key_links:
    - from: "all project docs"
      to: "@opennextjs/cloudflare on Cloudflare Workers"
      via: "consistent adapter naming"
      pattern: "opennextjs/cloudflare"
---

<objective>
Switch the locked hosting-adapter decision from `@cloudflare/next-on-pages` (CF Pages, Edge Runtime — now deprecated) to `@opennextjs/cloudflare` (CF Workers, Node.js runtime via `nodejs_compat`) across all project docs, and create a fresh `.planning/NEXT-10-STEPS.md` onboarding checklist for Max.

Purpose: Cloudflare deprecated `@cloudflare/next-on-pages`; the official path is now the OpenNext Cloudflare adapter deploying to Workers with the Node.js runtime. The 2026-06-11 adapter choice and all "Edge Runtime throughout" framing are obsolete and must be re-locked. This is a docs-only change — no code, no scaffold, no tests. All facts are pre-verified (2026-06-12) and embedded in this plan; do NOT re-research.

Output: Four core docs + five research-doc banners updated to the new adapter decision; a new `NEXT-10-STEPS.md` checklist; two suggested commits.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@.planning/ROADMAP.md
@CLAUDE.md

<verified_facts>
<!-- AUTHORITATIVE — verified 2026-06-12. Executor MUST treat as ground truth; do NOT re-research. -->

1. `@cloudflare/next-on-pages` is DEPRECATED. Official Next.js-on-Cloudflare path is `@opennextjs/cloudflare` (OpenNext adapter), deploying to Cloudflare WORKERS with Workers Static Assets — NOT Pages.
2. The OpenNext adapter uses the Node.js runtime (workerd + `nodejs_compat` flag) — NOT Edge. `export const runtime = 'edge'` must NOT be used anywhere. Node APIs (incl. `node:crypto`) are available.
3. Next.js 15 latest minor is fully supported (16 too; Next.js 14 support dropped Q1 2026).
4. Required config — `wrangler.jsonc`: `main: ".open-next/worker.js"`, `assets: { directory: ".open-next/assets", binding: "ASSETS" }`, `compatibility_flags: ["nodejs_compat"]`, `compatibility_date` = today (must be >= 2024-09-23), `preview_urls: true`. Plus `open-next.config.ts` at project root: `import { defineCloudflareConfig } from "@opennextjs/cloudflare"; export default defineCloudflareConfig();`
5. package.json scripts: `"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"`, `"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`, `"cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"`.
6. Local dev: `next dev` (Node-based, best DX) for daily work; `pnpm run preview` runs the app in workerd via wrangler — use before deploys/integration tests (matches production).
7. New-project scaffold: `pnpm create cloudflare@latest my-next-app --framework=next` (C3). Existing projects add the adapter manually (steps 4-5). `npx wrangler deploy` can auto-detect Next.js and generate config.
8. CI/CD: Workers Builds connects the GitHub repo and builds/deploys on push. Staging: enable preview URLs (`preview_urls`) + non-production branch builds → each branch gets a stable alias `<branch>-<worker>.<subdomain>.workers.dev` plus per-commit preview URLs posted to PRs. CAVEAT: unlike Pages, Workers does NOT natively support different bindings/env-vars per preview vs production build — Cloudflare recommends Wrangler Environments (`[env.staging]`) with an appropriate Workers Build config. Preview URLs are workers.dev-only; not generated for Workers using Durable Objects (we use none).
9. Stripe webhook: with `nodejs_compat`, Node `crypto` exists, so the sync `stripe.webhooks.constructEvent` works; `constructEventAsync` also works and is a fine choice. Prior "edge requires constructEventAsync" framing → soften to a recommendation, not a requirement.
10. `jose` remains the recommended JWT library for Cloudflare Stream signed URLs: web-standard, works in plain CF Workers (cert Worker) and the Next.js Worker alike. `jsonwebtoken` stays on the avoid list (heavier, Node-only assumptions, unnecessary) even though it may load under nodejs_compat.
11. Everything else in the locked stack is UNCHANGED: plain CF Workers for automation (pdf-lib cert gen, Resend REST, Cron Triggers), Supabase, Stripe v17, Cloudflare Stream, custom React quiz.

Sources to write into CLAUDE.md Sources section (replace the two Pages-deploy source rows):
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ (official guide, OpenNext adapter) — HIGH
- https://opennext.js.org/cloudflare (adapter docs) — HIGH
- https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/ (Pages→Workers, preview env guidance) — HIGH
- https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/ (non-production branch builds) — HIGH
- https://developers.cloudflare.com/workers/configuration/previews/ (preview URLs) — HIGH
- https://github.com/cloudflare/next-on-pages (deprecation notice) — HIGH

Infra-prereq status updates (from operator's "First 10 Steps" spreadsheet, read 2026-06-12):
- Stripe account → Done (Rob)
- Supabase CLI → Done (Max)
- Stripe CLI remains Not started (Rob)
</verified_facts>

<boundaries>
<!-- CRITICAL edit-scope guards for CLAUDE.md (verified line numbers) -->
- CLAUDE.md GSD markers: project-start = line 1, stack-end = line 260. ALL edits to CLAUDE.md MUST stay between lines 1-260 (the `GSD:project-*` and `GSD:stack-*` regions).
- Everything from line 262 (`<!-- GSD:conventions-start -->` / `## Conventions`) to end of file MUST remain BYTE-FOR-BYTE UNCHANGED. Do not touch Conventions, Architecture, Project Skills, GSD Workflow Enforcement, Developer Profile, or the Session-handoff manual section.
- The 5 research-doc banners are SINGLE-LINE edits (line 3 of each file): change only the substring "Cloudflare Pages (`@cloudflare/next-on-pages`)" → "Cloudflare Workers (`@opennextjs/cloudflare`)". Leave the rest of each banner and the "STACK SUPERSEDED (2026-06-11)" date untouched — that date refers to the Netlify→CF pivot, not this adapter swap.
</boundaries>
</context>

<tasks>

<task type="auto">
  <name>Task A: Re-lock the adapter decision across the four core docs + five research banners</name>
  <files>.planning/STATE.md, CLAUDE.md, .planning/PROJECT.md, .planning/ROADMAP.md, .planning/research/SUMMARY.md, .planning/research/STACK.md, .planning/research/PITFALLS.md, .planning/research/FEATURES.md, .planning/research/ARCHITECTURE.md</files>
  <action>
Use the Edit tool for all changes (never heredoc). Apply edits per file using the verified facts in `<verified_facts>` and respecting `<boundaries>`.

**.planning/STATE.md:**
- Locked Decisions → rewrite the Stack bullet to: "Stack (adapter re-locked 2026-06-12): Next.js 15.5 LTS (App Router, Node.js runtime via `nodejs_compat`) on **Cloudflare Workers** via `@opennextjs/cloudflare` (OpenNext adapter; supersedes the 2026-06-11 choice of `@cloudflare/next-on-pages`, which is deprecated — re-locked after doc verification), Supabase (Auth/Postgres/Storage) Pro tier, Cloudflare Stream, Stripe (`2025-09-30.acacia`), CF Workers for all automation, Resend (REST from CF Workers). No n8n. No VPS. No Netlify."
- Stripe-webhook bullet → "Stripe webhook lands in a Next.js Route Handler running in the Worker (Node runtime)." Raw body via `await req.text()`; HMAC via Stripe SDK v17 — `constructEventAsync` recommended but `constructEvent` works (Node crypto available under nodejs_compat). Keep idempotency table + transactional write + fire-and-forget POST to the cert Worker.
- jose bullet → keep `jose`; change rationale to "web-standard JWT library; works in plain CF Workers (cert Worker) and the Next.js Worker alike."
- Remove the "CF Pages + CF Workers architecture supersedes..." note's "CF Pages" phrasing → "The CF Workers architecture supersedes any Netlify/n8n guidance in that file."
- Remove every remaining "Edge Runtime throughout" / "Edge Runtime" framing tied to the app runtime.
- Infrastructure Prerequisites table: Stripe account → Done (Rob); Supabase CLI → Done (Max); Stripe CLI stays Not started (Rob).
- "Last updated" line (line 3) → "2026-06-12 (adapter re-locked to @opennextjs/cloudflare)".

**CLAUDE.md (STAY WITHIN LINES 1-260 — see `<boundaries>`):**
- Line 13 Constraints bullet → "Next.js 15.5 (App Router, Node.js runtime via `nodejs_compat`) on **Cloudflare Workers** via `@opennextjs/cloudflare` (OpenNext adapter) — CF, not Netlify".
- Core Technologies table Wrangler row (line 71) → `wrangler dev`/`pnpm run preview` for workerd preview; `opennextjs-cloudflare deploy` to ship; secrets via `wrangler secret put` or the Worker's CF dashboard settings (not Pages).
- Core Technologies dotenv row (line 72) → keys stored as the Worker's environment variables/secrets (encrypted), not "CF Pages/Workers".
- §1 (line 92): retitle to "### 1. Next.js 15 on Cloudflare Workers (OpenNext adapter) — routing & rendering". Replace the "Edge Runtime throughout" line (97) and the "CF Pages adapter advisory" line (98) with: the `wrangler.jsonc` shape (main/assets+ASSETS binding/nodejs_compat/compatibility_date today/preview_urls true) and `open-next.config.ts` shape (per fact 4); package scripts preview/deploy/cf-typegen (fact 5); `next dev` vs `pnpm run preview` (fact 6); Workers Builds + preview URLs + non-production branch builds for staging, plus the per-env bindings caveat and Wrangler Environments (`[env.staging]`) recommendation (fact 8); an explicit "do NOT add `export const runtime = 'edge'`" note (fact 2). REMOVE the "⚠️ Verify before scaffold" advisory entirely — verification is done.
- Replace the "Preview deployments" CF-Pages line (99) with the Workers preview-URL/branch-build story (fact 8).
- §4 Stripe (lines 132, 134): route handler runs in the Worker (Node runtime) — drop `export const runtime = 'edge'`. Soften: `constructEvent` works (Node crypto present); `constructEventAsync` also fine — recommendation, not requirement.
- What NOT to Use: ADD a row for `@cloudflare/next-on-pages` (deprecated → use `@opennextjs/cloudflare` on Workers) and a row for `export const runtime = 'edge'` with the OpenNext adapter (unsupported/unnecessary → omit; Node runtime is default). Keep the `jsonwebtoken` row (line 192) on the avoid list with updated rationale: "heavier, Node-only assumptions, unnecessary; may load under nodejs_compat but not needed → use `jose`." Update lines 195/218 that mention "CF Pages/Workers" or "Edge Runtime" to Worker/Node-runtime wording.
- Alternatives Considered (line 171) → recommended is now `@opennextjs/cloudflare` on Workers; alternative is Vercel (only if CF Workers ship broken on a needed feature). Remove "Verify before scaffolding."
- Line 189 (Next.js 16.x) → reference Cloudflare Workers, not CF Pages.
- Version Compatibility (lines 219-221): replace the `@cloudflare/next-on-pages` row with `@opennextjs/cloudflare` ↔ `next@15.5` (nodejs_compat; compatibility_date >= 2024-09-23; no edge runtime exports). Update the wrangler row → `wrangler@4.21+` (preview aliases). Update the `jose`/`pdf-lib` rows that say "Edge Runtime" → "CF Workers (Node runtime)". Update the stripe row (218) → drop the "use constructEventAsync NOT constructEvent" hard requirement; both work under nodejs_compat.
- Confidence Assessment (line 228): "Next.js 15.5 on Cloudflare Workers (OpenNext adapter) | HIGH | Cloudflare-official adapter, verified against current docs 2026-06-12." Remove the "adapter advisory / verify before scaffolding" caveat.
- Sources (lines 241-242): replace the two CF-Pages-Next.js source rows with the six source URLs listed in `<verified_facts>`.

**.planning/PROJECT.md:**
- Constraints hosting line (line 64) → "Next.js 15.5 (App Router, Node.js runtime via `nodejs_compat`) on **Cloudflare Workers** via `@opennextjs/cloudflare` — all portals and SaaS apps live on CF, not Netlify".
- Constraints automation line (line 66) → drop "CF Pages Functions"; automation runs as plain CF Workers + Cron.
- Key Decisions table: update the "Next.js on Cloudflare Pages" row (line 81) → "Next.js on Cloudflare Workers (OpenNext adapter)" with rationale unchanged. ADD a new row: "Adapter: @opennextjs/cloudflare over deprecated @cloudflare/next-on-pages | Cloudflare deprecated next-on-pages; OpenNext on Workers is the official Node-runtime path | — Decided 2026-06-12".
- Last updated line (110) → append "; adapter re-locked to @opennextjs/cloudflare 2026-06-12".

**.planning/ROADMAP.md:**
- Phase 0 Goal (line 36) → "CF Workers scaffold, Supabase schema + RLS, ...".
- Phase 0 Success Criterion 1 (line 41) → "`pnpm dev` runs locally and `pnpm run deploy` (`opennextjs-cloudflare build && deploy`) deploys a 'Hello World' app to **Cloudflare Workers** — Next.js 15.5 (Node.js runtime via `nodejs_compat`), `@opennextjs/cloudflare`, `wrangler.jsonc` + `open-next.config.ts` configured, Supabase dev env wired, `middleware.ts` session refresh running."
- Grep the whole file for any other `next-on-pages` / `wrangler.toml` / "CF Pages" / "Edge Runtime" references and fix them to Workers/`wrangler.jsonc`/Node-runtime wording.

**Research-doc banners (5 files, line 3 only — SINGLE substring swap per `<boundaries>`):**
- In each of SUMMARY.md, STACK.md, PITFALLS.md, FEATURES.md, ARCHITECTURE.md: change "Cloudflare Pages (`@cloudflare/next-on-pages`)" → "Cloudflare Workers (`@opennextjs/cloudflare`)". Touch nothing else on the line.
  </action>
  <verify>
Run from repo root (Git Bash). All three must hold:
1. `grep -rn "next-on-pages" .planning CLAUDE.md | grep -v "/quick/" | grep -vi "deprecat" | grep -v "github.com/cloudflare/next-on-pages"` returns ZERO lines (only allowed mentions are the deprecation/"NOT to Use" notes and the GitHub deprecation source URL).
2. `grep -rn "Edge Runtime throughout" .planning CLAUDE.md` returns ZERO lines.
3. `grep -c "opennextjs/cloudflare" CLAUDE.md .planning/STATE.md .planning/PROJECT.md .planning/ROADMAP.md` shows a non-zero count in each file.
Also confirm CLAUDE.md lines 262→EOF are unchanged: `git diff CLAUDE.md` shows no hunks at or below the `GSD:conventions-start` marker.
  </verify>
  <done>All four core docs and five research banners state @opennextjs/cloudflare on Cloudflare Workers (Node runtime); no obsolete next-on-pages active references or "Edge Runtime throughout" framing remain; CLAUDE.md Conventions-onward section is byte-for-byte unchanged; STATE infra-prereq statuses refreshed (Stripe account Done, Supabase CLI Done).</done>
</task>

<task type="auto">
  <name>Task B: Create .planning/NEXT-10-STEPS.md onboarding checklist for Max</name>
  <files>.planning/NEXT-10-STEPS.md</files>
  <action>
Use the Write tool. Create a fresh 10-step onboarding checklist replacing the operator's "First 10 Steps" spreadsheet, updated for the OpenNext adapter and current statuses (spreadsheet read 2026-06-12). Markdown checklist; each step has a header line with **Owner** (Rob/Max) and **Status** (Done / In Progress / Not started), followed by sub-item bullets (use `- [x]` / `- [ ]`).

Steps:
1. **Accounts** (Owner: Rob — Status: Done) — Cloudflare, Supabase dev + prod, Stripe, Resend, GitHub repo (`rtraversi/bsbr-attytraining`). All done.
2. **Local dev tools** (Owner: Max — Status: In Progress) — Node 22 LTS (NOTE: Max currently has v24; recommend nvm-windows + pin v22); pnpm Done; Wrangler Done (needs v4.21+ for preview aliases); Supabase CLI Done; Stripe CLI — Owner Rob, NOT STARTED.
3. **Scaffold Next.js + OpenNext adapter** (Owner: Max — Status: In Progress — CHANGED) — Keep the existing `create next-app@15.5` scaffold (`pnpm dev` already works). REMOVE any `@cloudflare/next-on-pages` work. Then: `pnpm add @opennextjs/cloudflare@latest`; `pnpm add -D wrangler@latest`; create `wrangler.jsonc` (main `.open-next/worker.js`, assets `.open-next/assets` + `ASSETS` binding, `nodejs_compat`, `compatibility_date` = today, `preview_urls: true`); create `open-next.config.ts` (`defineCloudflareConfig()`); add `preview` / `deploy` / `cf-typegen` scripts; verify `pnpm run preview` serves the app in workerd locally. EXPLICIT: do NOT add `export const runtime = 'edge'` anywhere.
4. **Env vars** (Owner: Max — Status: Not started) — `.env.local` for `next dev` (Supabase URL + anon key, service-role key, Stripe keys, Cloudflare Stream signing key, Resend API key); `.dev.vars` for workerd preview; production secrets via `wrangler secret put` or the Worker's Settings in the CF dashboard (NOT a Pages dashboard). Server-only keys never in client code.
5. **DB schema** (Owner: Max — Status: Not started) — migration `0001_initial_schema.sql` (8 tables: firms, firm_members, enrollments, quiz_attempts, certificates, training_events, processed_stripe_events, cert_generation_queue); `supabase db push` to dev project; `supabase gen types`. Unchanged.
6. **Supabase Auth wiring** (Owner: Max — Status: Not started) — `@supabase/ssr`, `lib/supabase/client.ts` + `server.ts`, `middleware.ts` session refresh. Unchanged.
7. **First deploy to Cloudflare WORKERS** (Owner: Max — Status: Not started) — push to GitHub; connect repo via Workers Builds; set env vars/secrets; `pnpm run deploy` also works locally; confirm Hello World on the `*.workers.dev` URL; enable non-production branch builds + preview URLs for staging.
8. **Stripe products/prices** (Owner: Rob — Status: Not started) — 3 products × 2 prices; record all 6 Price IDs in `.env.local` + the Worker env (not CF Pages env). Otherwise unchanged.
9. **Stub cert Worker** (Owner: Max — Status: Not started) — separate plain Worker, POST → 200, deploy with `wrangler`, wire a Supabase Database Webhook. Unchanged.
10. **End-to-end smoke check** (Owner: Max + Rob — Status: Not started) — verify the Next.js Worker URL and the cert Worker URL are both reachable; basic happy-path wiring. Unchanged otherwise.

End the file with:
- A **parallelism note**: steps 1-4 can run in parallel; steps 5-7 are sequential and mark the start of Phase 0; steps 8-10 lay the integration foundations.
- A short **"What changed vs the spreadsheet (2026-06-12)"** section listing: adapter swap in step 3 (`@cloudflare/next-on-pages` → `@opennextjs/cloudflare`); Workers-not-Pages in steps 4/7/8; statuses refreshed (Stripe account Done, Supabase CLI Done).
  </action>
  <verify>
1. `test -f .planning/NEXT-10-STEPS.md` succeeds.
2. `grep -c "opennextjs/cloudflare" .planning/NEXT-10-STEPS.md` is non-zero.
3. `grep -E "^### (Step )?(10|[1-9])\b" .planning/NEXT-10-STEPS.md | wc -l` (or equivalent heading scan) shows 10 numbered steps.
4. `grep -n "What changed vs the spreadsheet" .planning/NEXT-10-STEPS.md` returns a match.
  </verify>
  <done>.planning/NEXT-10-STEPS.md exists with 10 numbered steps, each carrying owner + status + sub-items, reflecting the OpenNext adapter and refreshed statuses, ending with the parallelism note and "What changed vs the spreadsheet (2026-06-12)" section.</done>
</task>

<task type="auto">
  <name>Task C: Commit the changes in two logical commits</name>
  <files>(git only — no file edits)</files>
  <action>
Stage and commit in two commits (use the GSD commit helper or `git`). Stay on `main` (branching_strategy = none per config).

Commit 1 — the adapter re-lock across docs:
`git add .planning/STATE.md CLAUDE.md .planning/PROJECT.md .planning/ROADMAP.md .planning/research/SUMMARY.md .planning/research/STACK.md .planning/research/PITFALLS.md .planning/research/FEATURES.md .planning/research/ARCHITECTURE.md`
then commit with message: "docs: re-lock hosting adapter to @opennextjs/cloudflare on Workers".

Commit 2 — the onboarding checklist:
`git add .planning/NEXT-10-STEPS.md`
then commit with message: "docs: add NEXT-10-STEPS.md onboarding checklist for Max".

End commit messages with the standard Co-Authored-By trailer.
Note: PROJECT.md, REQUIREMENTS.md, ROADMAP.md already show as modified in the working tree at session start — only stage the files this plan touched; do not sweep unrelated changes into these commits.
  </action>
  <verify>
1. `git log --oneline -2` shows the two commit messages above, most recent first.
2. `git status --short` shows no remaining unstaged changes among the 10 files this plan modified.
  </verify>
  <done>Two commits exist on main: the docs adapter re-lock (9 files) and the NEXT-10-STEPS.md addition (1 file); each carries the Co-Authored-By trailer.</done>
</task>

</tasks>

<verification>
Phase-level checks (run from repo root, Git Bash):
1. `grep -rn "next-on-pages" .planning CLAUDE.md | grep -v "/quick/" | grep -vi "deprecat" | grep -v "github.com/cloudflare/next-on-pages"` → zero lines.
2. `grep -rn "Edge Runtime throughout" .planning CLAUDE.md` → zero lines.
3. `.planning/NEXT-10-STEPS.md` exists with 10 numbered steps.
4. CLAUDE.md diff contains no hunks at or below the `GSD:conventions-start` marker (Conventions-onward unchanged).
5. The 5 research banners each read "Cloudflare Workers (`@opennextjs/cloudflare`)" on line 3.
</verification>

<success_criteria>
- All four core docs (STATE.md, CLAUDE.md, PROJECT.md, ROADMAP.md) state the hosting adapter as `@opennextjs/cloudflare` on Cloudflare Workers with the Node.js runtime via `nodejs_compat`.
- No obsolete "Edge Runtime throughout" framing or active `@cloudflare/next-on-pages` references remain (deprecation/"NOT to Use"/GitHub-source mentions are the only permitted occurrences).
- CLAUDE.md edits are confined to lines 1-260 (GSD project/stack regions); Conventions-onward is byte-for-byte unchanged.
- `.planning/NEXT-10-STEPS.md` exists as a 10-step checklist for Max with owners, statuses, and a "What changed vs the spreadsheet (2026-06-12)" section.
- Two clean commits on main.
</success_criteria>

<output>
Create `.planning/quick/260612-efr-switch-locked-adapter-decision-to-openne/260612-efr-SUMMARY.md` when done.
</output>
