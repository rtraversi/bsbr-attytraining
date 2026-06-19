# Session Handoff

**Date:** 2026-06-19 (Friday)
**Who:** Max (Phase 3 dashboard sprint — full day)

---

## Rob's Context (pushed 2026-06-19 — read before anything else)

- **Launch timeline:** Jul 20 go-live; Jul 1 code-complete; Jul 10 content-complete; Jul 13 testing week (≥6 testers)
- **Stripe live mode on hold:** LLC + EIN in progress; brand name may change — do NOT create live Stripe objects until both are confirmed
- Full timeline in `.planning/PROJECT.md` → Launch Timeline section

---

## Previous Session Context (from 2026-06-18 — preserved for Rob)

Phase 1 and Phase 2 were deployed and passing e2e before today's session.

- Phase 1 deploy: Stripe httpClient fix, 8 Worker secrets set, live deploy passing
- Phase 2 quiz loop: server-side scoring, QuizComponent, training_events audit, cert trigger
- Quiz score float→int fix (`Math.round`), BSBR logo in cert PDF

---

## What Max Built Today (2026-06-19)

All Phase 3 features built. **Not yet deployed** — run deploy steps below on Monday.

### Prep fixes (done at session start)
- **"Try Again" quiz reset bug** — `attemptKey` counter + `key` prop forces QuizComponent remount on retake
- **Removed `devLink`** from `onboarding/complete` and `invite` routes — Resend confirmed working
- **Font swap** — replaced Google Fonts with local Gyrotrope + Host Grotesk (`public/fonts/`, `--font-gyrotrope`, `--font-host-grotesk`)

### Dashboard tasks built
| Task | What | Key files |
|------|------|-----------|
| DASH-01 | Employee table: training status (not_started/in_progress/passed/expired), score, completion date, cert download | `app/dashboard/page.tsx`, `_components/team-table.tsx`, `_components/cert-download-button.tsx` |
| DASH-03 | Bulk CSV invite — client-side parse, seat check, sequential invite loop, summary (`8 invited, 2 skipped…`) | `_components/csv-upload-form.tsx`, `app/api/invite/bulk/route.ts` |
| DASH-04 | Remind button per incomplete row — sends training-reminder email | `team-table.tsx`, `app/api/invite/remind/route.ts`, `emails/training-reminder.tsx` |
| DASH-05 | Seat reassignment — ReassignModal, soft-sets old member to `status='reassigned'`, creates new auth user + invite | `_components/reassign-modal.tsx`, `app/api/firm/member/reassign/route.ts` |
| DASH-07 | Firm attestation PDF — GET `/api/firm/attestation` builds single-page pdf-lib PDF of active certs; plain `<a>` download | `app/api/firm/attestation/route.ts` |
| DASH-08 | Rule 5.3 collapsible explainer (`<details>/<summary>`) below team table | `app/dashboard/page.tsx` |
| DASH-09 | Delete / PII redaction — `status='deleted'` on firm_members row, auth email → `deleted-{uuid}@redacted.invalid` | `app/api/firm/member/delete/route.ts` |
| AUTO-03 | Expiry cron (90/30/7 day buckets) + inactivity cron (per-firm `reminder_days`), both in cert-worker daily 9am UTC | `workers/cert-worker/src/index.ts`, `wrangler.toml`, `app/api/firm/settings/route.ts`, `_components/reminder-settings.tsx` |

### Migration 0004
`supabase/migrations/0004_reminder_settings.sql`:
- Adds `reminder_days integer DEFAULT 7` to `firms`
- Expands `training_events.event_type` CHECK → adds `expiry_reminder_sent`, `inactivity_reminder_sent`
- Fixes `firm_members.status` CHECK → adds `deleted`, `reassigned` (retroactive for DASH-09 / DASH-05)

---

## Current Status

| Item | Status |
|------|--------|
| Phase 1 — Hello-cert e2e | ✅ Complete + deployed |
| Phase 2 — Quiz loop | ✅ Complete + deployed |
| Phase 3 — Dashboard (DASH-01, 03, 04, 05, 07, 08, 09) | ✅ Built — needs deploy |
| AUTO-03 — Reminder crons | ✅ Built — cert-worker needs deploy |
| Migration 0003 (quiz_questions) | ⬜ `supabase db push` not run yet |
| Migration 0004 (reminder_days + CHECK fixes) | ⬜ `supabase db push` not run yet |
| Phase 3 remaining (DASH-02, DASH-06, DASH-10) | ⬜ Not built yet |
| Rise 360 iframe | ⬜ Blocked on Rob's web export |
| Real question pool (24–32 Qs) | ⬜ Blocked on Rob seeding DB |
| Custom domain `training.aistaffcompliance.com` | ⬜ Not set up |
| Stripe live mode | ⬜ On hold — LLC + EIN + brand name pending |

---

## Monday Deploy Steps (must run in order)

```bash
# 1. Apply both pending migrations + regen types
supabase db push
supabase gen types typescript --linked > types/supabase.ts

# 2. Deploy main Next.js app
pnpm run deploy

# 3. Deploy cert-worker (picks up new cron + reminder logic)
cd workers/cert-worker
wrangler deploy
cd ../..
```

---

## Remaining Phase 3 Tasks (not built yet)

- **DASH-02** — Seat usage bar / seat-cap warning in dashboard header
- **DASH-06** — Export audit log as CSV (`GET /api/firm/audit-log/export`, streams `training_events` as CSV)
- **DASH-10** — Expiry / renewal banner for the firm admin (surface when any cert expires within 90 days)

---

## Blocked on Rob

- Articulate Rise 360 web export → replaces iframe placeholder in `training-client.tsx`
- Real question pool (24–32 Qs) → replaces `PLACEHOLDER:*` seeds in DB
- LLC + EIN + brand name confirmation → unblocks Stripe live mode

---

## Key References

| Item | Value |
|------|-------|
| Deployed URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| Stripe sandbox account | AI Staff Compliance & Training (`acct_1ThDpr6ZCSojEKRr`) |
| Stripe Product ID | `prod_UgzKT3NrGNAvDA` |
| Stripe Price ID | `price_1TjNHc6ZCSojEKRrKs79ToJ0` (lookup: `per_seat_annual`) |
| Supabase dev project | `ndmzvtuywcufvkxtkjhg` (Max's account) |
| GitHub repo | `rtraversi/bsbr-attytraining` |
| NEXT_PUBLIC_APP_URL | Wrangler VAR (not secret) — do NOT `wrangler secret put` it (error 10053) |
| Resend from address | `AI Staff Compliance <info@aistaffcompliance.com>` |
