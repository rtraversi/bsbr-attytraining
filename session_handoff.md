# Session Handoff

**Date:** 2026-06-24 (Tuesday — full day session)
**Who:** Max

---

## Rob's Context — Read Before Anything Else

- **Launch timeline:** Jul 20 go-live; Jul 1 code-complete; Jul 10 content-complete; Jul 13 testing week (≥6 testers)
- **Stripe live mode on hold:** LLC + EIN in progress; brand name may change — do NOT create live Stripe objects until both are confirmed
- **Rob action required:** Wire UptimeRobot to `https://bsbr-attytraining.aistaffcompliance.workers.dev/api/health` (5-min ping, SMS alert on failure)
- **Rob action required (AUTO-06):** Save all Worker secrets to password manager; confirm Supabase PITR enabled on prod project before launch
- **Rob action required:** Apply migrations 0006 + 0007 to prod if not done: `supabase db push`
- **Rob action required:** Deploy cert-worker with renewal reminders: `cd workers/cert-worker && wrangler deploy --config wrangler.toml`

---

## What Was Done Today

### Phase 5 — COMPLETE

#### RENEW-01 + RENEW-02 — Renewal reminder emails
- **Migration 0006** (`supabase/migrations/0006_renewal_reminder_event_type.sql`) — adds `renewal_reminder_sent` to `training_events.event_type` CHECK constraint
- **cert-worker** (`workers/cert-worker/src/index.ts`) — new `runRenewalReminders` function in the `0 9 * * *` daily cron
  - Queries firms where `current_period_end` is 30/14/3 days away (±1 day)
  - Emails the firm admin: cert status summary (X of Y staff certified) + dashboard link
  - Deduplicates via `training_events` (renewal_reminder_sent + days_remaining, 24h window)
  - Parallel with existing expiry + inactivity reminders

#### RENEW-05 — Renewal re-enrollment verified + supporting fixes
- **Bug found and fixed:** Both `app/dashboard/training/page.tsx` and `app/api/quiz/attempt/route.ts` were ordering by `created_at` — that column does not exist on `enrollments`. Correct column is `enrolled_at`. Both fixed.
- **Migration 0007** (`supabase/migrations/0007_drop_enrollment_unique_constraint.sql`) — dropped `enrollments_firm_id_user_id_course_id_key` unique constraint so renewal cycles can insert new enrollment rows per user
- **cert_pending auto-poll** (`training-client.tsx`) — was already present but had no 60s cutoff; updated to 4s interval, stops after 60s
- **Dynamic nav link** — new `NavLink` client component (`app/dashboard/_components/nav-link.tsx`) uses `usePathname()` to show "← Dashboard" on `/dashboard/training` and "My Training" everywhere else; wired into `app/dashboard/layout.tsx`

#### RENEW-06 — Grace period banner + webhook logic
- **Dashboard banner** (`app/dashboard/page.tsx`) — amber banner at 1–30 days overdue, red banner at >30 days, both with "Renew now →" linking to `/api/portal`
- **Portal route** (`app/api/portal/route.ts`) — new `GET /api/portal` creates a Stripe Customer Portal session for the logged-in firm admin and redirects
- **Stripe webhook** (`app/api/webhooks/stripe/route.ts`) — `handlePaymentSucceeded` refactored:
  - Handles both `subscription_cycle` (normal renewal) and `subscription_create` (lapsed re-sub via portal)
  - Falls back to `stripe_customer_id` lookup when new subscription ID doesn't match (lapsed firms get a new sub ID); updates `stripe_subscription_id` on the firm
  - Computes `daysOverdue` from `firm.current_period_end` at payment time
  - Grace path (0–30 days): skip-if-already-enrolled (same as RENEW-04)
  - Lapsed path (>30 days): reactivates deactivated members, always re-enrolls
  - Guards against double-processing initial purchases (`subscription_create` + `daysOverdue <= 0` → skip)
  - Updates `current_period_end` from `invoice.lines.data[0].period.end` on every successful payment

### Phase 6 — Planned

- **`.planning/PHASE-6.md`** written — full roadmap for launch polish & QA
  - Track 6A: UI redesign (Max + Stitch, pending Rob approval)
  - Track 6B-PRE: 12 code tasks ready to build (no design approval needed) — see document for exact files + steps
  - Track 6B: design implementation (blocked on 6A approval)
  - Track 6C: QA test scripts (to be written July 10–12)
  - Rob's deliverables: Rise export, questions, LLC/EIN/brand, secrets, UptimeRobot, legal review

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
| Phase 6 — 6B-PRE code tasks | ❌ Not started — see .planning/PHASE-6.md |
| Phase 6 — 6A design | ⬜ Max's task (Stitch) |
| Phase 6 — 6B design implementation | ⏸ Blocked on design approval |
| Phase 6 — 6C QA scripts | ⏸ Write July 10–12 |

---

## Next Session — Pick Up Here

**Read `.planning/PHASE-6.md` first.** It has all 12 6B-PRE tasks with exact files and steps.

**Suggested starting order (highest launch risk first):**
1. **6B-PRE-10** — FND-01: Privacy / ToS / DPA placeholder pages + shared footer
2. **6B-PRE-11** — FND-06: Add missing disclaimer to homepage, training page, cert PDF
3. **6B-PRE-12** — PAY-07: Refund policy text below checkout CTA on homepage
4. **6B-PRE-03** — Compliance score hero metric on dashboard
5. **6B-PRE-05** — Empty state for zero employees
6. **6B-PRE-06** — Onboarding checklist (needs migration 0008)
7. **6B-PRE-01** — Reassign modal confirmation (show new name/email on success)
8. **6B-PRE-07** — Toast notifications
9. **6B-PRE-04** — Status chips with icons
10. **6B-PRE-02** — Login page role context copy
11. **6B-PRE-09** — Cert download preview modal
12. **6B-PRE-08** — Skeleton loading states (do last)

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
- `supabase db push` for migrations 0006 + 0007 (if not yet applied)
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
