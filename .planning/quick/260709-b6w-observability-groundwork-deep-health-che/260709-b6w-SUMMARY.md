---
phase: quick-260709-b6w
plan: 01
subsystem: infra
tags: [supabase, health-check, metrics, k6, monitoring, observability]
requires: []
provides: [OBS-quick]
affects: [app/api/health/route.ts, app/api/metrics/route.ts, load-tests/, .planning/MONITORING.md]
tech-stack:
  added: []
  patterns:
    - "Deep health check: cheap head/count read against a stable table (courses) via createAdminClient(), no raw error detail in the public response body"
    - "Fail-closed secret-gated metrics endpoint: check x-metrics-secret against METRICS_SECRET BEFORE running any query"
    - "Distinct-count-over-window via JS Set reduce (supabase-js has no COUNT(DISTINCT); acceptable at pre-launch volume)"
    - "Dormant load-test skeletons live in load-tests/, clearly banner-marked DORMANT/STAGING-only, excluded from tsc/eslint/CI"
key-files:
  created:
    - app/api/metrics/route.ts
    - load-tests/training-flow.js
    - load-tests/README.md
    - .planning/MONITORING.md
  modified:
    - app/api/health/route.ts
decisions:
  - "Health check reads `courses` table (head/count only) as the connectivity probe — matches the plan's confirmed pattern used elsewhere in the codebase"
  - "Metrics endpoint uses firm_member_id (not user_id, which doesn't exist on training_events) as the per-person distinct key, over event_timestamp (not created_at)"
  - "Skipped the optional activeSessions15m second query per plan guidance — kept to exactly one query on the authorized path"
  - "k6 skeleton and README are pure documentation/scaffolding — not referenced by any app code or CI config, matching the plan's 'dormant' requirement"
metrics:
  duration: "~20 minutes"
  completed: 2026-07-09
---

# Quick Task 260709-b6w: Observability groundwork — deep health check, metrics endpoint, dormant k6 skeleton, monitoring roadmap Summary

Added a real Supabase-connectivity health check, a secret-gated 5-minute active-session metrics endpoint, a dormant staging-only k6 load-test skeleton, and an operator-facing capacity-alerting/monitoring roadmap doc — pure additive groundwork ahead of the 2026-07-20 launch, with no schema, migration, or type-generation changes.

## What Was Built

**Task 1 — `app/api/health/route.ts` (deep health check):**
Replaced the static `{status:'ok'}` stub with a real connectivity check. `GET` now runs `createAdminClient().from('courses').select('id', { head: true, count: 'exact' })` inside a try/catch. Both a thrown exception and a returned Supabase `error` object are treated as "DB unreachable" — server-side `console.error('[health] db check failed', ...)` logs the detail, but the public response body never includes raw error text. Returns `200 {status:'ok', db:'ok', timestamp}` on success, `503 {status:'degraded', db:'error', timestamp}` on failure. `runtime = 'nodejs'` retained.

**Task 2 — `app/api/metrics/route.ts` (new, secret-gated metrics endpoint):**
New route handler with `runtime = 'nodejs'`. Fail-closed secret gate runs first: reads `x-metrics-secret` header and compares against `process.env.METRICS_SECRET`; if either is missing/unset or they don't match, returns `401 {error:'Unauthorized'}` with zero queries run (and the secret value is never logged). On a valid secret, computes a 5-minute window (`event_timestamp >= now - 5min`), selects `firm_member_id` from `training_events` in that window, and reduces to a distinct count via `new Set(...).size` (documented inline — supabase-js has no `COUNT(DISTINCT)`, and pre-launch volume makes the JS-side reduce the simplest correct approach). Returns `200 {timestamp, windowMinutes:5, activeSessions}`. A top-of-file comment flags the endpoint as consumed by BetterStack and the future iurisdesk.com hub, so the response shape should stay stable.

