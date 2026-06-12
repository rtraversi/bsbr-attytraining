# Next 10 Steps — AI Compliance Training Platform

Onboarding checklist for Max (and Rob where noted). Replaces the "First 10 Steps" spreadsheet.
**Updated 2026-06-12** — reflects the adapter swap from `@cloudflare/next-on-pages` (deprecated) to `@opennextjs/cloudflare` and current status of each item. **Updated 2026-06-12 evening** — records VERIFIED statuses after Max's code was migrated to the correct repo `rtraversi/bsbr-attytraining` (clean squashed commit efc3214); all "per Max's report — unverified" annotations replaced with inspection-backed statuses.

---

### Step 1: Accounts — all done

**Owner:** Rob | **Status:** Done

- [x] Cloudflare account — created and connected to GitHub (`rtraversi/bsbr-attytraining`)
- [x] Supabase dev + prod projects (`attytraining-dev`, `attytraining-prod`) — created
- [x] Stripe account — created (Rob)
- [x] Resend account — created (Rob); sending domain config not yet verified (Step 4)
- [x] GitHub repo (`rtraversi/bsbr-attytraining`) — created (Max)

---

### Step 2: Local dev tools — Done

**Owner:** Max (Stripe CLI: Rob) | **Status:** Done

- [x] Node.js — installed; **NOTE: Max has v24; spec calls for v22 LTS. Recommend pinning v22 via nvm-windows:**
  - Install nvm-windows from https://github.com/coreybutler/nvm-windows
  - Run: `nvm install 22 && nvm use 22`
  - Verify: `node --version` should show `v22.x.x`
- [x] pnpm — installed and configured
- [x] Wrangler CLI — installed; **confirm version is 4.21+ for preview URL aliases:**
  - Verify: `wrangler --version` (should be >= 4.21)
  - Upgrade if needed: `pnpm add -g wrangler@latest`
- [x] Supabase CLI — installed (Max, Done)
- [x] Stripe CLI — **Done (Rob, 2026-06-12)** — v1.42.11 via winget (`Stripe.StripeCli`); `stripe login` authenticated to the "Built Smart by Rob" account (acct_1TYqL3CzT2268ei9); CLI session keys valid until 2026-09-10
  - Install: https://docs.stripe.com/stripe-cli
  - Verify: `stripe --version`
  - Auth: `stripe login`

---

### Step 3: Scaffold Next.js + OpenNext adapter — Done

**Owner:** Max | **Status:** Done — VERIFIED by inspection 2026-06-12

> **The `create next-app@15.5` scaffold is already in place and `pnpm dev` works. Do NOT start from scratch.**
> **Remove any `@cloudflare/next-on-pages` work (deprecated adapter). Follow the steps below.**

**Verified evidence (2026-06-12 inspection):** `wrangler.jsonc` matches spec shape — `main: ".open-next/worker.js"`, ASSETS binding, `nodejs_compat` compatibility flag, `compatibility_date: "2026-06-12"`, `preview_urls: true`. `open-next.config.ts` present. `package.json` has `preview`, `deploy`, and `cf-typegen` scripts. Dependencies: `@opennextjs/cloudflare ^1.19.11` + `wrangler ^4.99`. No `export const runtime = 'edge'` found anywhere. Runtime check (`pnpm run preview` in workerd) deferred to Monday smoke test.

- [x] Remove `@cloudflare/next-on-pages` (deprecated) if it was added: `pnpm remove @cloudflare/next-on-pages`
- [x] Install the OpenNext adapter: `pnpm add @opennextjs/cloudflare@latest`
- [x] Install/upgrade Wrangler as dev dep: `pnpm add -D wrangler@latest`
- [x] Create `wrangler.jsonc` at the project root with this shape:
  ```jsonc
  {
    "name": "bsbr-attytraining",
    "main": ".open-next/worker.js",
    "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
    "compatibility_flags": ["nodejs_compat"],
    "compatibility_date": "2026-06-12",
    "preview_urls": true
  }
  ```
- [x] Create `open-next.config.ts` at the project root:
  ```ts
  import { defineCloudflareConfig } from "@opennextjs/cloudflare";
  export default defineCloudflareConfig();
  ```
- [x] Add scripts to `package.json`:
  ```json
  {
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
  }
  ```
- [x] **IMPORTANT: Do NOT add `export const runtime = 'edge'` anywhere.** The OpenNext adapter uses the Node.js runtime via `nodejs_compat` — edge exports are unsupported and will break the build. **CONFIRMED: no edge exports found.**
- [ ] Verify local workerd preview: `pnpm run preview` — the app should serve in workerd locally *(deferred to Monday smoke test)*
- [x] `pnpm dev` still works for daily development (Node-based, best DX)

