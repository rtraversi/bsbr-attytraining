# Session Handoff

**Date:** 2026-06-25 (Wednesday)
**Who:** Max

---

## Rob's Context — Read Before Anything Else

- **Launch timeline:** Jul 20 go-live; Jul 1 code-complete; Jul 10 content-complete; Jul 13 testing week (≥6 testers)
- **Stripe live mode on hold:** LLC + EIN in progress; brand name may change — do NOT create live Stripe objects until both are confirmed
- **Rob action required:** Wire UptimeRobot to `https://bsbr-attytraining.aistaffcompliance.workers.dev/api/health` (5-min ping, SMS alert on failure)
- **Rob action required (AUTO-06):** Save all Worker secrets to password manager; confirm Supabase PITR enabled on prod project before launch
- **Rob action required:** Migrations 0006 + 0007 + 0008 are **all applied to prod** as of this session ✅
- **Rob action required:** Deploy cert-worker with renewal reminders: `cd workers/cert-worker && wrangler deploy --config wrangler.toml`

---

## What Was Done This Session

### Deploy + Migration

- **`pnpm run deploy`** — pushed all 7 6B-PRE commits (from 2026-06-24/25 sessions) to production
  - Build failed first attempt due to 4 lint errors in the new code; fixed inline before re-deploying
  - Second deploy succeeded: Worker version `644dfb73-565d-4699-b668-2cebea981a10`
- **`supabase db push`** — applied migration `0008_onboarding_dismissed.sql` to prod ✅
- **Lint fix commit** `29d1a73` — 4 files patched:
  - `terms/page.tsx`: escaped apostrophe (`firm&apos;s`)
  - `onboarding-checklist.tsx`: removed stale eslint-disable directive
  - `reassign-modal.tsx`: added eslint-disable for intentional `member?.id` dep tracking
  - `training-client.tsx`: removed unused `certUrl` destructure (modal fetches its own URL)

---

## Current Status

| Item | Status |
|------|--------|
| Phase 1 — Hello-cert e2e | ✅ Complete + deployed |
| Phase 2 — Quiz loop | ✅ Complete + deployed |
| Phase 3 — Dashboard (DASH-01..09) | ✅ Complete + deployed |
| Phase 4 — Automation (AUTO-03..05) | ✅ Complete + deployed |
| Phase 4 — AUTO-06 | ⬜ Rob's ops task |
| Phase 5 — RENEW-01..06 | ✅ Complete + deployed |
| Phase 6 — 6B-PRE (all 12 tasks) | ✅ Complete + deployed to prod |
| Phase 6 — 6A design | ⬜ Max's task (Stitch) |
| Phase 6 — 6B design implementation | ⏸ Blocked on design approval from Rob |
| Phase 6 — 6C QA scripts | ⏸ Write July 10–12 |

---

## Next Session — Pick Up Here

All 6B-PRE code is live on prod. The only remaining *code* work is:

1. **6A design** — Max presents two proposals to Rob for approval (Stitch)
2. **6B design implementation** — begins once Rob approves a design
3. **6C QA scripts** — write July 10–12, before the July 13 testing week

**No immediate code actions needed.** Next session should start with design discussion or 6B implementation if design is approved.

---

## Blocked on Rob

- Articulate Rise 360 web export → replaces iframe placeholder in `training-client.tsx`
- Real question pool (24–32 Qs) → replaces PLACEHOLDER seeds in DB
- LLC + EIN + brand name confirmation → unblocks Stripe live mode
- AUTO-06: secrets in password manager + Supabase PITR on prod
- UptimeRobot: wire health endpoint
- Attorney review: cert template, ToS, Privacy Policy, marketing copy
- Logo SVG trace (Max has PNG)
- Stripe Tax enabled on live account (PAY-06)
- `cd workers/cert-worker && wrangler deploy --config wrangler.toml` (renewal reminder cron)

---

## Key References

| Item | Value |
|------|-------|
| Main app URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| Cert-worker URL | `https://bsbr-cert-worker.aistaffcompliance.workers.dev` |
| Health endpoint | `https://bsbr-attytraining.aistaffcompliance.workers.dev/api/health` |
| Phase 6 plan | `.planning/PHASE-6.md` |
| Stripe sandbox account | AI Staff Compliance & Training (`acct_1ThDpr6ZCSojEKRr`) |
| Stripe Product ID | `prod_UgzKT3NrGNAvDA` |
| Stripe Price ID | `price_1TjNHc6ZCSojEKRrKs79ToJ0` (lookup: `per_seat_annual`) |
| Supabase dev project | `ndmzvtuywcufvkxtkjhg` (Max's account) |
| GitHub repo | `rtraversi/bsbr-attytraining` |
