# Session Handoff

**Date:** 2026-06-25 (Wednesday)
**Who:** Max

---

## Rob's Context — Read Before Anything Else

- **Launch timeline:** Jul 20 go-live; Jul 1 code-complete; Jul 10 content-complete; Jul 13 testing week (≥6 testers)
- **Stripe live mode on hold:** LLC + EIN in progress; brand name may change — do NOT create live Stripe objects until both are confirmed
- **Rob action required:** Wire UptimeRobot to `https://bsbr-attytraining.aistaffcompliance.workers.dev/api/health` (5-min ping, SMS alert on failure)
- **Rob action required (AUTO-06):** Save all Worker secrets to password manager; confirm Supabase PITR enabled on prod project before launch
- **Rob action required:** Apply migrations 0006 + 0007 + **0008** to prod: `supabase db push`
- **Rob action required:** Deploy cert-worker with renewal reminders: `cd workers/cert-worker && wrangler deploy --config wrangler.toml`

---

## What Was Done This Session

### Track 6B-PRE — ALL 12 TASKS COMPLETE ✅

All pre-design code tasks are now done. Here's what was built across two sessions (2026-06-24 and 2026-06-25):

#### 6B-PRE-10 — Legal placeholder pages + shared footer
- `/privacy`, `/terms`, `/dpa` — structured placeholder pages, all body copy marked `[ATTORNEY TO COMPLETE]`
- `app/_components/footer.tsx` — shared footer with legal links + FND-06 disclaimer text; wired into homepage, login, and dashboard layout

#### 6B-PRE-11 — FND-06 disclaimer
- Footer carries it on every page automatically
- Also added explicitly to training page certified phase (below download button)
- Added to cert PDF footer (7pt centered text in `lib/cert-pdf.ts`)

#### 6B-PRE-12 — PAY-07 refund policy
- Added below checkout button on homepage inline in `app/page.tsx`

#### 6B-PRE-02 — Login role context copy
- Two lines added below "Sign in": firm admin context + staff member context

#### 6B-PRE-03 — Compliance score hero metric
- `ComplianceScore` component on admin dashboard; teal (100%), amber (50–99%), red (<50%), `—` for empty firm

#### 6B-PRE-05 — Empty state for zero employees
- `TeamTable` shows person-plus icon + guidance copy instead of empty table when `memberDetails.length === 0`

#### 6B-PRE-06 — Onboarding checklist
- 3-step dismissible checklist (Purchase → Invite → Certify)
- Auto-dismisses with "🎉 You're compliant!" when all steps done; manual Dismiss button available
- Migration 0008: `onboarding_dismissed boolean` column on `firms`
- Dismiss API: `POST /api/firm/onboarding/dismiss`

#### 6B-PRE-07 — Toast notifications
- `ToastProvider` + `useToast()` hook in `toast-provider.tsx`, wired into dashboard layout
- Toast calls on: invite sent, bulk CSV invites, reminder sent, employee deleted

#### 6B-PRE-01 — Reassign modal confirmation
- `reassign-modal.tsx` gains `'success'` phase — shows "Invite sent to [name] ([email])" in teal + Done button
- Also fires a toast on success

#### 6B-PRE-04 — Status chips with icons
- `TrainingStatusBadge` now includes 12×12 inline SVGs: circle (not started), clock (in progress), checkmark (passed), warning triangle (expired)

#### 6B-PRE-09 — Certificate download preview modal
- `cert-preview-modal.tsx` — shows cert#, name, issued/expires, course; Download PDF fetches signed URL
- Wired into dashboard team table (replaces raw cert link) and training page certified phase (replaces direct download)
- Dashboard cert query now includes `certificate_number`; `MemberDetail` extended with `certNumber`, `certIssuedAt`, `certExpiresAt`

#### 6B-PRE-08 — Skeleton loading states
- `app/dashboard/loading.tsx` — animated pulse skeleton: compliance score, checklist, invite form, CSV, 4-row table
- `app/dashboard/training/loading.tsx` — animated pulse skeleton: course header, Rise iframe area, content card

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
| Phase 6 — 6B-PRE (all 12 tasks) | ✅ Complete — 7 commits pushed to main |
| Phase 6 — 6A design | ⬜ Max's task (Stitch) |
| Phase 6 — 6B design implementation | ⏸ Blocked on design approval from Rob |
| Phase 6 — 6C QA scripts | ⏸ Write July 10–12 |

---

## Next Session — Pick Up Here

**All 6B-PRE tasks are done.** Next steps in order:

1. **Deploy:** `pnpm run deploy` to push all 7 new commits to production
2. **Apply migration 0008:** `supabase db push` (adds `onboarding_dismissed` column to prod firms table)
3. **6A design:** Max presents two design proposals to Rob for approval
4. **6B design implementation:** Begins once Rob approves a design
5. **6C QA scripts:** Write July 10–12, before the July 13 testing week

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
- `supabase db push` for migrations 0006 + 0007 + 0008 (if not yet applied)
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