---

### Step 4: Env vars — Done (Max's machine)

**Owner:** Max | **Status:** Done on Max's machine (file contents unverifiable remotely); `.gitignore` verified to block `.env*`, `.dev.vars`, `.open-next/`, `node_modules`.

> **HISTORY NOTE (2026-06-12):** Max's code initially landed in the wrong repo (`rtraversi/aistaffcompliance`, the marketing site). The `.open-next/` build output was committed, leaking the dev Supabase service-role key (project `ndmzvtuywcufvkxtkjhg`) in a public repo for approximately 90 minutes. CONTAINED: Max rotated the key, made the repo private, zero forks; no other secrets leaked (Stripe/Resend/Stream values were empty). Code then migrated to `rtraversi/bsbr-attytraining` as one clean squashed commit `efc3214` (secret-free, co-authored Max Lugo); `aistaffcompliance` force-pushed back to marketing-only history (left private deliberately). **Max: update `.dev.vars` / `.env.local` with the ROTATED Supabase service-role key before running locally.**

- [ ] Create `.env.local` for `next dev` (used by the Node-based local dev server):
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...   ← use the ROTATED key (old key was leaked and invalidated)
  STRIPE_SECRET_KEY=...
  STRIPE_WEBHOOK_SECRET=...
  CLOUDFLARE_STREAM_SIGNING_KEY_ID=...
  CLOUDFLARE_STREAM_SIGNING_KEY_PEM=...
  RESEND_API_KEY=...
  ```
- [ ] Create `.dev.vars` for workerd preview (`pnpm run preview`) — same keys, different file format (Wrangler reads this for `wrangler dev`/`wrangler pages dev` and `opennextjs-cloudflare preview`)
- [ ] Production secrets go in the Worker's Settings, not a Pages dashboard:
  - Via CLI: `wrangler secret put STRIPE_SECRET_KEY` (repeat for each secret)
  - Or: Cloudflare dashboard → Workers → bsbr-attytraining → Settings → Variables & Secrets
- [ ] **Server-only keys must never appear in client code.** `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-only — never prefix with `NEXT_PUBLIC_`.

---

### Step 5: DB schema — Substantially Done

**Owner:** Max | **Status:** Substantially Done — VERIFIED 2026-06-12

**Verified evidence (2026-06-12 inspection):** `migration 0001_initial_schema.sql` (296 lines) creates 8 tables (`firms`, `courses`, `seats`, `firm_members`, `enrollments`, `quiz_attempts`, `certificates`, `processed_stripe_events`), RLS enabled on all 8 tables, 12 indexes including `firm_id` indexes on all tenant-scoped tables. `types/supabase.ts` (482 lines) generated against the live dev DB — proves `supabase db push` succeeded.

> **GAP — migration 0002 still needed (Max):** Two tables not in 0001: `training_events` (append-only audit log — required by COURSE-08, AUDIT-01..03) and `cert_generation_queue` (cert dead-letter queue). Max to create migration 0002 before Phase 0 completion.

- [x] Create migration `0001_initial_schema.sql` with these 8 tables:
  - [x] `firms` — firm account, tier, seat count, stripe_customer_id
  - [x] `firm_members` — `(firm_id, user_id, role)` where `role ∈ {firm_admin, employee}`
  - [x] `enrollments` — employee enrollment in a course
  - [x] `quiz_attempts` — individual attempts, pass/fail, score
  - [x] `certificates` — issued certs, expires_at, unique cert ID
  - [ ] `training_events` — append-only audit log (invite_sent, login, video_started, etc.) ← **needs migration 0002**
  - [x] `processed_stripe_events` — idempotency table, `event_id PRIMARY KEY`
  - [ ] `cert_generation_queue` — dead-letter queue for failed cert generation ← **needs migration 0002**
- [x] RLS enabled on every table; `firm_id` indexed on every tenant-scoped table
- [x] Run: `supabase db push` against the dev project *(confirmed — types/supabase.ts generated against live dev DB)*
- [x] Generate types: `supabase gen types typescript --linked > types/supabase.ts` *(482 lines)*
- [ ] Add a CI cross-tenant isolation test: as `firm_a` user, every query against tenant-scoped tables returns zero rows from `firm_b`

---

### Step 6: Supabase Auth wiring — In Progress

