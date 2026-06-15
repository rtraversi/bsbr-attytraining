# Session Handoff

**Date:** 2026-06-15
**Who:** Max

---

## What Was Done

### RLS Isolation Test — PASSED (10/10)

The cross-tenant RLS isolation test (`tests/rls-isolation.test.ts`) was run against the live staging Supabase DB for the first time.

- **Migration 0002 status:** Already applied. `supabase migration list` confirms both 0001 and 0002 are in sync (Local and Remote).
- **Test result:** 10/10 passing in ~6s. All isolation assertions and positive controls passed.
- **`pnpm test` fix:** Vitest 4.x does not auto-load `.env.local`. Fixed by installing `dotenv-cli ^11.0.0` as a devDependency and updating the `test` / `test:watch` scripts to `dotenv -e .env.local -- vitest run` / `dotenv -e .env.local -- vitest`.

Committed in: `cf51982 test: fix pnpm test — add dotenv-cli for .env.local loading in vitest`

---

## Current Step Status (NEXT-10-STEPS.md)

| Step | Status |
|------|--------|
| 1 Accounts | ✅ Done |
| 2 Dev tools | ✅ Done |
| 3 OpenNext scaffold | ✅ Done |
| 4 Env vars | ✅ Done (Max's machine) |
| 5 DB schema | ✅ **Now Complete** — migration 0002 applied, RLS isolation test passing |
| 6 Auth wiring | ✅ Done (session 2) — client.ts, server.ts, middleware.ts implemented with CF Workers compat fix |
| 7 First deploy | ⬜ Unverified — need to confirm Workers Builds is on `rtraversi/bsbr-attytraining` |
| 8 Stripe objects | ✅ Test mode done; live mode blocked on Rob adding BSBR Holdings LLC address in Stripe Tax |
| 9 Cert Worker stub | ✅ Code done; deploy + webhook wiring unverified |
| 10 Smoke test | ⬜ Not started — 3/7 checks may be ready; Rob-side checks (6, 7) pending |

---

## Status

**Working:**
- All infrastructure accounts provisioned
- DB schema: migrations 0001 + 0002 applied and verified against staging
- RLS cross-tenant isolation: confirmed passing in integration test
- Auth wiring: implemented with CF Workers compatibility fix
- `pnpm test` works cleanly — runs against live staging DB, 10/10 green

**What still needs to happen before Step 10 smoke test is complete:**

1. **Max (local):** Run smoke-test checks 1–4 manually:
   - Check 1: `pnpm dev` — pages load, no console errors
   - Check 2: `pnpm run preview` — workerd local preview with `.dev.vars` loaded
   - Check 3: Create a Supabase Auth test user; verify session persists across navigation (middleware refresh)
   - Check 4: Verify DB queries visible in Supabase table editor after check 3
2. **Max:** Confirm Workers Builds is connected to `rtraversi/bsbr-attytraining` (Step 7); provide `*.workers.dev` URL to Rob
3. **Rob:** Check 6 — `curl` cert Worker endpoint with/without `X-Webhook-Secret`
4. **Rob:** Check 7 — `stripe listen --forward-to localhost:3000/api/webhooks/stripe` pipe test

---

## Next Steps (in order)

1. Run smoke-test checks 1–4 locally (`pnpm dev` → workerd preview → auth session → DB queries)
2. Confirm Workers Builds repo connection + Step 7 deploy; get `*.workers.dev` URL
3. Rob: complete checks 6 and 7 (cert Worker curl + Stripe CLI pipe)
4. Once all 7 checks pass: move to `/gsd:plan-phase 0` to formally decompose Phase 0 into executable tasks
5. Rob: Add BSBR Holdings LLC address in Stripe Tax to unblock live-mode Price creation

---

## Open Questions (unchanged)

- Should the Supabase **prod** project live under Rob's account or Max's?
- Reconcile marketing pricing bands (extends to 25+ users) vs. target-market framing in docs (1–15 staff)
- Stripe Tax: state registrations + CPA consult (~$300–$500) still open
- Articulate 360 trial outcome — Rob validating Rise hybrid course format; fallback = custom React interactive blocks or H5P
- Resend sending domain config (`noreply@aistaffcompliance.com` — SPF/DKIM/DMARC) not yet verified
- Reviewing attorney (~$500–$1,500) for cert + landing + TOS review not yet engaged

---

## Key Reference IDs

- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (under Max's account)
- **Stripe test-mode Price ID:** `price_1ThbLNCzT2268ei9nkadS8kD` (lookup key: `per_seat_annual`)
- **Stripe test-mode Product ID:** `prod_UgzKT3NrGNAvDA`
- **GitHub repo:** `rtraversi/bsbr-attytraining`
