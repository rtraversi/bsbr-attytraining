# Session Handoff

**Date:** 2026-06-17
**Who:** Max (Sessions 8 + 9)

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
| `20260617-max-summary.md` | Session 8 (Desktop) — smoke tests passed, Stripe account sorted, new Price ID, e2e test in progress |
| `20260617-max-summary-2.md` | Session 9 (Terminal) — Tasks 8–9 complete, 3 bugs fixed, workerd debugging, e2e unblocked |

If you only have time for two: read **Sessions 8 + 9** for current state.

---

## What Was Done

### Infrastructure (Max, Sessions 1–3, 2026-06-15)
- Scaffolded Next.js + Cloudflare Workers + Supabase project
- Auth wiring: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Applied migrations 0001 + 0002 (8 tables + cert queue, RLS, triggers, audit log)
- Fixed CF Workers 500 error (Supabase realtime WebSocket detection)
- 10/10 cross-tenant RLS isolation test passed

### Email / DNS setup (Rob, 2026-06-16)
- `info@aistaffcompliance.com` alias on Zoho, delivers to Rob's inbox
- Cloudflare DNS fully configured: Zoho MX/DKIM/SPF, Resend DKIM/verification/bounce MX, DMARC (p=none)
- Resend sending domain verified ✅

### Architecture confirmed (Rob, 2026-06-16)
- `aistaffcompliance.com` → Netlify (main marketing site — stays there permanently)
- Training app → Cloudflare Workers at `training.aistaffcompliance.com`

### Landing page + Stripe backend (Max, Sessions 5–6, 2026-06-16)
- Full Stitch design: hero, shader bg, features/bento, footer
- `app/api/checkout/route.ts` — Stripe Checkout endpoint (lazy Stripe init, null guard on session.url)
- `app/api/webhooks/stripe/route.ts` — full webhook handler (lazy Stripe init)

### Auth + full app flow (Max, Session 7, 2026-06-16)
- Onboarding, auth flows, employee invite, mark-pass stub

### Smoke tests + Stripe account (Max, Session 8 Desktop, 2026-06-17)
- All 7 smoke test checks green including Stripe CLI pipe test
- Stripe account sorted: use **AI Staff Compliance & Training** sandbox key
- New Price ID and Product ID created in correct account (see Key Reference IDs below)
- E2E test started, in progress at session end

### Resend + Cert Worker + Bug fixes (Max, Session 9 Terminal, 2026-06-17)
- **Task 8:** `lib/resend.ts`, `emails/admin-magic-link.tsx`, `emails/employee-invite.tsx`, `emails/cert-delivery.tsx` — wired into onboarding/complete and invite routes
- **Task 9:** `lib/cert-pdf.ts` (pdf-lib PDF generation), `app/api/certs/generate/route.ts` (Supabase webhook handler, full pipeline)
- **Bug fixes:** enrollment status 'passed' (was 'completed', violated DB constraint), employee activation on password set (`/api/auth/activate`), cert download button with signed URL
- **Workerd fixes:** middleware excludes /api/*, lazy Stripe init (`getStripe()`), Price ID updated

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
| Task 8 — Resend email wiring | ✅ Done |
| Task 9 — Cert generation Worker | ✅ Done |
| Task 10 — Real video + quiz component | ⬜ Blocked (Rob's content decision) |

---

## Immediate Next Steps

### Before e2e test can complete
1. **Create `certificates` Supabase Storage bucket** — Dashboard → Storage → New bucket → name: `certificates`, private
2. **Create Supabase Database Webhook** — Dashboard → Database → Webhooks → Create:
   - Table: `cert_generation_queue` / Event: `INSERT`
   - URL: `https://<preview-url>/api/certs/generate`
   - Header: `x-webhook-secret: <CERT_WEBHOOK_SECRET value>`
   - Note: preview URL changes each session — update this each time

### For Rob
- Review Phase 1 completion
- Decision needed: real video upload to CF Stream (unblocks Task 10)
- `pdf-lib` → ilovepdf API swap before launch (Rob has account, confirmed Session 8)
- Bea mascot integration — design locked, deferred

### Open questions
- Should Supabase prod project live under Rob's account or Max's?
- Stripe Tax: state registrations + CPA consult still open (Rob)

---

## Key Reference IDs

- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (under Max's account)
- **Stripe account to use:** AI Staff Compliance & Training (sandbox)
- **Stripe Price ID:** `price_1TjNHc6ZCSojEKRrKs79ToJ0` (lookup key: `per_seat_annual`, volume-tiered $35/$32/$28)
- **Stripe Product ID:** `prod_UiovBHrxJSDVpf`
- **Stripe API version in code:** `2026-05-27.dahlia`
- **GitHub repo:** `rtraversi/bsbr-attytraining`
- **Marketing site:** `aistaffcompliance.com` → Netlify (stays there)
- **Training app (launch):** `training.aistaffcompliance.com` → Cloudflare Workers

---

## Environment Variables (both `.env.local` AND `.dev.vars`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=           ← sandbox sk_test_... from AI Staff Compliance & Training account
STRIPE_WEBHOOK_SECRET=       ← from running: stripe listen --forward-to localhost:3000/api/webhooks/stripe
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=
CERT_WEBHOOK_SECRET=
```

Cloudflare Stream keys intentionally empty — no video yet.
