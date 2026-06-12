---
phase: quick-260612-efr
plan: 01
subsystem: docs
tags: [adapter, cloudflare, opennextjs, hosting, infra]
dependency_graph:
  requires: []
  provides: [adapter-decision-locked, onboarding-checklist]
  affects: [STATE.md, CLAUDE.md, PROJECT.md, ROADMAP.md, research-banners, NEXT-10-STEPS.md]
tech_stack:
  added: []
  patterns: ["@opennextjs/cloudflare on CF Workers with nodejs_compat", "wrangler.jsonc + open-next.config.ts config shape"]
key_files:
  created:
    - .planning/NEXT-10-STEPS.md
  modified:
    - .planning/STATE.md
    - CLAUDE.md
    - .planning/PROJECT.md
    - .planning/ROADMAP.md
    - .planning/research/SUMMARY.md
    - .planning/research/STACK.md
    - .planning/research/PITFALLS.md
    - .planning/research/FEATURES.md
    - .planning/research/ARCHITECTURE.md
decisions:
  - "Adapter re-locked (2026-06-12): @opennextjs/cloudflare on CF Workers with nodejs_compat, superseding deprecated @cloudflare/next-on-pages"
metrics:
  duration: ~20 minutes
  completed: 2026-06-12T14:46:00Z
  tasks_completed: 3
  files_changed: 10
---

# Phase quick-260612-efr Plan 01: Re-lock adapter to @opennextjs/cloudflare on Workers Summary

**One-liner:** Re-locked hosting adapter from deprecated `@cloudflare/next-on-pages` (CF Pages, Edge Runtime) to `@opennextjs/cloudflare` (CF Workers, Node.js runtime via `nodejs_compat`) across all project docs, and created a 10-step onboarding checklist for Max.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| A | Re-lock adapter across four core docs + five research banners | b86f807 | STATE.md, CLAUDE.md, PROJECT.md, ROADMAP.md, 5× research banners |
| B | Create NEXT-10-STEPS.md onboarding checklist for Max | d385b7b | .planning/NEXT-10-STEPS.md |
| C | Commit in two logical commits | 728fab3* | (git only) |

*Third commit was a deviation (see below) — adds "(deprecated)" qualifiers to pass the verify gate filter.

---

## Changes Made

### STATE.md
- "Last updated" → 2026-06-12 (adapter re-locked)
- Locked Decisions Stack bullet: removed "Edge Runtime throughout" + CF Pages / `@cloudflare/next-on-pages`; replaced with Node.js runtime via `nodejs_compat` + CF Workers + `@opennextjs/cloudflare`
- Stripe webhook bullet: dropped "Edge Runtime" framing; noted both `constructEvent` and `constructEventAsync` work under nodejs_compat
- `jose` rationale: "web-standard JWT library; works in plain CF Workers (cert Worker) and the Next.js Worker alike"
- "CF Pages + CF Workers architecture" note → "CF Workers architecture"
- Infra-prereq table: Supabase CLI → Done, Stripe account → Done

### CLAUDE.md (lines 1-260 only; Conventions-onward byte-for-byte unchanged)
- Constraints frontend/hosting line → Workers + `@opennextjs/cloudflare`
- Next.js row: removed "Edge Runtime throughout" / next-on-pages requirement; added nodejs_compat note and do-not-add-edge-runtime warning
- CF Pages+Workers row → CF Workers row with full `wrangler.jsonc` + `open-next.config.ts` config shape, preview/deploy/cf-typegen scripts, local dev vs workerd preview guidance, Workers Builds staging guidance with Wrangler Environments caveat
- Wrangler CLI dev tools row → updated to opennextjs-cloudflare deploy workflow
- dotenv row → `.dev.vars` for workerd preview; Worker Settings for production secrets
- §1 heading and bullets → "Next.js 15 on Cloudflare Workers (OpenNext adapter)"; full config spec; do-not-add-edge-runtime note
- §4 Stripe: dropped `export const runtime = 'edge'`; softened constructEvent/constructEventAsync to recommendation
- Alternatives Considered: updated recommended from CF Pages/`@cloudflare/next-on-pages` to CF Workers/`@opennextjs/cloudflare`
- What NOT to Use: added `@cloudflare/next-on-pages` (deprecated) row; added `export const runtime = 'edge'` row; updated jsonwebtoken rationale; updated secrets storage row
- Version Compatibility: replaced `@cloudflare/next-on-pages` row with `@opennextjs/cloudflare` row; updated stripe row; updated jose/pdf-lib rows
- Confidence Assessment: CF Pages MEDIUM-HIGH → CF Workers (OpenNext) HIGH
- Sources: replaced two CF Pages deploy source rows with six new rows per verified_facts

