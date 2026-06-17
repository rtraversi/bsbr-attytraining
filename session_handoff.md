# Session Handoff

**Dates:** 2026-06-15 (Sessions 1–4, Max) · 2026-06-16 (Session 4, Rob) · 2026-06-16 (Sessions 5–7, Max) · 2026-06-17 (Sessions 8–9, Max)
**Who:** Max + Rob

---

## Phase 1 — COMPLETE ✅

All 9 tasks built and end-to-end test passed on 2026-06-17.

---

## What Was Done

See `.planning/sessions/` for full detail. Quick summary:

- **Sessions 1–3 (2026-06-15):** Scaffold, auth wiring, DB migrations, CF Workers setup
- **Session 4 (2026-06-16, Rob):** DNS/email setup, architecture confirmed
- **Sessions 5–7 (2026-06-16):** Landing page, Stripe checkout + webhook, onboarding, auth flows, invite, mark-pass stub, Resend email wiring, cert generation Worker
- **Sessions 8–9 (2026-06-17):** Fixed Stripe CLI account mismatch, fixed magic link auth route bug, completed full end-to-end test

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
| End-to-end test | ✅ PASSED |
| **Deploy to CF Workers** | ⬜ Next session |

---

## Immediate Next Steps (Rob + Max, 2026-06-18 morning)

1. Follow `.planning/DEPLOY-CHECKLIST.md` step by step
2. Rob reviews secret values before Max runs `wrangler secret put`
3. Deploy → verify live URL works → run end-to-end test on deployed URL
4. Decide: `*.workers.dev` as staging, or set up `training.aistaffcompliance.com` now?

---

## Critical Stripe Reference

| Item | Value |
|------|-------|
| Correct Stripe account | AI Staff Compliance & Training |
| Sandbox account ID | `acct_1ThDpr6ZCSojEKRr` |
| Sandbox secret key prefix | `sk_test_51ThDpr...` |
| Price ID in code | `price_1TjNHc6ZCSojEKRrKs79ToJ0` |
| stripe listen (local dev only) | `stripe listen --api-key sk_test_51ThDpr... --forward-to localhost:3000/api/webhooks/stripe` |
| STRIPE_WEBHOOK_SECRET (local) | Changes every stripe listen restart — copy new whsec_ to .env.local |
| STRIPE_WEBHOOK_SECRET (deployed) | Permanent — comes from Stripe Dashboard webhook endpoint (see DEPLOY-CHECKLIST Step 3) |

---

## Key Reference IDs

- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (under Max's account)
- **Stripe Price ID:** `price_1TjNHc6ZCSojEKRrKs79ToJ0`
- **Stripe Product ID:** `prod_UiovBHrxJSDVpf`
- **GitHub repo:** `rtraversi/bsbr-attytraining`
- **Marketing site:** `aistaffcompliance.com` → Netlify (stays there)
- **Training app (target):** `training.aistaffcompliance.com` → Cloudflare Workers

---

## Open Questions

- Supabase prod project — Max's account or Rob's? Needs Pro tier before launch
- `pdf-lib` → ilovepdf API swap (before launch, Rob has account)
- Bea the Legal Beagle — design locked, integration deferred
- Custom domain `training.aistaffcompliance.com` — set up now or after deploy verified?
