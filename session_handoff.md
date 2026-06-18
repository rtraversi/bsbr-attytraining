# Session Handoff

**Dates:** 2026-06-15 (Sessions 1–4, Max) · 2026-06-16 (Session 4, Rob) · 2026-06-16 (Sessions 5–7, Max) · 2026-06-17 (Sessions 8–9, Max) · 2026-06-18 (Session 10, Max)
**Who:** Max + Rob

---

## Phase 1 — DEPLOYED ✅ (e2e test in progress)

All 10 tasks built and deployed to CF Workers. E2E test is mid-run — one redeploy needed to unblock it.

---

## Deployed URL

**`https://bsbr-attytraining.aistaffcompliance.workers.dev`**

---

## IMMEDIATE ACTION REQUIRED (before anything else)

```bash
pnpm run deploy
```

This deploys the fix for `app/api/onboarding/status/route.ts` (module-level Stripe init bug — same class as the checkout hang fix). Without this deploy, the onboarding page spins forever.

After deploy: run a fresh Stripe checkout with a new test email to resume e2e test.

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
| Task 10 — Cert download endpoint + cron drain | ✅ Done |
| **Phase 1 Deploy** | ✅ Deployed (1 more deploy needed) |
| **E2E test on live URL** | ⬜ In progress |

---

## Critical Fix Applied This Session — Read This

**Root cause of all hanging routes:** The Stripe Node SDK uses Node's `https` module for API calls. Under CF Workers `nodejs_compat`, this polyfill hangs on outbound connections — request received, no response ever sent.

**Fix:** `httpClient: Stripe.createFetchHttpClient()` inside every `getStripe()` lazy getter.

**Applied to all 4 routes:**
- `app/api/checkout/route.ts` ✅ deployed
- `app/api/webhooks/stripe/route.ts` ✅ deployed
- `app/api/onboarding/complete/route.ts` ✅ deployed
- `app/api/onboarding/status/route.ts` ✅ written, **needs deploy**

**If any new Stripe route is added:** always include `httpClient: Stripe.createFetchHttpClient()` in the `getStripe()` lazy getter. Never initialize Stripe at module scope.

---

## After E2E Passes — Next Steps

1. Deploy cert-worker (cron drain) — from `workers/cert-worker/` directory:
   - Fill in `APP_URL` in `wrangler.toml` with the workers.dev URL
   - `wrangler secret put CERT_WEBHOOK_SECRET` (same value as on main Worker)
   - `wrangler deploy`
2. Decide: keep `*.workers.dev` as staging URL or set up `training.aistaffcompliance.com` now?
3. Phase 2: Rise 360 iframe + custom React quiz (blocked on Rob's Rise export)
4. Phase 3: Full admin dashboard (DASH-01 through DASH-09)

---

## Key Reference IDs

- **Deployed URL:** `https://bsbr-attytraining.aistaffcompliance.workers.dev`
- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (under Max's account)
- **Stripe Price ID:** `price_1TjNHc6ZCSojEKRrKs79ToJ0`
- **Stripe sandbox account:** AI Staff Compliance & Training (`acct_1ThDpr6ZCSojEKRr`)
- **GitHub repo:** `rtraversi/bsbr-attytraining`
- **NEXT_PUBLIC_APP_URL** — set as a wrangler VAR (not secret). Do NOT run `wrangler secret put NEXT_PUBLIC_APP_URL` — will get error 10053.

---

## Open Questions

- Supabase prod project — Max's account or Rob's? Needs Pro tier before launch
- `pdf-lib` → ilovepdf API swap (before launch, Rob has account)
- Custom domain `training.aistaffcompliance.com` — set up now or after e2e verified?
- Cert-worker deploy timing — right after e2e, or wait for Phase 2?
