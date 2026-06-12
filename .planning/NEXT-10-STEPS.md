# Next 10 Steps — AI Compliance Training Platform

Onboarding checklist for Max (and Rob where noted). Replaces the "First 10 Steps" spreadsheet.
**Updated 2026-06-12** — reflects the adapter swap from `@cloudflare/next-on-pages` (deprecated) to `@opennextjs/cloudflare` and current status of each item.

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

### Step 3: Scaffold Next.js + OpenNext adapter — In Progress

**Owner:** Max | **Status:** In Progress (CHANGED — adapter swap required)

> **The `create next-app@15.5` scaffold is already in place and `pnpm dev` works. Do NOT start from scratch.**
> **Remove any `@cloudflare/next-on-pages` work (deprecated adapter). Follow the steps below.**

- [ ] Remove `@cloudflare/next-on-pages` (deprecated) if it was added: `pnpm remove @cloudflare/next-on-pages`
- [ ] Install the OpenNext adapter: `pnpm add @opennextjs/cloudflare@latest`
- [ ] Install/upgrade Wrangler as dev dep: `pnpm add -D wrangler@latest`
- [ ] Create `wrangler.jsonc` at the project root with this shape:
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
- [ ] Create `open-next.config.ts` at the project root:
  ```ts
  import { defineCloudflareConfig } from "@opennextjs/cloudflare";
  export default defineCloudflareConfig();
  ```
- [ ] Add scripts to `package.json`:
  ```json
  {
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
  }
  ```
- [ ] **IMPORTANT: Do NOT add `export const runtime = 'edge'` anywhere.** The OpenNext adapter uses the Node.js runtime via `nodejs_compat` — edge exports are unsupported and will break the build.
- [ ] Verify local workerd preview: `pnpm run preview` — the app should serve in workerd locally
- [ ] `pnpm dev` still works for daily development (Node-based, best DX)

---

### Step 4: Env vars — Not started