**Owner:** Max | **Status:** In Progress — files stubbed, no implementation **(Max's TOP PRIORITY)**

**Inspection finding (2026-06-12):** `middleware.ts`, `lib/supabase/client.ts`, and `lib/supabase/server.ts` are all 0-byte placeholder files — no implementation. Dependencies are installed (`@supabase/ssr ^0.12.0`, `@supabase/supabase-js ^2.108.1`). The Monday smoke test's auth check blocks entirely on this step.

- [x] Install SSR package: `pnpm add @supabase/ssr @supabase/supabase-js` *(installed; no implementation yet)*
- [ ] Create `lib/supabase/client.ts` exporting `createBrowserClient()` (Client Components only) ← **0-byte stub**
- [ ] Create `lib/supabase/server.ts` exporting `createServerClient()` (Server Components, Route Handlers, Server Actions — reads cookies via `cookies()` from `next/headers`) ← **0-byte stub**
- [ ] Create `middleware.ts` at repo root to refresh the auth token on every request — **mandatory, without it sessions expire mid-flow** ← **0-byte stub**
- [ ] Use `supabase.auth.getClaims()` (not `getSession()`) for authorization in server code
- [ ] Do NOT use `@supabase/auth-helpers-nextjs` — deprecated
- [ ] `firm_id` and `role` go into `app_metadata` (server-set, read-only from client) — NOT `user_metadata`

---

### Step 7: First deploy to Cloudflare Workers — Unverified

**Owner:** Max | **Status:** Unverified — pending Monday confirmation

**Inspection finding (2026-06-12):** Code is now in `rtraversi/bsbr-attytraining` (commit `efc3214`). However, any prior deploy predated the repo migration, so Workers Builds may still be connected to the old `rtraversi/aistaffcompliance` repo — or not connected at all. Cloudflare API was not accessible in Rob's session to verify. **Monday: Max provides the `*.workers.dev` URL and confirms Workers Builds is connected to `rtraversi/bsbr-attytraining` (not the old repo).**

- [x] Push the scaffold to GitHub (branch: `main`) *(done — commit efc3214 in bsbr-attytraining)*
- [ ] Connect repo in Cloudflare Workers Builds: Workers dashboard → Create → Connect to Git → select `rtraversi/bsbr-attytraining` ← **verify connection is to the correct repo (not aistaffcompliance)**
- [ ] Set env vars/secrets in the Worker's Settings (or via `wrangler secret put`)
- [ ] First deploy: `pnpm run deploy` (or let Workers Builds trigger on push)
- [ ] Confirm the app responds at the `*.workers.dev` URL ← **provide URL to Rob on Monday**
- [ ] Enable non-production branch builds + `preview_urls: true` in `wrangler.jsonc` for staging previews — each branch gets a stable `<branch>-<worker>.<subdomain>.workers.dev` alias
- [ ] For env-specific bindings/secrets (staging vs prod), use Wrangler Environments (`[env.staging]` block in `wrangler.jsonc`)

---

### Step 8: Stripe products and prices — Done (test mode) — live mode pending Stripe Tax

**Owner:** Rob | **Status:** Done (test mode) — live mode pending Stripe Tax

> **Pricing model (locked 2026-06-12, Rob):** Per-seat volume pricing — ONE Product + ONE volume-tiered Price. Stripe Checkout `quantity` = seats purchased; `adjustable_quantity` enabled so the buyer picks seat count in Checkout; Stripe auto-computes the band rate via `tiers_mode=volume` ($35/user/yr for 1–9, $32 for 10–24, $28 for 25+). Flat on renewal — same single Price ID reused at renewal; no separate renewal price. Supersedes BOTH prior same-day models (the original $199/$349/$499 tier bands AND the flat-tier variant).
>
> **Known accepted property of volume pricing:** 24 seats = $768 but 25 seats = $700 — the band rate drops for all seats when the count crosses the threshold.

**Completed — test mode [x]:**

- [x] 1 Product created:
  - `prod_UgzKT3NrGNAvDA` — "AI Staff Compliance Training — Annual Certification" — metadata: `pricing_model=per_seat_volume`, `tax_code=txcd_20060058`
- [x] 1 volume-tiered Price created:
  - `price_1ThbLNCzT2268ei9nkadS8kD` — lookup_key `per_seat_annual` — recurring yearly, `billing_scheme=tiered`, `tiers_mode=volume`: up_to 9 → $35/unit, up_to 24 → $32/unit, inf → $28/unit; `tax_behavior=exclusive`

**Archived (active=false, lookup keys released):**
- Products: `prod_UgyZjCbV9uJdzX` ("Up to 5 Seats") / `prod_UgyZ7rqNgXZYao` ("6–15 Seats") / `prod_UgyZ30zgvigsd6` ("16+ Seats")
- Prices: `price_1ThachCzT2268ei9HlR1YivD` (`basic_annual` $199) / `price_1ThaciCzT2268ei9tooaKk8j` (`standard_annual` $349) / `price_1ThaciCzT2268ei9MRI94R1i` (`pro_annual` $499)

**Remaining — live mode [ ]:**

- [ ] Rob: provide BSBR Holdings LLC head_office address (Stripe dashboard → Settings → Tax, or via API) to activate Stripe Tax — currently PENDING; this is blocking the live-mode connection
- [ ] Rob: complete home-state sales-tax registration (+ CPA consult on multi-state SaaS sales tax) before switching to live mode
- [ ] Recreate the single product + volume-tiered price in LIVE mode before launch — only after Stripe Tax is enabled; lookup_key `per_seat_annual` makes it scriptable
- [ ] Give the single test-mode Price ID `price_1ThbLNCzT2268ei9nkadS8kD` to Max for `.env.local` + the Worker's env (via `wrangler secret put` — **not** a CF Pages env dashboard)

---

### Step 9: Stub cert Worker — Code Done

**Owner:** Max | **Status:** Code Done — VERIFIED 2026-06-12 (deploy + webhook wiring still unverified)

**Verified evidence (2026-06-12 inspection):** `workers/cert-worker/src/index.ts` — validates `X-Webhook-Secret` header (returns 401 on mismatch); returns 405 on non-POST requests; returns 400 on malformed JSON; filters to `quiz_attempts` INSERT events where `passed=true`; returns 500 on unhandled paths (triggers Supabase webhook retry); typed `Env` interface for 4 secrets (`WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CERT_STORAGE_BUCKET`); numbered TODO stubs for PDF generation, Supabase Storage, and email delivery. Deploy and Supabase Database Webhook wiring have not been verified.

- [x] Create a separate plain CF Worker project (not part of the Next.js Worker) for cert generation *(workers/cert-worker/ directory)*
- [x] Stub: accepts POST → validates `X-Webhook-Secret` header → returns 200 *(full stub with 401/405/400/500 guards)*
- [ ] Deploy with `wrangler deploy` from the worker's directory ← **unverified**
- [ ] Wire a Supabase Database Webhook on `quiz_attempts` → authenticated POST to the Worker endpoint ← **unverified**
- [ ] Confirm the webhook fires and the Worker returns 200 (check CF Workers logs) ← **unverified**

---

> **Minor notes from 2026-06-12 inspection:** (1) `package.json` `"name"` field is still `"aistaffcompliance"` — cosmetic; suggested rename to `"bsbr-attytraining"` at Max's convenience. (2) React version is `19.1.0` vs. the spec's `18.3.x` — this is the `create-next-app` default; React 19.1.0 works with Next.js 15.5. Accepted as a noted spec deviation. Do NOT rewrite stack docs over this.

---

### Step 10: End-to-end smoke check — Not started

**Owner:** Max + Rob | **Status:** Not started

This validates the plumbing **before any features are written** — nothing here depends on app features existing yet:

- [ ] `pnpm dev` runs locally, pages load, no console errors
- [ ] `pnpm run preview` serves the app in workerd locally with `.dev.vars` loaded
- [ ] Supabase Auth creates a test user; session cookie works (middleware refresh confirmed)
- [ ] DB queries succeed against the dev project (check in Supabase table editor)
- [ ] The Next.js Worker URL (`*.workers.dev`) is reachable and returns the app
- [ ] The cert Worker URL is reachable via `curl` and returns 200 with the correct `X-Webhook-Secret` (401 without)
- [ ] Stripe CLI can forward a test event to `localhost:3000/api/webhooks/stripe` (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)

---

## Parallelism Note

- **Steps 1–4** can run in parallel (accounts, tooling, scaffold, env vars — no cross-dependencies beyond accounts needing to exist first)
- **Steps 5–7** are sequential and mark the start of **Phase 0 (Foundations)** work — schema → auth wiring → first deploy must happen in that order
- **Steps 8–10** lay the integration foundations and can begin once Step 7 (first deploy) is confirmed

---

## What Changed vs the Spreadsheet (2026-06-12)

The original "First 10 Steps" spreadsheet was written when the adapter decision was `@cloudflare/next-on-pages` (now deprecated by Cloudflare) on CF Pages. Three things changed on 2026-06-12:

1. **Adapter swap in Step 3:** `@cloudflare/next-on-pages` → `@opennextjs/cloudflare`. The old adapter is deprecated by Cloudflare; the OpenNext adapter on CF Workers is the official path. The scaffold method, config files (`wrangler.jsonc` + `open-next.config.ts`), and scripts all changed accordingly. `export const runtime = 'edge'` must NOT be added anywhere.

2. **Workers-not-Pages in Steps 4, 7, 8:** Env vars and secrets are managed via the **Worker's** Settings in the CF dashboard (or `wrangler secret put`) — not a CF Pages environment dashboard. Workers Builds replaces CF Pages' branch deploys + preview URLs.

3. **Statuses refreshed from spreadsheet (2026-06-12):**
   - Stripe account → **Done** (Rob)
   - Supabase CLI → **Done** (Max)
   - Stripe CLI → **Done** (Rob, 2026-06-12)

---

## Verification Gaps — Resolved 2026-06-12

All four prior gaps from the earlier unverified status report are now closed as of the 2026-06-12 evening inspection, following Max's code migration to `rtraversi/bsbr-attytraining`.

1. **Code pushed/verifiable** — CLOSED. App code is now in `rtraversi/bsbr-attytraining`, squashed commit `efc3214`, secret-free, co-authored Max Lugo.
2. **Supabase ownership** — CLOSED. Dev project `ndmzvtuywcufvkxtkjhg` confirmed under Max's Supabase account.
3. **Step 3→7 logical inconsistency** — CLOSED. Step 3 (OpenNext adapter) verified by inspection — `wrangler.jsonc`, `open-next.config.ts`, scripts, and dependencies all confirmed.
4. **CF deploy (Step 7)** — ONE remaining open item: Max to confirm the `*.workers.dev` URL and that Workers Builds is connected to `rtraversi/bsbr-attytraining` (not the old `aistaffcompliance` repo). Pending Monday.

---

## Monday Smoke-Test Runbook (Step 10)

Operational companion to the Step 10 checklist above. Run these items in order before the smoke-test call.

### Pre-flight (before the call) — Max unless noted

1. **Max: reset local clone to the new repo — CRITICAL.** Use `git reset --hard origin/main`, NOT a plain `git pull` (a plain pull reintroduces the dirty history from the old repo). Exact commands:
   ```bash
   git remote set-url origin https://github.com/rtraversi/bsbr-attytraining.git && git fetch origin && git checkout main && git reset --hard origin/main && pnpm install
   ```
2. **Max: implement Step 6 auth wiring** — `lib/supabase/client.ts` (`createBrowserClient`), `lib/supabase/server.ts` (`createServerClient` reading cookies via `cookies()` from `next/headers`), `middleware.ts` (token refresh on every request). Use `getClaims()` not `getSession()`. Do NOT use `@supabase/auth-helpers-nextjs`.
3. **Max: migration 0002** — add `training_events` + `cert_generation_queue` tables; `supabase db push`; regenerate `types/supabase.ts`.
4. **Max: update `.dev.vars` / `.env.local`** with the ROTATED Supabase service-role key (old key was leaked and is invalid).
5. **Max: confirm Workers Builds is connected to `rtraversi/bsbr-attytraining`** (not the old repo); redeploy if needed.
6. **Rob: grant Max collaborator access to `bsbr-attytraining`** *(in progress)*.

### Smoke-test sequence (run in order; owner per check)

| # | Check | Owner |
|---|-------|-------|
| 1 | `pnpm dev` — pages load, no console errors | Max |
| 2 | `pnpm run preview` — app serves in workerd with `.dev.vars` loaded | Max |
| 3 | Supabase Auth test user created; session survives navigation — middleware refresh confirmed | Max |
| 4 | DB queries against dev project visible in Supabase table editor | Max |
| 5 | Next.js Worker URL `*.workers.dev` responds (provide URL to Rob) | Max; Rob spot-checks |
| 6 | `curl` cert Worker endpoint with `X-Webhook-Secret` → 200; without → 401 | Rob (curl) |
| 7 | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` forwards a test event | Rob's CLI + Max's dev server |

> **NOTE on check 7:** The `/api/webhooks/stripe` route handler does not exist yet (it is Phase 1 work). For the smoke test, the check is only that the Stripe CLI forwards the event and the dev server receives and 404s — validating the pipe, not the handler.
