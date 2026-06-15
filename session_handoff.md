# Session Handoff

**Date:** 2026-06-15 (Session 3)
**Who:** Max

---

## What Was Done

### Codebase walkthrough (learning session)

Max walked through the core files with Claude to build a solid mental model before Phase 1 UI work begins:

- `middleware.ts` — reviewed (the bouncer; refreshes auth session on every request)
- `lib/supabase/client.ts` — reviewed (browser-to-Supabase connection via anon key)
- `lib/supabase/server.ts` — reviewed (server-side connection; reads session from cookies via `next/headers`)
- `supabase/migrations/0001_initial_schema.sql` — reviewed all 8 tables, RLS policies, triggers
- `supabase/migrations/0002_audit_and_queue.sql` — confirmed applied (tables visible in Supabase dashboard)

### Verified / fixed

- **`package.json` name** — corrected from `"aistaffcompliance"` to `"bsbr-attytraining"` (cosmetic, no functional impact)
- **Cert worker secrets** — `WEBHOOK_SECRET` confirmed set in Cloudflare dashboard; `SUPABASE_SERVICE_ROLE_KEY` confirmed set via CLI
- **Migration 0002** — confirmed applied to staging (tables present in Supabase dashboard)
- **`RESEND_API_KEY`** — not yet set, but email step in cert worker is a TODO stub anyway; not blocking

---

## Current Step Status (NEXT-10-STEPS.md)

| Step | Status |
|------|--------|
| 1 Accounts | ✅ Done |
| 2 Dev tools | ✅ Done |
| 3 OpenNext scaffold | ✅ Done |
| 4 Env vars | ✅ Done (Max's machine) |
| 5 DB schema | ✅ Done — 0001 + 0002 applied, RLS isolation test 10/10 |
| 6 Auth wiring | ✅ Done — client.ts, server.ts, middleware.ts implemented |
| 7 First deploy | ⬜ Unverified — confirm Workers Builds is on `rtraversi/bsbr-attytraining` |
| 8 Stripe objects | ✅ Test mode done; live mode blocked on Rob adding BSBR Holdings LLC address in Stripe Tax |
| 9 Cert Worker stub | ✅ Code done + secrets set; deploy + webhook wiring unverified |
| 10 Smoke test | ⬜ Not started |

---

## Next Steps

1. Run smoke-test checks locally: `pnpm dev` → `pnpm run preview` → Supabase auth test user → DB queries
2. Confirm Workers Builds is connected to `rtraversi/bsbr-attytraining`; get `*.workers.dev` URL
3. Rob: curl cert Worker with/without `X-Webhook-Secret` to confirm 200/401
4. Rob: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` pipe test
5. Once smoke test passes — sync with Rob on what to build first (dashboard UI)

---

## Open Questions (unchanged)

- Should Supabase prod project live under Rob's account or Max's?
- Stripe Tax: state registrations + CPA consult still open (Rob)
- `RESEND_API_KEY` needs to be set on cert worker before email delivery is implemented
- Resend sending domain (`noreply@aistaffcompliance.com` — SPF/DKIM/DMARC) not yet verified
- Reviewing attorney (~$500–$1,500) for cert + landing + TOS not yet engaged

---

## Key Reference IDs

- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (under Max's account)
- **Stripe test-mode Price ID:** `price_1ThbLNCzT2268ei9nkadS8kD` (lookup key: `per_seat_annual`)
- **Stripe test-mode Product ID:** `prod_UgzKT3NrGNAvDA`
- **GitHub repo:** `rtraversi/bsbr-attytraining`