**Owner:** Max | **Status:** Done (per Max's report 2026-06-12 — unverified, code not yet pushed)

- [ ] Create `.env.local` for `next dev` (used by the Node-based local dev server):
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...
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

### Step 5: DB schema — Not started

**Owner:** Max | **Status:** Done (per Max's report 2026-06-12 — unverified; NOTE: attytraining-dev/prod projects are not in Rob's Supabase org — confirm which account owns them)

- [ ] Create migration `0001_initial_schema.sql` with these 8 tables:
  - `firms` — firm account, tier, seat count, stripe_customer_id
  - `firm_members` — `(firm_id, user_id, role)` where `role ∈ {firm_admin, employee}`
  - `enrollments` — employee enrollment in a course
  - `quiz_attempts` — individual attempts, pass/fail, score
  - `certificates` — issued certs, expires_at, unique cert ID
  - `training_events` — append-only audit log (invite_sent, login, video_started, etc.)
  - `processed_stripe_events` — idempotency table, `event_id PRIMARY KEY`
  - `cert_generation_queue` — dead-letter queue for failed cert generation
- [ ] RLS enabled on every table; `firm_id` indexed on every tenant-scoped table
- [ ] Run: `supabase db push` against the dev project
- [ ] Generate types: `supabase gen types typescript --linked > types/supabase.ts`
- [ ] Add a CI cross-tenant isolation test: as `firm_a` user, every query against tenant-scoped tables returns zero rows from `firm_b`

---

### Step 6: Supabase Auth wiring — Not started

**Owner:** Max | **Status:** Done (per Max's report 2026-06-12 — unverified, code not yet pushed)

- [ ] Install SSR package: `pnpm add @supabase/ssr @supabase/supabase-js`
- [ ] Create `lib/supabase/client.ts` exporting `createBrowserClient()` (Client Components only)
- [ ] Create `lib/supabase/server.ts` exporting `createServerClient()` (Server Components, Route Handlers, Server Actions — reads cookies via `cookies()` from `next/headers`)
- [ ] Create `middleware.ts` at repo root to refresh the auth token on every request — **mandatory, without it sessions expire mid-flow**
- [ ] Use `supabase.auth.getClaims()` (not `getSession()`) for authorization in server code
- [ ] Do NOT use `@supabase/auth-helpers-nextjs` — deprecated
- [ ] `firm_id` and `role` go into `app_metadata` (server-set, read-only from client) — NOT `user_metadata`

---

### Step 7: First deploy to Cloudflare Workers — Not started

**Owner:** Max | **Status:** Partially done / Blocked on Step 3 (per Max's report 2026-06-12 — unverified) — scaffold not pushed to GitHub; Workers deploy requires the OpenNext adapter from Step 3

- [ ] Push the scaffold to GitHub (branch: `main`)
- [ ] Connect repo in Cloudflare Workers Builds: Workers dashboard → Create → Connect to Git → select `rtraversi/bsbr-attytraining`
- [ ] Set env vars/secrets in the Worker's Settings (or via `wrangler secret put`)
- [ ] First deploy: `pnpm run deploy` (or let Workers Builds trigger on push)
- [ ] Confirm the app responds at the `*.workers.dev` URL
- [ ] Enable non-production branch builds + `preview_urls: true` in `wrangler.jsonc` for staging previews — each branch gets a stable `<branch>-<worker>.<subdomain>.workers.dev` alias
- [ ] For env-specific bindings/secrets (staging vs prod), use Wrangler Environments (`[env.staging]` block in `wrangler.jsonc`)

---

### Step 8: Stripe products and prices — Done (test mode) — live mode pending Stripe Tax

**Owner:** Rob | **Status:** Done (test mode) — live mode pending Stripe Tax

> **Pricing model (locked 2026-06-12, Rob):** Flat annual pricing — NO renewal discount. One annual Price per tier ($199/$349/$499), same price on renewal. No first-year/renewal price-swap logic; the Stripe subscription renews at the same Price ID; Customer Portal handles renewals natively. This supersedes the prior "renewal ~60% of original" model everywhere it appeared.

**Completed — test mode [x]:**

- [x] 3 Products created with tier + seat_cap metadata:
  - `prod_UgyZjCbV9uJdzX` — "Compliance Training — Up to 5 Seats" — metadata: `tier=basic`, `seat_cap=5`
  - `prod_UgyZ7rqNgXZYao` — "Compliance Training — 6–15 Seats" — metadata: `tier=standard`, `seat_cap=15`
  - `prod_UgyZ30zgvigsd6` — "Compliance Training — 16+ Seats" — metadata: `tier=pro`, `seat_cap=9999`
- [x] 1 annual Price per product (flat — same price on renewal; 3 prices total, one per tier):
  - `basic_annual` → `price_1ThachCzT2268ei9HlR1YivD` — $199/yr (prod_UgyZjCbV9uJdzX)
  - `standard_annual` → `price_1ThaciCzT2268ei9tooaKk8j` — $349/yr (prod_UgyZ7rqNgXZYao)
  - `pro_annual` → `price_1ThaciCzT2268ei9MRI94R1i` — $499/yr (prod_UgyZ30zgvigsd6)
- [x] `tax_code` `txcd_20060058` ("Training Services - Self-study Web-based") set on all 3 products; `tax_behavior=exclusive` set on all 3 prices

**Remaining — live mode [ ]:**

- [ ] Rob: provide BSBR Holdings LLC head_office address (Stripe dashboard → Settings → Tax, or via API) to activate Stripe Tax — currently PENDING; this is blocking the live-mode connection
- [ ] Rob: complete home-state sales-tax registration (+ CPA consult on multi-state SaaS sales tax) before switching to live mode
- [ ] Recreate all 3 products + 3 prices in LIVE mode before launch — only after Stripe Tax is enabled; the lookup_keys (`basic_annual`, `standard_annual`, `pro_annual`) make this scriptable
- [ ] Give the 3 test-mode Price IDs to Max for `.env.local` + the Worker's env (via `wrangler secret put` — **not** a CF Pages env dashboard)

---

### Step 9: Stub cert Worker — Not started

**Owner:** Max | **Status:** Not started

- [ ] Create a separate plain CF Worker project (not part of the Next.js Worker) for cert generation
- [ ] Stub: accepts POST → validates `X-Webhook-Secret` header → returns 200
- [ ] Deploy with `wrangler deploy` from the worker's directory
- [ ] Wire a Supabase Database Webhook on `quiz_attempts` → authenticated POST to the Worker endpoint
- [ ] Confirm the webhook fires and the Worker returns 200 (check CF Workers logs)

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

## Verification Gaps — Max's 2026-06-12 progress report (recorded by Rob's Claude)

Max reported Steps 1–7 complete except Step 3. Rob's Claude attempted to verify on 2026-06-12 and could NOT confirm the Step 4–7 work. Statuses above are marked "unverified" until these gaps close.

**Findings:**

- GitHub repo `rtraversi/bsbr-attytraining` (origin/main) contains NO app code — only CLAUDE.md, skills-lock.json, and .planning/. No scaffold, no migrations, no lib/supabase, no middleware.ts pushed. No other branches exist on the remote.
- Rob's Supabase org contains NO `attytraining-dev` or `attytraining-prod` projects — presumably created under Max's own Supabase account. Ownership/billing is an open question (confirm which account owns them).
- Cloudflare API auth check failed, so the Worker deploy could not be verified.
- Logical inconsistency: Step 7 (first deploy) cannot be fully complete without Step 3 — the OpenNext adapter is required to deploy Next.js to Workers — and Step 7's first checkbox ("Push the scaffold to GitHub") is demonstrably not done.

**Action items for Max (before claiming Step 7 done):**

- Push the scaffold + all Step 4–6 code to GitHub `main` so it can be verified.
- Confirm which Supabase account owns `attytraining-dev` / `attytraining-prod` (ownership + billing).
- Finish Step 3 (OpenNext adapter swap) before claiming Step 7 (Workers deploy depends on it).