### PROJECT.md
- Constraints hosting line → Workers + `@opennextjs/cloudflare`
- Constraints automation line: removed "CF Pages Functions" → "CF Workers Cron Triggers"
- Key Decisions table: updated CF Pages row → CF Workers (OpenNext adapter); added new adapter decision row (2026-06-12)
- Last updated line: appended "; adapter re-locked to @opennextjs/cloudflare 2026-06-12"

### ROADMAP.md
- Phase 0 Goal → "CF Workers scaffold..."
- Phase 0 list item → added "CF Workers scaffold"
- Phase 0 Success Criterion 1 → updated to opennextjs-cloudflare build + deploy to CF Workers, wrangler.jsonc + open-next.config.ts

### Research doc banners (5 files, line 3 only)
Each banner changed single substring "Cloudflare Pages (`@cloudflare/next-on-pages`)" → "Cloudflare Workers (`@opennextjs/cloudflare`)". No other changes.

### .planning/NEXT-10-STEPS.md (new file)
10-step onboarding checklist for Max with owners, statuses, sub-items. Highlights:
- Step 3 fully rewritten for OpenNext adapter (adapter install, wrangler.jsonc, open-next.config.ts, scripts, explicit no-edge-runtime warning)
- Steps 4/7/8 updated for CF Workers env model (Worker Settings, not CF Pages dashboard)
- Statuses: Stripe account Done, Supabase CLI Done, Stripe CLI Not started
- Parallelism note: Steps 1–4 parallel; Steps 5–7 sequential (Phase 0 start); Steps 8–10 integration foundations
- "What Changed vs the Spreadsheet (2026-06-12)" section listing all three changes

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added "(deprecated)" qualifiers to NEXT-10-STEPS.md**
- **Found during:** Task C verification (gate 1 check)
- **Issue:** NEXT-10-STEPS.md mentioned `@cloudflare/next-on-pages` in migration/removal context without the word "deprecated", causing the verify gate (`grep -vi "deprecat"`) to flag the file
- **Fix:** Added "(deprecated)" qualifier to four mentions in NEXT-10-STEPS.md; created a third commit (728fab3)
- **Files modified:** .planning/NEXT-10-STEPS.md
- **Commit:** 728fab3

---

## Verification Results

All five phase-level gates pass:
1. No active `next-on-pages` references outside `/quick/` historical plans (zero lines after filter)
2. No "Edge Runtime throughout" framing outside `/quick/` historical plans (zero lines)
3. NEXT-10-STEPS.md exists with 10 numbered steps
4. CLAUDE.md Conventions-onward section byte-for-byte unchanged (no diff hunks at/below GSD:conventions-start)
5. All five research banners read "Cloudflare Workers (`@opennextjs/cloudflare`)" on line 3

---

## Commits

| Hash | Message |
|------|---------|
| b86f807 | docs: re-lock hosting adapter to @opennextjs/cloudflare on Workers (9 files) |
| d385b7b | docs: add NEXT-10-STEPS.md onboarding checklist for Max |
| 728fab3 | docs: clarify deprecated labels in NEXT-10-STEPS.md for verify gate |

---

## Self-Check: PASSED

- [x] .planning/NEXT-10-STEPS.md exists
- [x] b86f807 exists in git log
- [x] d385b7b exists in git log
- [x] 728fab3 exists in git log
- [x] CLAUDE.md conventions section unchanged
- [x] All four core docs contain "opennextjs/cloudflare"
