# Session Handoff

**Date:** 2026-06-23 (Monday)
**Who:** Max (Phase 3 completion + Phase 4 + Phase 5 start)

---

## Rob's Context — Read Before Anything Else

- **Launch timeline:** Jul 20 go-live; Jul 1 code-complete; Jul 10 content-complete; Jul 13 testing week (≥6 testers)
- **Stripe live mode on hold:** LLC + EIN in progress; brand name may change — do NOT create live Stripe objects until both are confirmed
- **Rob action required:** Wire UptimeRobot to `https://bsbr-attytraining.aistaffcompliance.workers.dev/api/health` (5-min ping, SMS alert on failure)
- **Rob action required (AUTO-06):** Save all Worker secrets to password manager; confirm Supabase PITR enabled on prod project before launch

---

## What Was Fixed / Deployed Today

### Bug fixes
- **Supabase Auth Site URL** — was pointing to localhost:3000; changed to `https://bsbr-attytraining.aistaffcompliance.workers.dev`. Password resets and magic links now work in production.

### Phase 3 — now fully complete
- **DASH-06** — Audit log CSV export: `GET /api/firm/audit-log/export` streams all `training_events` for the firm as a downloadable CSV. Button added to dashboard next to "Generate firm attestation (PDF)".

### Phase 4 — code complete
- **Cert-worker** — properly deployed as `bsbr-cert-worker` at `https://bsbr-cert-worker.aistaffcompliance.workers.dev`. Was never live before today (previous deploy accidentally used root wrangler.jsonc). Two crons running: drain every 5 min, daily reminders at 9am UTC.
- **Supabase webhook wired** — `quiz_attempts` INSERT → cert-worker (validates X-Webhook-Secret)
- **Cert generation confirmed wired** — `cert-queue-generate` webhook: `cert_generation_queue` INSERT → `/api/certs/generate`. Full pipeline: PDF generation, Storage upload, certificates row insert, email to employee.
- **AUTO-04** — `GET /api/health` live and responding `{"status":"ok","timestamp":"..."}`
- **AUTO-05** — cert-worker returns 401 on missing/wrong X-Webhook-Secret — verified with curl

### Phase 5 — RENEW-04 built (not yet deployed separately — included in today's deploy)
- **Migration 0005** — `renewal_enrolled` added to `training_events.event_type` CHECK constraint
- **Quiz attempt route** — enrollment lookup now orders by `created_at DESC` so renewal cycles always use the newest enrollment (prevents `maybeSingle()` error with multiple enrollments)
- **Stripe webhook** — `handlePaymentSucceeded` extended: on `billing_reason = 'subscription_cycle'`, loops active firm members, creates new `enrollments` rows (status = `not_started`), logs `renewal_enrolled` events, fires notification emails via `after()`

---

## Current Status

| Item | Status |
|------|--------|
| Phase 1 — Hello-cert e2e | ✅ Complete + deployed |
| Phase 2 — Quiz loop | ✅ Complete + deployed |
| Phase 3 — Dashboard (DASH-01..09) | ✅ Complete + deployed |
| Phase 4 — Automation (AUTO-03..05) | ✅ Code complete + deployed |
| Phase 4 — AUTO-06 | ⬜ Rob's ops task |
| Phase 5 — RENEW-03 | ✅ Done (Stripe Customer Portal handles it) |
| Phase 5 — RENEW-04 | ✅ Built + deployed |
| Phase 5 — RENEW-01 + RENEW-02 | ❌ Not built — next up |
| Phase 5 — RENEW-05 | ❌ Not verified end-to-end |
| Phase 5 — RENEW-06 | ❌ Not built |

---

## Next Session — Pick Up Here

**Immediate next task: RENEW-01 + RENEW-02**

Add renewal reminder emails to the cert-worker's daily cron (same pattern as expiry reminders already there). Query firms where `current_period_end` is 30, 14, or 3 days away. Email firm admin with cert status summary + Stripe Customer Portal link to renew. Dedup via `training_events`.

Then:
- **RENEW-05** — verify expired employee can re-take quiz after renewal re-enrollment
- **RENEW-06** — 30-day grace period banner in dashboard + logic in Stripe webhook

**Key technical facts for next session:**
- `firms.current_period_end` — stored in DB, updated by Stripe webhook on every renewal
- Cert-worker deploy: ALWAYS `cd workers/cert-worker && wrangler deploy --config wrangler.toml`
- Cert generation: quiz pass → cert_generation_queue → /api/certs/generate (NOT cert-worker fetch handler — that is a TODO stub)
- RENEW-04 code is deployed but can only be fully tested once Stripe live mode is active

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
