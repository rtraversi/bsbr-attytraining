# Session Handoff

**Date:** 2026-06-15 (Sessions 1–4, all Max)
**Who:** Max

---

## How to Get Fully Caught Up (for Claude or Rob)

Session summaries live in `.planning/sessions/`. Read them in order:

| File | What it covers |
|------|---------------|
| `20260615-max-summary.md` | Session 1 — initial scaffold, CF Workers setup, env vars |
| `20260615-max-summary-2.md` | Session 2 — auth wiring, migration 0002, RLS isolation test, CF 500 fix |
| `20260615-max-summary-3.md` | Session 3 — codebase walkthrough, verification pass, package.json fix |
| `20260615-max-summary-4.md` | Session 4 — Max's personal terminal workflow + pdfedit tool (not project work) |

If you only have time for one: read **Session 3** for project state, **Session 2** for the deepest technical context.

---

## What Was Done Today (Max, all four sessions)

### Project work (Sessions 1–3)
- Scaffolded the full Next.js + Cloudflare Workers + Supabase project
- Implemented auth wiring: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Applied migrations 0001 (8 tables, RLS, triggers) and 0002 (audit log + cert queue)
- Fixed a CF Workers 500 error caused by Supabase realtime WebSocket detection
- Built and ran a 10/10 cross-tenant RLS isolation test
- Verified Worker secrets (`WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) are set in CF dashboard
- Fixed `package.json` name from `"aistaffcompliance"` to `"bsbr-attytraining"`
- Walked through all core files to build a mental model before Phase 1 UI work

### Personal tooling (Session 4 — not project work)
- Max upgraded his terminal (Starship, fzf, zoxide, zsh-autosuggestions, etc.)
- Built `pdfedit` — a personal PDF CLI tool on Max's machine (not in the repo)

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

## Next Steps (in order)

1. Run smoke test locally: `pnpm dev` → `pnpm run preview` → Supabase auth test user → DB queries
2. Confirm Workers Builds is connected to `rtraversi/bsbr-attytraining`; get `*.workers.dev` URL
3. Rob: curl cert Worker with/without `X-Webhook-Secret` to confirm 200/401
4. Rob: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` pipe test
5. Once smoke test passes — sync with Rob on Phase 1 dashboard UI

---

## Open Questions

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
