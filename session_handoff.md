# Session Handoff

**Dates:** 2026-06-15 (Sessions 1–4, Max) · 2026-06-16 (Sessions 5–7, Max) · 2026-06-17 (Sessions 8–9, Max) · 2026-06-18 (Sessions 10–11, Max)
**Who:** Max + Rob

---

## Phase 1 — COMPLETE ✅ (e2e test passed)

All 10 tasks built, deployed, and end-to-end verified on the live CF Workers URL. The full pipeline works:

**Stripe checkout → firm provisioned → admin magic link → dashboard → invite employee → employee sets password → mark pass → cert auto-generated → download button appears automatically**

---

## Deployed URL

**`https://bsbr-attytraining.aistaffcompliance.workers.dev`**

---

## IMMEDIATE ACTIONS REQUIRED (before any real customers)

### 1. Rob: Verify Resend domain
Every email (magic links, invites, cert delivery) is failing silently:
```
Resend 403: aistaffcompliance.com domain is not verified
```
Go to **resend.com/domains** → Add `aistaffcompliance.com` → Add the DNS records.

### 2. Remove devLink from production (quick code fix)
Two routes expose magic links directly in the API response (added for e2e testing):
- `app/api/onboarding/complete/route.ts` — change `devLink: actionLink` back to:
  `devLink: process.env.NODE_ENV === 'development' ? actionLink : undefined`
- `app/api/invite/route.ts` — same change

Then `pnpm run deploy`.

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
| Task 9 — Cert generation | ✅ Done |
| Task 10 — Cert download + cron drain | ✅ Done |
| **Phase 1 e2e test on live URL** | ✅ PASSED |

---

## Important Architecture Decisions Made This Session

### Cert generation — no longer uses Supabase webhook
The Supabase DB webhook never reliably delivered to CF Workers (pg_net issue). **Fix:** `mark-pass` now uses Next.js `after()` to call `/api/certs/generate` directly after returning its response. This is now the primary cert trigger. Supabase webhook stays as backup.

### Training page auto-polls
After mark-pass, training page polls `router.refresh()` every 3 seconds until cert appears. No manual refresh needed.

---

## Phase 2 — What's Next

**Blocked on Rob:** Articulate Rise 360 course export (Rob + Katy authoring)

When ready:
1. Host Rise web package on CF R2 or Articulate hosting
2. Replace video placeholder with Rise iframe on training page
3. Add "I have completed the training" confirmation gate before quiz
4. Build custom React certification quiz (~150–200 LOC) with server-side scoring
5. Remove "Mark as complete (stub)" button

---

## Key Reference IDs

- **Deployed URL:** `https://bsbr-attytraining.aistaffcompliance.workers.dev`
- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (Max's account)
- **Stripe Price ID:** `price_1TjNHc6ZCSojEKRrKs79ToJ0`
- **Stripe sandbox account:** AI Staff Compliance & Training (`acct_1ThDpr6ZCSojEKRr`)
- **GitHub repo:** `rtraversi/bsbr-attytraining`
- **NEXT_PUBLIC_APP_URL** — wrangler VAR (not secret). Do NOT `wrangler secret put` it.

---

## Open Questions

- Supabase prod project — Max's account or Rob's? Needs Pro tier before launch
- Custom domain `training.aistaffcompliance.com` — now or after Phase 2?
- cert-worker cron drain deploy — less urgent now that `after()` is primary trigger
- `pdf-lib` → ilovepdf API swap — before launch, Rob has account
