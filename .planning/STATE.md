# STATE — Iurix Accreditation (formerly "Athena")

**Last updated:** 2026-07-26 — refreshed against the actual codebase after sitting stale since
2026-06-12. The prior version claimed "Phase 0, 0% complete" while Phases 0–5 were built and
deployed; it misled the opening of at least two sessions. Verified by reading code, not notes.

> **Naming:** the product is **Iurix Accreditation** ("Iurix"). The rename is scoped but **not yet
> executed** — the codebase still says "Athena" and "Built Smart by Rob" throughout. See
> `.planning/RENAME-IURIX.md`. Katy has also referred to this project as "Aegix"; that name is dead.

---

## Project Reference

- **Product:** Iurix Accreditation — AI staff compliance training + certification under ABA Model Rule 5.3
- **Company:** Iurix — one of three companies under **BSBR Holdings, LLC** (alongside IurisIQ and
  Built Smart by Rob). Iurix is a **DBA** of BSBR Holdings, LLC.
- **Mode:** mvp | **Granularity:** standard
- **Core value:** An attorney can pay, invite their staff, see them complete the training, and
  produce certificates demonstrating Rule 5.3 supervision compliance — without operator intervention.
- **Live (sandbox):** `https://bsbr-attytraining.aistaffcompliance.workers.dev`
- **Cert Worker:** `https://bsbr-cert-worker.aistaffcompliance.workers.dev`
- **Supabase dev:** `ndmzvtuywcufvkxtkjhg` (under Max's account) | **Stripe sandbox:** `acct_1ThDpr6ZCSojEKRr`

---

## Current Position

- **Status:** **All six phases are code-complete and deployed to the sandbox environment.**
  The remaining work is not feature development — it is the **rename, the domain move, Stripe live
  mode, real content, and pre-launch ops hardening.**
- **Progress:** `[████████████████████] Phases 0–5 built & deployed (sandbox)`
- **Not launched.** Stripe has never run in live mode; no real customer has ever paid.

### Phase status — honest assessment

| Phase | Name | Code | Notes on what is NOT done |
|---|---|---|---|
| 0 | Foundations | ✅ Deployed | Legal pages live (`/terms`, `/privacy`, `/dpa`); `tests/rls-isolation.test.ts` exists; migrations `0001`–`0013` applied. **Open:** Resend sending-domain verification (and it must target the *new* Iurix domain); Supabase still on free tier — **Pro required before launch**. |
| 1 | Hello-cert end-to-end stub | ✅ Deployed | Checkout, 373-line webhook w/ `processed_stripe_events` idempotency + 5 handlers, cert PDF via `pdf-lib`, `cert_generation_queue` + 5-min drain, `/api/certificates/[id]/url` signed URLs. Superseded by Phase 2 (the "Mark Pass" stub is gone). |
| 2 | Rise 360 content + custom React quiz | ⚠️ Deployed, content-incomplete | Rise/SCORM export embedded and working; server-side scoring, identity attestation, unlimited retakes all built. **Open:** the question pool is a placeholder — 8 questions with **pool size == attempt size, so there is no randomization**. Roadmap criterion 3 (pool ≥ 3× per-attempt) is unmet. Content-blocked, not code-blocked. |
| 3 | Firm admin dashboard | ✅ Deployed | Verified present: `/api/firm/attestation`, `/api/firm/audit-log`, `/api/invite/bulk`, `csv-upload-form.tsx`, reminders, seat reassignment, member delete/redact. |
| 4 | Automation hardening | ⚠️ Deployed, ops-incomplete | Cert Worker crons live (`*/5` queue drain + `0 9` daily reminders); `X-Webhook-Secret` enforced; `/api/health` + secret-gated `/api/metrics` exist. **Open:** external uptime monitor never picked (UptimeRobot vs BetterStack); Supabase PITR needs Pro tier; **cert PDF logo is still a placeholder** (`lib/cert-pdf.ts:18`). |
| 5 | Renewal flow + launch polish | ⚠️ Deployed, launch-incomplete | Renewal re-enrollment, grace-vs-lapsed logic (30-day grace), reminder cadence, and expiry handling are all built in `invoice.payment_succeeded`. **Open:** attorney review of cert + landing copy + TOS never completed; iPad Safari / Chromebook QA not run. |

---

## 🔴 What actually stands between here and launch

### Blocked on Rob
1. **Pick + register the Iurix domain.** Blocks the URL sweep, Resend verification, and the Stripe
   live webhook registration.
2. **Logo artwork** — 3 files carry the "atc"/"athena." mark, incl. the base64 blob printed on the
   certificate (`lib/cert-pdf.ts:18`).
3. **Decide** whether the course keeps the name "AI Staff Compliance Training" (recommend: keep).
4. **Question pool size** — the ~24–32 target has been unresolved since 2026-06-12.
5. **Attorney review** of cert template + landing copy + TOS ($500–$1,500). Hard gate on launch.
6. **CPA consult** on SaaS sales tax + home-state registration (~$300–$500).

### Blocked on Katy
- Legal-accuracy pass on both question sets (`supabase/migrations/0003_quiz_questions.sql` — the
  certifying quiz; `lib/training/questions.ts` — 15 ungraded knowledge checks).

### Engineering (Max)
- **The rename** — see `.planning/RENAME-IURIX.md`. Layers 1 + 2 (25 files) are unblocked and can
  start now; Layers 4–6 wait on the domain.
- **Stripe live mode** — head-office address → Stripe Tax → live product/price → swap the hardcoded
  `PRICE_ID` at `app/api/checkout/route.ts:17` → register the webhook **on the new domain**.
  ⚠️ `app/api/checkout/route.ts:68` already sets `automatic_tax: { enabled: true }`, so **live
  checkout hard-fails until Stripe Tax is enabled.**
- **Auth performance** — ~5s per dashboard route. **Zero `getClaims()` usage repo-wide** despite
  CLAUDE.md mandating it; three serialized `getUser()` round-trips per navigation
  (`middleware.ts:36` → `app/dashboard/layout.tsx:11` → page) plus a `getUserById` fan-out at
  `app/dashboard/page.tsx:56`. ~7 files. **Awaiting Max's go-ahead since 2026-07-17.**
- **Supabase Pro upgrade** ($25/mo) — free tier pauses after 7 days idle and has no PITR.
- **Pick an external uptime monitor.**

---

## Locked Decisions

### 2026-07-26 (Rob) — naming + corporate structure
- **Product name: "Iurix Accreditation"** ("Iurix" for the company). Replaces "Athena".
- **BSBR Holdings, LLC is the parent.** Iurix, IurisIQ, and Built Smart by Rob are three separate
  companies under it. **Therefore "Built Smart by Rob" is a sibling brand, not this product's
  publisher, and must be removed from the product entirely** — not kept as a footer line.
- **Iurix is a DBA of BSBR Holdings, LLC.** Legal pages → "BSBR Holdings, LLC d/b/a Iurix".
  **This resolves the LLC/EIN half of the Stripe live-mode blocker** carried since 2026-06-12:
  Stripe activates on BSBR Holdings' existing EIN. No new entity, no new EIN.
- **Domain moves to an Iurix domain** (specific domain not yet chosen).

### Stack (carried)
- Next.js 15.5 LTS (App Router, Node runtime via `nodejs_compat`) on **Cloudflare Workers** via
  `@opennextjs/cloudflare`. No `runtime = 'edge'` anywhere.
- Supabase (Auth/Postgres/Storage); RLS via `firm_id`/`role` in `app_metadata`.
- Stripe webhook in a Next.js Route Handler; raw body via `req.text()`; idempotency table
  `processed_stripe_events(event_id PK)`.
- `pdf-lib` in a CF Worker for cert PDFs. `jose` (never `jsonwebtoken`).
- **Course content (2026-06-18, Rob — LOCKED):** Articulate Rise 360 web export as the learning
  layer, embedded via iframe, reporting no scores. The custom React quiz is the only certifiable
  layer. Cloudflare Stream is NOT used.
- **Pricing (2026-06-12, Rob):** per-seat volume — $35 (1–9) / $32 (10–24) / $28 (25+) per user/yr,
  all seats at the band rate, FLAT on renewal. ONE product + ONE volume-tiered price; Checkout
  `quantity` = seats; seat enforcement = subscription `quantity`.

---

## ⚠️ Known-stale references in other docs

- **CLAUDE.md Stripe IDs are wrong.** It names `price_1ThbLNCzT2268ei9nkadS8kD` /
  `prod_UgzKT3NrGNAvDA`. The code uses **`price_1TjNHc6ZCSojEKRrKs79ToJ0`**, hardcoded at
  `app/api/checkout/route.ts:17`, on sandbox `acct_1ThDpr6ZCSojEKRr`. Fix during the rename pass.
- **`.planning/ROADMAP.md` Progress table still reads "Not started" for all six phases** and its
  Phase 4 fallback still references Puppeteer-in-n8n (n8n is out of scope). Cosmetic; low priority.
- **`.planning/DEPLOY-CHECKLIST.md`** is a 2026-06-17 artifact describing the first deploy. Its
  Stripe/Resend/domain steps must be redone against the new domain.
- **`cloudflare_stream_video_id`** is vestigial — only ever written
  (`app/api/onboarding/complete/route.ts:82`), never read by any app code. A `NOT NULL` leftover
  from the pre-Rise Cloudflare Stream era. Drop it someday; not a gap.

---

## Resolved / closed

- ✅ Stripe Price IDs confirmed (sandbox). Live-mode recreation pending Stripe Tax.
- ✅ Articulate 360 outcome — Rise 360 locked 2026-06-18.
- ✅ LLC/EIN for Stripe activation — resolved 2026-07-26 via the DBA decision.
- ✅ Team-status "not started" bug — closed 2026-07-24, was a stale pre-deploy build, no bug.
- ✅ CF Error 1102 — dropped from tracking 2026-07-24; never recurred.
- ✅ Cert Worker is **not** dead code — ~500 lines running the queue drain + daily crons. Do not
  propose removing it.

---

## Session Continuity

- **2026-07-26 (Rob):** Scoping session, no code. Locked the Iurix name + corporate structure;
  produced `.planning/RENAME-IURIX.md`; corrected the "payment backend is unfinished" premise (it
  is built and deployed — the gap is live mode); refreshed this file. Commit `26729d3`.
- **2026-07-24 (Max, desktop):** Verification pass, no code. Deploy landed; closed the team-status
  bug, CF 1102, and the cert-worker suspicion.
- **2026-07-17 (Max):** Dashboard UI/polish + perf pass — nav pill, shell backgrounds, Support page,
  cert consolidation, training focus-mode fixes.
- **Full history:** `.planning/sessions/` (2026-06-15 → present), oldest-first.
- **Branch:** `main` only (`branching_strategy = none`).

### Files of record
| File | What it holds |
|---|---|
| `session_handoff.md` | **Primary cross-person sync point.** Read first, every session. |
| `.planning/sessions/` | Full per-session history. |
| `.planning/RENAME-IURIX.md` | The active work item — Iurix rename scope. |
| `.planning/STATE.md` | This file — current position + locked decisions. |
| `.planning/REQUIREMENTS.md` | 63 v1 REQ-IDs. |
| `.planning/ROADMAP.md` | 6-phase build order (Progress table is stale). |
