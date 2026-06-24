# Session Handoff

**Date:** 2026-06-24 (Tuesday)
**Who:** Max (Phase 5 — RENEW-01 + RENEW-02)

---

## Rob's Context — Read Before Anything Else

- **Launch timeline:** Jul 20 go-live; Jul 1 code-complete; Jul 10 content-complete; Jul 13 testing week (≥6 testers)
- **Stripe live mode on hold:** LLC + EIN in progress; brand name may change — do NOT create live Stripe objects until both are confirmed
- **Rob action required:** Wire UptimeRobot to `https://bsbr-attytraining.aistaffcompliance.workers.dev/api/health` (5-min ping, SMS alert on failure)
- **Rob action required (AUTO-06):** Save all Worker secrets to password manager; confirm Supabase PITR enabled on prod project before launch

---

## What Was Done Today

### RENEW-01 + RENEW-02 — Renewal reminder emails (code complete, pending your deploy)

**Migration 0006** (`supabase/migrations/0006_renewal_reminder_event_type.sql`):
- Adds `renewal_reminder_sent` to the `training_events.event_type` CHECK constraint

**cert-worker** (`workers/cert-worker/src/index.ts`):
- New `runRenewalReminders` function added alongside the existing daily cron jobs
- Queries `firms` where `current_period_end` is 30, 14, or 3 days away (±1 day tolerance)
- Emails the firm admin: cert status summary (X of Y staff certified) + button to dashboard
- Deduplicates via `training_events` — skips if a `renewal_reminder_sent` event was already logged for this firm + bucket within the last 24h
- Uses the owner's `firm_members` row as the FK source for the audit event
- Wired into the `0 9 * * *` daily cron alongside expiry + inactivity reminders (all run in parallel)

**TypeScript check:** passed clean.

**You need to run these two commands to deploy:**
```bash
# 1. Apply the migration
supabase db push

# 2. Deploy the cert-worker (ALWAYS use --config flag)
cd workers/cert-worker && wrangler deploy --config wrangler.toml
```

---

## Current Status

| Item | Status |
|------|--------|
| Phase 1 — Hello-cert e2e | ✅ Complete + deployed |
| Phase 2 — Quiz loop | ✅ Complete + deployed |
| Phase 3 — Dashboard (DASH-01..09) | ✅ Complete + deployed |
| Phase 4 — Automation (AUTO-03..05) | ✅ Complete + deployed |
| Phase 4 — AUTO-06 | ⬜ Rob's ops task |
| Phase 5 — RENEW-03 | ✅ Done (Stripe Customer Portal handles it) |
| Phase 5 — RENEW-04 | ✅ Built + deployed |
| Phase 5 — RENEW-01 + RENEW-02 | ✅ Code complete — needs `supabase db push` + `wrangler deploy` |
| Phase 5 — RENEW-05 | ❌ Not verified end-to-end |
| Phase 5 — RENEW-06 | ❌ Not built |

---

## Next Session — Pick Up Here

**After you deploy today's changes (`supabase db push` + `wrangler deploy --config wrangler.toml`):**

### RENEW-05 — Verify expired employee can re-take quiz after renewal re-enrollment
- End-to-end check: simulate an employee whose cert has expired and a new `enrollments` row was created by RENEW-04 (the `billing_reason=subscription_cycle` webhook path)
- Verify the training page shows the quiz as available (not gated by old expired enrollment)
- Key code: `app/api/quiz/attempt/route.ts` — enrollment lookup orders by `created_at DESC` (fixed in RENEW-04 session)

### RENEW-06 — 30-day grace period banner + Stripe webhook logic
- When `current_period_end` has passed but the firm hasn't renewed (firm status is still `active` but expired):
  - Show a banner in the dashboard warning the admin
  - Stripe webhook: `invoice.payment_failed` already marks firm as `payment_failed` — verify this covers the expired-but-unpaid case
  - Employee access: block new quiz attempts for `payment_failed` firms; existing certs remain valid (immutable record)

---

## Blocked on Rob

- Articulate Rise 360 web export → replaces iframe placeholder in training-client.tsx
- Real question pool (24–32 Qs) → replaces PLACEHOLDER seeds in DB
- LLC + EIN + brand name confirmation → unblocks Stripe live mode
- AUTO-06: secrets in password manager + Supabase PITR on prod
- UptimeRobot: wire health endpoint

---

## Key References

| Item | Value |
|------|-------|
| Main app URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| Cert-worker URL | `https://bsbr-cert-worker.aistaffcompliance.workers.dev` |
| Health endpoint | `https://bsbr-attytraining.aistaffcompliance.workers.dev/api/health` |
| Stripe sandbox account | AI Staff Compliance & Training (`acct_1ThDpr6ZCSojEKRr`) |
| Stripe Product ID | `prod_UgzKT3NrGNAvDA` |
| Stripe Price ID | `price_1TjNHc6ZCSojEKRrKs79ToJ0` (lookup: `per_seat_annual`) |
| Supabase dev project | `ndmzvtuywcufvkxtkjhg` (Max's account) |
| GitHub repo | `rtraversi/bsbr-attytraining` |