**Task 3 — `load-tests/training-flow.js` + `load-tests/README.md` (dormant k6 skeleton):**
A commented, non-functional k6 script sketching the employee training path (login → dashboard/progress read → quiz submit) with `TODO` markers for real auth wiring and real endpoint URLs, a placeholder ramped-VU `options.stages` profile, and a top banner explicitly marking it DORMANT and STAGING-only. `BASE_URL` defaults to an invalid placeholder host so an unfilled run fails safely rather than accidentally hitting a real host. The README explains how to run it once filled in, what's still a TODO, and sets a ~2026-08-19 review date. Neither file is TypeScript, referenced by app code, or wired into CI.

**Task 4 — `.planning/MONITORING.md` (new, operator roadmap):**
Concise operator-facing doc covering: (1) Supabase resource utilization at ~70% sustained as the primary crash-prevention alert, scraped from Supabase Pro's Prometheus-compatible metrics endpoint into BetterStack, with compute-add-on upgrade as remediation, and `/api/metrics` `activeSessions` framed as the correlating "why did utilization spike" signal; (2) BetterStack uptime monitor pointed at `/api/health`; (3) `/api/metrics` operational note — `wrangler secret put METRICS_SECRET` action item, fail-closed behavior until set; (4) iurisdesk.com central hub marked DESIGN SPIKE (own planning session); (5) GitHub bug/feature submission marked BLOCKED pending an example site to replicate; (6) k6 dormant skeleton with ~2026-08-19 review date.

## Deviations from Plan

None — plan executed exactly as written. No schema changes, no migration, no `types/supabase.ts` changes. The three held dashboard files (`app/dashboard/layout.tsx`, `app/dashboard/_components/account-menu.tsx`, `app/dashboard/quizzes/_components/quizzes-client.tsx`) and the untracked `.agents/`, `.claude/`, `skills-lock.json` were left untouched and unstaged.

## Verification

```
$ npx tsc --noEmit
(no output — clean)

$ npx eslint app/api/health/route.ts app/api/metrics/route.ts
(no output — clean)
```

```
$ test -f load-tests/training-flow.js && test -f load-tests/README.md && grep -q "DORMANT" load-tests/training-flow.js && grep -q "2026-08-19" load-tests/README.md && echo OK
OK

$ test -f .planning/MONITORING.md && grep -q "METRICS_SECRET" .planning/MONITORING.md && grep -q "iurisdesk" .planning/MONITORING.md && echo OK
OK
```

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `41f3ee3` | `feat(health): deep health check verifying Supabase connectivity` |
| 2 | `efcac89` | `feat(metrics): add secret-protected concurrency metrics endpoint` |
| 3 | `d9fe05c` | `chore(load-tests): add dormant k6 training-flow skeleton` |
| 4 | `6414647` | `docs(monitoring): capacity alerting + observability roadmap` |

## Known Stubs

None functionally — the k6 script (`load-tests/training-flow.js`) is intentionally a skeleton with `TODO`-marked commented steps (no real auth, no real endpoints wired). This is by design per the plan: it's explicitly dormant, staging-only, and scheduled for review ~2026-08-19, not a stub blocking any current feature.

## Threat Flags

| Flag | File | Description |
|------|------|--------------|
| threat_flag: new-endpoint | app/api/metrics/route.ts | New public-reachable route (fail-closed behind `METRICS_SECRET`, 401 until the secret is set/matched). No query runs without a valid secret; secret is never logged. Requires `wrangler secret put METRICS_SECRET` before the endpoint is meaningfully usable — tracked as an action item in `.planning/MONITORING.md` §3. |

## Self-Check: PASSED

- FOUND: app/api/health/route.ts (modified, real Supabase connectivity check present)
- FOUND: app/api/metrics/route.ts (created, secret-gated metrics endpoint present)
- FOUND: load-tests/training-flow.js (created, DORMANT banner present)
- FOUND: load-tests/README.md (created, 2026-08-19 review date present)
- FOUND: .planning/MONITORING.md (created, METRICS_SECRET + iurisdesk sections present)
- FOUND commit 41f3ee3 in `git log --oneline --all`
- FOUND commit efcac89 in `git log --oneline --all`
- FOUND commit d9fe05c in `git log --oneline --all`
- FOUND commit 6414647 in `git log --oneline --all`
