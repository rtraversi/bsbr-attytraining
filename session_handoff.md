# Session Handoff

**Dates:** 2026-06-15 (Sessions 1–4, Max) · 2026-06-16 (Session 4, Rob) · 2026-06-16 (Sessions 5–6, Max)
**Who:** Max + Rob

---

## How to Get Fully Caught Up (for Claude or Rob)

Session summaries live in `.planning/sessions/`. Read them in order:

| File | What it covers |
|------|---------------|
| `20260615-max-summary.md` | Session 1 — initial scaffold, CF Workers setup, env vars |
| `20260615-max-summary-2.md` | Session 2 — auth wiring, migration 0002, RLS isolation test, CF 500 fix |
| `20260615-max-summary-3.md` | Session 3 — codebase walkthrough, verification pass, package.json fix |
| `20260616-max-summary.md` | Session 5 — Stitch design brief locked, scrabble hero built, Phase 1 plan written, Bea SVGs |
| `20260616-max-summary-2.md` | Session 6 — Stitch landing page implemented, Stripe checkout + webhook handler built |

If you only have time for one: read **Session 6** for current code state.

---

## What Was Done

### Infrastructure (Max, Sessions 1–3, 2026-06-15)
- Scaffolded Next.js + Cloudflare Workers + Supabase project
- Auth wiring: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Applied migrations 0001 + 0002 (8 tables, RLS, triggers, audit log, cert queue)
- Fixed CF Workers 500 error (Supabase realtime WebSocket detection)
- 10/10 cross-tenant RLS isolation test passed
- Worker secrets set in CF dashboard

### Email / DNS setup (Rob, 2026-06-16)
- `info@aistaffcompliance.com` alias on Zoho, delivers to Rob's inbox
- Cloudflare DNS fully configured: Zoho MX/DKIM/SPF, Resend DKIM/verification/bounce MX, DMARC (p=none)
- Resend sending domain verified ✅

### Domain architecture (Rob, 2026-06-16)
- `aistaffcompliance.com` → Netlify (marketing site, stays there)
- Training app → Cloudflare Workers, subdomain `training.aistaffcompliance.com` at launch
- Dev/test uses `*.workers.dev` URL

### Landing page + Stripe backend (Max, Sessions 5–6, 2026-06-16)
- Full Stitch design implemented: `hero-section.tsx` (Lora tiles, word cycling, shader bg, Framer Motion), `shader-bg.tsx` (WebGL), `features-section.tsx` (glass cards, bento, footer)
- Fixed DM Sans font (circular CSS var bug)
- `app/api/checkout/route.ts` — Stripe Checkout endpoint (confirmed working)
- `lib/supabase/admin.ts` — service role client
- `app/api/webhooks/stripe/route.ts` — full webhook handler (TypeScript fixed for dahlia API breaking changes; needs `pnpm tsc --noEmit` confirm + `STRIPE_WEBHOOK_SECRET` env var)

---

## Current Phase 1 Task Status

| Task | Status |
|------|--------|
| Task 1 — Landing page | ✅ Done (Stitch design; needs browser review) |
| Task 2 — Stripe checkout endpoint | ✅ Done + confirmed working |
| Task 3 — Stripe webhook handler | 🟡 Code done; needs `pnpm tsc --noEmit` + `STRIPE_WEBHOOK_SECRET` to test |
| Task 4 — Onboarding page | ⬜ Not started |
| Task 5 — Auth flows | ⬜ Not started |
| Task 6 — Employee invite flow | ⬜ Not started |
| Task 7 — Mark-pass stub page | ⬜ Not started |

---

## Immediate Next Steps for Max

1. Run `pnpm tsc --noEmit` — expect zero errors in webhook handler
2. Add `STRIPE_WEBHOOK_SECRET` to `.env.local`:
   - Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Copy the `whsec_...` value it prints, add to `.env.local`
3. Begin **Task 4 — Onboarding page** (`app/onboarding/page.tsx`):
   - Page reads `?session_id=` from URL, polls until firm is provisioned (webhook may be slightly delayed)
   - Lets admin set firm name + triggers magic link to set password
4. **Task 5** → **Task 6** → **Task 7** in order

## Next Steps for Rob (pending)
- Add BSBR Holdings LLC address in Stripe Tax → unblocks live-mode objects

---

## Open Questions

- Should Supabase prod project live under Rob's account or Max's?
- Stripe Tax: state registrations + CPA consult still open (Rob)
- `RESEND_API_KEY` needs to be set on cert Worker before email delivery
- ~~Subdomain~~ — `training.aistaffcompliance.com` ✅
- ~~Reviewing attorney~~ — Katy handling ✅
- ~~Resend sending domain~~ — verified ✅
- ~~GitHub collaborator access for Max~~ — done ✅

---

## Key Reference IDs

- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (under Max's account)
- **Stripe Price ID:** `price_1ThbLNCzT2268ei9nkadS8kD` (lookup key: `per_seat_annual`)
- **Stripe Product ID:** `prod_UgzKT3NrGNAvDA`
- **Stripe API version in code:** `2026-05-27.dahlia`
- **GitHub repo:** `rtraversi/bsbr-attytraining`
- **Marketing site:** `aistaffcompliance.com` → Netlify (stays there)
- **Training app (launch):** `training.aistaffcompliance.com` → Cloudflare Workers
