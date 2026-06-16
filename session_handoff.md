# Session Handoff

**Dates:** 2026-06-15 (Sessions 1–4, Max) · 2026-06-16 (Session 4, Rob) · 2026-06-16 (Sessions 5–7, Max)
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
| `20260616-max-summary-3.md` | Session 7 — Tasks 4–7 complete: onboarding, auth flows, invite, mark-pass stub |

If you only have time for one: read **Session 7** for current code state.

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

### Architecture confirmed (Rob, 2026-06-16)
- `aistaffcompliance.com` → Netlify (main marketing site — stays there permanently)
- Training app → Cloudflare Workers at `training.aistaffcompliance.com`
- Netlify site links into the CF training app — does NOT move to CF

### Landing page + Stripe backend (Max, Sessions 5–6, 2026-06-16)
- Full Stitch design: `hero-section.tsx` (Lora scrabble tiles, word cycling, shader bg, Framer Motion), `shader-bg.tsx` (WebGL), `features-section.tsx` (glass cards, bento, footer)
- `app/api/checkout/route.ts` — Stripe Checkout endpoint ✅
- `lib/supabase/admin.ts` — service role client
- `app/api/webhooks/stripe/route.ts` — full webhook handler

### Auth + full app flow (Max, Session 7, 2026-06-16)
- **Onboarding:** `/onboarding` polls for firm provisioning, collects firm name, generates magic link
- **Auth flows:** `/login`, `/forgot-password`, `/update-password`, `/auth/callback`, `/auth/confirm`, `/api/auth/logout`, middleware route protection
- **Employee invite:** `/api/invite`, `/dashboard` (admin + employee views), member table, seat tracking
- **Mark pass stub:** `/dashboard/training`, `/api/training/mark-pass` — exercises full pipeline: course → enrollment → quiz_attempt → cert_generation_queue

---

## Current Task Status

| Task | Status |
|------|--------|
| Task 1 — Landing page | ✅ Done |
| Task 2 — Stripe checkout endpoint | ✅ Done |
| Task 3 — Stripe webhook handler | ✅ Done |
| Task 4 — Onboarding page | ✅ Done |
| Task 5 — Auth flows | ✅ Done |
| Task 6 — Employee invite flow | ✅ Done |
| Task 7 — Mark pass stub | ✅ Done |
| Task 8 — Resend email wiring | ⬜ Not started |
| Task 9 — Cert generation Worker | ⬜ Not started |
| Task 10 — Real video + quiz component | ⬜ Not started |

---

## Immediate Next Steps

### For Rob (can do now)
- `pnpm dev` → open `http://localhost:3000` to review landing page
- Add BSBR Holdings LLC address in Stripe Tax → unblocks live-mode Stripe objects
- Decide: should the attorney-admin count as a seat? (currently they don't)

### For next dev session
1. **Set `RESEND_API_KEY` secret** — key is in the **RMT Portal**; retrieve it and run `wrangler secret put RESEND_API_KEY` in `workers/cert-worker/`. Do this first — tasks 2 and 3 both depend on it.
2. **Resend email wiring** — three TODO spots in code:
   - `app/api/onboarding/complete/route.ts` — admin magic link
   - `app/api/invite/route.ts` — employee invite link
   - Cert delivery email (when cert Worker is built)
3. **Cert generation Worker** — CF Worker that processes `cert_generation_queue`, generates PDF via `pdf-lib`, uploads to Supabase Storage `certificates/firms/{firm_id}/employees/{user_id}/{enrollment_id}.pdf`, inserts into `certificates`
4. **Real CF Stream video** — upload video, update `courses.cloudflare_stream_video_id` in Supabase

---

## Open Questions

- Should Supabase prod project live under Rob's account or Max's?
- Stripe Tax: state registrations + CPA consult still open (Rob)
- Should admin count against `used_seats`? (currently: no)
- `RESEND_API_KEY` — key is in RMT Portal; Max to retrieve and run `wrangler secret put RESEND_API_KEY` (assigned, next session)
- Landing page at `app/page.tsx` — keep as training subdomain entry point or simplify to redirect?

---

## Key Reference IDs

- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (under Max's account)
- **Stripe Price ID:** `price_1ThbLNCzT2268ei9nkadS8kD` (lookup key: `per_seat_annual`)
- **Stripe Product ID:** `prod_UgzKT3NrGNAvDA`
- **Stripe API version in code:** `2026-05-27.dahlia`
- **GitHub repo:** `rtraversi/bsbr-attytraining`
- **Marketing site:** `aistaffcompliance.com` → Netlify (stays there)
- **Training app (launch):** `training.aistaffcompliance.com` → Cloudflare Workers
