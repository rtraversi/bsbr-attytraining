---
phase: quick-260612-pg6
plan: "01"
subsystem: planning-docs
tags: [next-10-steps, status-verification, incident-record, smoke-test-runbook]
dependency_graph:
  requires: []
  provides: [verified-step-statuses, monday-runbook, resolved-verification-gaps]
  affects: [.planning/NEXT-10-STEPS.md, .planning/STATE.md]
tech_stack:
  added: []
  patterns: []
key_files:
  modified:
    - .planning/NEXT-10-STEPS.md
    - .planning/STATE.md
decisions:
  - "Supabase dev project ndmzvtuywcufvkxtkjhg confirmed under Max's account; prod project owner/Pro-tier decision deferred to pre-launch"
  - "React 19.1.0 (create-next-app default) accepted as a noted spec deviation from 18.3.x; no stack docs rewrite"
  - "package.json name 'aistaffcompliance' flagged as cosmetic rename for Max; non-blocking"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-12"
  tasks_completed: 3
  files_modified: 2
---

# Phase quick-260612-pg6 Plan 01: Record Verified Step Statuses Post Code-Migration Summary

**One-liner:** Replaced all "per Max's report — unverified" annotations with 2026-06-12 inspection-backed statuses, recorded the service-role key leak/rotation/repo-migration incident, resolved the Verification Gaps section, and added a Monday Smoke-Test Runbook with owners and a Stripe Phase-1 caveat.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Update Steps 3–7 and 9 statuses + record the incident | 08f080d | .planning/NEXT-10-STEPS.md |
| 2 | Resolve Verification Gaps + add Monday Smoke-Test Runbook | 08f080d | .planning/NEXT-10-STEPS.md |
| 3 | Update single STATE.md Supabase prerequisites row | 2a2029a | .planning/STATE.md |

## What Was Done

### NEXT-10-STEPS.md

- **Step 3 (OpenNext adapter):** Status changed to `Done — VERIFIED by inspection 2026-06-12`. Evidence: `wrangler.jsonc` matches spec, `open-next.config.ts` present, scripts confirmed, `@opennextjs/cloudflare ^1.19.11` + `wrangler ^4.99` installed, no `export const runtime = 'edge'` anywhere. Instructional checkboxes ticked where confirmed. `pnpm run preview` deferred to Monday smoke test.

- **Step 4 (env vars):** Status changed to `Done on Max's machine (file contents unverifiable remotely); .gitignore verified`. One-line history note added recording the incident: dev Supabase service-role key (`ndmzvtuywcufvkxtkjhg`) exposed ~90 min via leaked `.open-next/` build output in the public `aistaffcompliance` repo; CONTAINED — Max rotated the key, made repo private, zero forks, no other secrets leaked; code migrated to `bsbr-attytraining` as clean squashed commit `efc3214`.

- **Step 5 (DB schema):** Status changed to `Substantially Done — VERIFIED 2026-06-12`. Evidence: `0001_initial_schema.sql` (296 lines, 8 tables, RLS on all 8, 12 indexes including `firm_id`); `types/supabase.ts` (482 lines, generated against live dev DB). GAP noted: migration 0002 still needed for `training_events` and `cert_generation_queue` (Max).

- **Step 6 (Supabase Auth wiring):** Status changed to `In Progress — files stubbed, no implementation (Max's TOP PRIORITY)`. `middleware.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts` are all 0-byte placeholders; `@supabase/ssr ^0.12.0` + `@supabase/supabase-js ^2.108.1` installed.

- **Step 7 (first deploy):** Status changed to `Unverified — pending Monday confirmation`. Code is in `bsbr-attytraining` (`efc3214`) but any prior deploy predated the repo migration; Workers Builds may still point to the wrong repo. Monday: Max provides `*.workers.dev` URL + confirms correct repo connection.

- **Step 9 (cert Worker stub):** Status changed to `Code Done — VERIFIED 2026-06-12 (deploy + webhook wiring still unverified)`. Evidence: `workers/cert-worker/src/index.ts` validates `X-Webhook-Secret` (401), 405 on non-POST, 400 on bad JSON, filters `quiz_attempts` INSERT `passed=true`, 500 for retry, typed `Env` for 4 secrets, numbered TODO stubs.

- **Minor notes (2026-06-12):** `package.json` name is still `"aistaffcompliance"` (cosmetic rename suggested). React 19.1.0 vs spec's 18.3.x — accepted as noted spec deviation, no stack docs changes.

- **Banner line updated** to note the 2026-06-12 evening edit records VERIFIED statuses post-migration.

- **Verification Gaps section rewritten** as `Resolved 2026-06-12` — all four prior gaps closed; one remaining open item (Step 7 deploy confirmation, Monday).

- **Monday Smoke-Test Runbook added** — 6-item pre-flight list (Max unless noted) including the CRITICAL `git reset --hard origin/main` clone reset command and the 7-check smoke sequence with per-check owners, including the Stripe Phase-1 caveat (webhook route doesn't exist yet; check validates pipe not handler).

### STATE.md

- **Supabase prerequisites row** (single row edit only): replaced stale ownership warning with confirmed status — dev project `ndmzvtuywcufvkxtkjhg` CONFIRMED under Max's Supabase account; open question updated to prod project owner + Pro tier before launch.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None introduced by this plan (documentation-only changes).

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- `.planning/NEXT-10-STEPS.md` — exists and contains all required content (VERIFIED, efc3214, ndmzvtuywcufvkxtkjhg, cert_generation_queue, Monday Smoke-Test Runbook, Resolved 2026-06-12, reset --hard, validating the pipe)
- `.planning/STATE.md` — exists and contains ndmzvtuywcufvkxtkjhg + CONFIRMED in the prerequisites row
- Commits `08f080d` and `2a2029a` both present
- `git diff --stat HEAD~2 HEAD` shows exactly two files modified
