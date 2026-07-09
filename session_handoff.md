# Session Handoff

**Date:** 2026-07-09 (Thursday) — *second Rob session this day (observability wiring)*
**Who:** Rob (with Claude). Rolls forward the earlier 2026-07-09 merged handoff (Rob's API/observability
groundwork + Max's shared QuizRunner redesign) — that context is still live and repeated under "Carried forward".

---

## ⚠️ Read this first — two things that bite

1. **PRODUCTION IS RUNNING A STALE BUILD.** Verified live this session against
   `https://bsbr-attytraining.aistaffcompliance.workers.dev`:
   - `GET /api/metrics` → **404** (route not in the deployed Worker).
   - `GET /api/health` → 200 but the **old shallow version** (body has no `db` field; the new deep
     check returns `{status, db, timestamp}`).
   → Rob's 2026-07-09 observability commits **and Max's quiz redesign are on `origin/main` but never
   deployed.** Nothing observability-related is truly live until someone runs `pnpm run deploy`.

2. **THE NEXT DEPLOY MAKES MAX'S QUIZ UI LIVE.** `pnpm run deploy` from a clean machine synced to
   `origin/main` ships Rob's observability endpoints **+ Max's committed QuizRunner redesign (`14b6507`)**
   — but NOT Max's 3 held uncommitted files. This is also literally Max's own pending "deploy + eyeball"
   step. **Coordinate before deploying** so it's intentional, not a surprise.

---

## What was done this session (Rob + Claude — observability wiring)

Working from `.planning/MONITORING.md`. Goal: make the observability groundwork actually fire.

- ✅ **`METRICS_SECRET` Worker secret SET** (`wrangler secret put METRICS_SECRET`, Rob ran it).
  Value is in Rob's password manager. BetterStack/iurisdesk must send the **same** string as an
  `x-metrics-secret` header to read `/api/metrics`. Secret is live immediately, but see "stale build"
  above — the `/api/metrics` route itself won't respond until a deploy.
- ⏳ **BetterStack uptime monitor on `/api/health`** — config handed to Rob (URL below, expect `200`,
  alert on `503`/timeout, 2 consecutive fails before paging, optional body-match `"status":"ok"`).
  **Not confirmed created** — verify in BetterStack.
- ⏸ **Supabase Prometheus resource alert @ ~70% — DEFERRED.** Blocked: project
  `ndmzvtuywcufvkxtkjhg` is **still free-tier**; the Prometheus endpoint only exists on **Pro**.
  Rob will upgrade to Pro **within the next week**. Full ready-to-run runbook below.

No code changed this session. No commits except this handoff (pending Rob's go-ahead).

---

## Key values (for whoever picks this up)

| Item | Value |
|------|-------|
| Main app URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| Health endpoint | `…/api/health` (deep check once deployed → `200 {status:ok, db:ok}` / `503 {status:degraded}`) |
| Metrics endpoint | `…/api/metrics` (401 without `x-metrics-secret`; 404 until deployed) |
| Supabase prod project ref | `ndmzvtuywcufvkxtkjhg` (NOT visible in the Supabase MCP connection — different account/org) |
| Supabase Prometheus URL | `https://ndmzvtuywcufvkxtkjhg.supabase.co/customer/v1/privileged/metrics` (Pro only) |
| Prometheus auth | HTTP Basic — user `service_role`, pass = a dedicated `sb_secret_…` key |

---

## Step 3 runbook — Supabase resource alert (do AFTER Pro upgrade)

1. Upgrade project `ndmzvtuywcufvkxtkjhg` to **Pro** (Supabase → Settings → Billing).
2. Create a **metrics-scoped** `sb_secret_…` key (Project Settings → API Keys) — dedicated so it can be
   rotated without touching the app's service-role key.
3. Smoke-test: `curl https://ndmzvtuywcufvkxtkjhg.supabase.co/customer/v1/privileged/metrics --user 'service_role:sb_secret_...'`
   → expect a wall of Prometheus text.
4. Ingest into **BetterStack** at 60s scrape. ⚠️ Confirm BetterStack's current mechanism (native
   Prometheus source vs. running their Vector collector with a `scrape_config` that remote-writes) —
   this is the one piece with real setup nuance; Supabase side is nailed down.
5. Alert rules **@ ~70% sustained** on CPU / memory / connection pool. Don't guess metric names —
   import Supabase's ready-made rules from `github.com/supabase/supabase-grafana` → `docs/example-alerts.md`
   and set thresholds to 70%.
6. When it fires: bump the Supabase compute add-on (brief restart — low-traffic hours). Cross-reference
   `/api/metrics` `activeSessions` to understand WHY load spiked.

This is the **real crash-preventer** ahead of the 10k→20k seats/yr goal.

---

## Next steps

**Immediate (Rob):**
- Confirm the BetterStack `/api/health` uptime monitor is actually created.
- Upgrade Supabase to Pro this week → then run the Step 3 runbook (~10 min).

**Deploy + verify (Max — unchanged from earlier today):** `pnpm run deploy`, then eyeball the new quiz
UI in prod — a real knowledge check (lessons 1–4 back-nav + change-answer), the lesson-5 readiness check
(banner + 80% gate), and the final assessment (no Previous, attestation → submit → cert generation).
Light + dark, mobile/tablet/desktop. **This deploy also lights up Rob's observability endpoints** —
after it, re-curl `/api/health` (should now show `db:ok`) and `/api/metrics` (200 with the secret).

**Decide on the 3 held files (Max):** commit as two commits per the 2026-07-08 plan
(`feat(dashboard): show firm name…` = layout + account-menu; `feat(quizzes): restyle…` = quizzes-client)
or revise first.

**Blocked on Rob providing info:**
- GitHub bug/feature submission — needs an example repo/config from another Rob site (ref: `C:\Sites\iurisdesk`). PINNED until product is named + live.
- iurisdesk.com central hub (cross-brand usage tracking) — queued as a **design spike** (own session).

**k6:** dormant by design — review ~2026-08-19.

---

## Carried forward (still open)

- **Double-billing gap** — FIXED by Rob earlier (`52d0a98` + `52cf9f5`); verify on deploy.
- **Overview page** low-contrast on light theme — deferred to a Figma pass.
- **Final assessment timer** — UI slot reserved ("No time limit"); no countdown logic yet.
- **Final assessment + certificate signing** — blocked on the real question pool; **Kapakana** font
  delivered, not yet wired into `public/fonts/`.
- **Homepage direction** (3-way) undecided. **Admin dashboard redesign** — saved for last.
- **Star milestone** — confirm star 2 = "lessons 1–4 cleared" is intended.
- Legal pages placeholder; cert / attestation PDFs reportedly mostly done, not re-checked.

---

## Workflow (in force)

- GSD workflow enforced — repo code edits go through a GSD command.
- Figma for app UI/screens; Affinity for illustration/logo/cert-art. No text-described layout iteration for new UI.
- Verify via `pnpm run deploy` (no persistent local dev server). Max runs pnpm/stripe/CLI himself.
- Git add/commit/push are Claude's — **only after explicit go-ahead.**
- Secrets in Worker env only (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `METRICS_SECRET`) — never in source.
- Authz uses `getClaims()` (not `getSession()`); `firm_id`/`role` from `app_metadata` (not `user_metadata`).

## Key references

| Item | Value |
|------|-------|
| Monitoring playbook | `.planning/MONITORING.md` |
| Rob's earlier session detail | `.planning/sessions/20260709-rob-summary.md` |
| Max's quiz commit | `14b6507` (pushed to origin/main, NOT deployed) |
| Quiz spec (local, Max) | `/Users/maxlugo/Attorney training/knowledge-check-quiz-v1.html` |
| GitHub repo | `rtraversi/bsbr-attytraining` |
