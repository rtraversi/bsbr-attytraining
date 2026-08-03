# STATE — Iurix Accreditation (formerly "Athena")

**Last updated:** 2026-08-03 (Max, desktop). Catch-up pass: this file was written at `5370fc3`,
07:13 on 07-31, **before** the three implementation batches that shipped later that same day, so it
had gone stale within hours of its own accuracy pass. Corrected here: migration high-water mark
`0016` → `0017`, the billing page and reminder work recorded, and the 07-31 Session Continuity entry
fixed (it claimed "no app code changed" for a day with 24 commits). Every claim below re-verified by
grep, file read, `wrangler deployments list`, `supabase migration list --linked`, and live HTTP.
(Prior refresh 2026-07-26, itself a correction of a version that claimed "Phase 0, 0% complete"
while Phases 0–5 were built and deployed.)

> **Naming:** the product is **Iurix Accreditation** ("Iurix"). **The rename is executed.**
> `grep -ri "built smart by rob"` returns **zero hits in source** — it survives only in
> `.planning/` history docs and `CLAUDE.md`. `grep -ri athena` in source returns **no user-visible
> string**: six CSS class/keyframe names in `app/globals.css` (`athena-dotgrid`, `athena-columns`,
> `athena-pill`, `athena-pill-solid`, `athena-custom-cursor`, `@keyframes athena-caret`) plus their
> call sites, and five explanatory comments (`app/globals.css:147,165`, `app/layout.tsx:38`,
> `emails/_components/email-shell.tsx:21,205`). The class names are cosmetic-only and deliberately
> left. See `.planning/RENAME-IURIX.md` / `.planning/IURIX-RENAME-PLAN.md` for the executed scope.
> Katy has also referred to this project as "Aegix"; that name is dead.

---

## Project Reference

- **Product:** Iurix Accreditation — AI staff compliance training + certification under ABA Model Rule 5.3
- **Company:** Iurix — one of three companies under **BSBR Holdings, LLC** (alongside IurisIQ and
  Built Smart by Rob). Iurix is a **DBA** of BSBR Holdings, LLC.
- **Mode:** mvp | **Granularity:** standard
- **Core value:** An attorney can pay, invite their staff, see them complete the training, and
  produce certificates demonstrating Rule 5.3 supervision compliance — without operator intervention.
- **Live:** `https://iurixaccreditation.com` — set as `NEXT_PUBLIC_APP_URL` in `wrangler.jsonc:9`,
  as `APP_URL` in `workers/cert-worker/wrangler.toml:14`, and in the email footers
  (`emails/_components/email-shell.tsx`). `aistaffcompliance.com` is retired; no `workers.dev` URL
  appears anywhere in source. The app still *deploys* to the Worker named `bsbr-attytraining`.
- **Cert Worker:** `bsbr-cert-worker` — a Worker **name / deploy target**, not a URL the app calls.
  It has no public route in source; it runs on its two crons and is invoked by the Supabase DB
  webhook. Deploy it from `workers/cert-worker/`; deploy the **app** only from the repo root.
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
| 0 | Foundations | ✅ Deployed | Legal pages live (`/terms`, `/privacy`, `/dpa`); `tests/rls-isolation.test.ts` exists; migrations `0001`–`0017` applied (verified 2026-08-03, `supabase migration list --linked`: local, remote and time columns all reach `0017`). ✅ Resend sending-domain verification **closed** — Rob verified DKIM, SPF and DMARC on `iurixaccreditation.com` (2026-07-29); mail sends as `IURIX <noreply@iurixaccreditation.com>` from both `lib/resend.ts:6` and `workers/cert-worker/src/index.ts:152`. **Open:** Supabase still on free tier — **Pro required before launch**. |
| 1 | Hello-cert end-to-end stub | ✅ Deployed | Checkout, 373-line webhook w/ `processed_stripe_events` idempotency + 5 handlers, cert PDF via `pdf-lib`, `cert_generation_queue` + 5-min drain, `/api/certificates/[id]/url` signed URLs. Superseded by Phase 2 (the "Mark Pass" stub is gone). |
| 2 | Rise 360 content + custom React quiz | ⚠️ Deployed, content-incomplete | Rise/SCORM export embedded and working; server-side scoring, identity attestation, unlimited retakes all built. **Open:** the question pool is a placeholder — 8 questions with **pool size == attempt size, so there is no randomization**. Roadmap criterion 3 (pool ≥ 3× per-attempt) is unmet. Content-blocked, not code-blocked. |
| 3 | Firm admin dashboard | ✅ Deployed | Verified present: `/api/firm/attestation`, `/api/firm/audit-log`, `/api/invite/bulk`, `csv-upload-form.tsx`, reminders, seat reassignment, member delete/redact. |
| 4 | Automation hardening | ⚠️ Deployed, ops-incomplete | Cert Worker crons live (`*/5` queue drain + `0 9` daily reminders); `X-Webhook-Secret` enforced; `/api/health` + secret-gated `/api/metrics` exist. ✅ Cert PDF logo **is no longer a placeholder** — the certificate was rebuilt (`6c44493`) around the real Iurix mark, base64-encoded at `lib/cert-logo.ts` from `public/brand/iurix-logo-2048-white.png`. (`lib/cert-pdf.ts:18` is now just the comment on the pure-white paper color.) **Open:** external uptime monitor never picked (UptimeRobot vs BetterStack); Supabase PITR needs Pro tier. |
| 5 | Renewal flow + launch polish | ⚠️ Deployed, launch-incomplete | Renewal re-enrollment, grace-vs-lapsed logic (30-day grace), reminder cadence, and expiry handling are all built in `invoice.payment_succeeded`. **Added 07-31:** customer billing page at `/dashboard/billing` with `GET /api/billing/summary` (subscription state + last 12 invoices) and `POST /api/billing/auto-renew` (both directions, confirm step on cancel). Auto-renewal is disclosed **before payment** on the pricing page (`app/pricing/_components/pricing-slider.tsx`) and the renewal email states the card will be charged. Cancellation uses `cancel_at_period_end`; the only `subscriptions.cancel` string in the tree is the comment warning against it (`app/api/billing/auto-renew/route.ts:29`). **Open:** attorney review of cert + landing copy + TOS never completed; iPad Safari / Chromebook QA not run; the cancellation email has never been visually rendered. |

---

## 🔴 What actually stands between here and launch

### Blocked on Rob
1. **Logo artwork — narrowed 2026-07-31.** Most of this closed: the **certificate** prints the real
   Iurix mark (`lib/cert-logo.ts`), the **favicon** is the Iurix icon (`app/icon.png`, `d4acfc4`),
   and **emails** ship a text-only IURIX wordmark rather than the retired mark
   (`emails/_components/email-shell.tsx:21`). What is genuinely still outstanding:
   - **The retired monogram still ships in the web UI.** `app/_components/atc-logo.tsx` inlines path
     geometry byte-identical to `public/atc-athena-logo.svg` — deliberately, per its own comment
     (Max, 2026-07-29), to avoid churn before the mark is final. `AtcLogo` renders in
     `site-header.tsx`, `login`, `onboarding`, `forgot-password`, `update-password`.
   - **No "Iurix Accreditation" wordmark asset exists.** Three places use a text stand-in set in
     Stack Sans Headline: `atc-logo.tsx`, `email-shell.tsx`, and the cert header. All three want a
     second pass when Rob's asset lands.
   - **`public/brand/README.md` "Still to handle"** — the 2048px PNG is white-matted (no alpha), and
     there is no simplified small-size variant.
   - *Cleanup, not blocked on Rob:* `public/atc-athena-logo.svg` and `public/athena-logo-email.png`
     are now referenced by nothing and can be deleted.
2. **Question pool size** — the ~24–32 target has been unresolved since 2026-06-12.
3. **Attorney review** of cert template + landing copy + TOS ($500–$1,500). Hard gate on launch.
4. **CPA consult** on SaaS sales tax + home-state registration (~$300–$500).

*Closed 2026-07-31:* ~~Pick + register the Iurix domain~~ — `iurixaccreditation.com` is live and
wired through the app, the cert Worker, and the email footers. ~~Decide whether the course keeps
the name "AI Staff Compliance Training"~~ — retired; the phrase returns **zero** hits in source and
the `courses.title` row was updated. ⚠️ **Partially reopened 2026-08-03:** the *Stripe product* is
still named "AI Staff Compliance Training — Annual Certification". Not a source string, so no grep
could have caught it, but customers see it at Checkout and on invoices. See Stripe live mode above.

### Blocked on Katy
- Legal-accuracy pass on both question sets (`supabase/migrations/0003_quiz_questions.sql` — the
  certifying quiz; `lib/training/questions.ts` — 15 ungraded knowledge checks).

### Engineering (Max)
- **Stripe live mode** — head-office address → Stripe Tax → live product/price → swap the hardcoded
  `PRICE_ID` at `app/api/checkout/route.ts:17` → register the webhook **on the new domain**.
  ⚠️ `app/api/checkout/route.ts:68` already sets `automatic_tax: { enabled: true }`, so **live
  checkout hard-fails until Stripe Tax is enabled.**
  🔴 **Found 2026-08-03 by reading the sandbox objects over the API** (all three must be right on the
  *live* objects, not just the sandbox):
  1. The price has **`tax_behavior=unspecified`**. Automatic tax expects an explicit
     `inclusive`/`exclusive`. Docs had claimed `exclusive`; the object does not have it.
  2. The product carries **no `tax_code`** and **no metadata**, so automatic tax falls back to the
     account default category. Docs had claimed `txcd_20060058`.
  3. The price has **no `lookup_key`**. Docs had claimed `per_seat_annual`. Setting one on the live
     price would retire the hardcoded-ID swap from this checklist permanently.
  ⚠️ Separately, the **Stripe product name still reads "AI Staff Compliance Training"**, the retired
  course name. It is not in source, so the rename sweep's `grep` could never have caught it, but it
  renders on the hosted Checkout page and on every invoice and receipt. Dashboard fix, not code.
- **Auth performance** — ~5s per dashboard route. **Zero `getClaims()` usage repo-wide** despite
  CLAUDE.md mandating it; three serialized `getUser()` round-trips per navigation
  (`middleware.ts:36` → `app/dashboard/layout.tsx:11` → page) plus a `getUserById` fan-out at
  `app/dashboard/page.tsx:56`. ~7 files. **Awaiting Max's go-ahead since 2026-07-17.**
- **Supabase Pro upgrade** ($25/mo) — free tier pauses after 7 days idle and has no PITR.
- **Pick an external uptime monitor.**

---

## Locked Decisions

### 2026-08-03 (Max) — brand palette

- **Primary / turquoise: PANTONE 14-4912 TCX "Rinsing Rivulet" = `#5CC6C3`.** The mark is set in this.
- **Neutral light: PANTONE 13-4108 TCX "Nimbus Cloud" = `#D5D5D8`.**
- **Neutral dark: `#9C9EA0`.** Adjusted from PANTONE 16-4402 TCX "Drizzle" (`#A09E9C`) at Max's direction, 2026-08-03: *"change the drizzle, nudge it to a hair cooler."* The change is an exact mirror — green held at 158, red and blue swapped — so weight is unchanged (luminance moves ~0.5/255) but the temperature flips from warm to cool and now agrees with Nimbus Cloud's bias. Halfway option if it reads too cool: `#9E9EA0`.

**⏸ DEFERRED, NOT DECIDED — the dashboard/app palette.** Logged 2026-08-03 13:15 CST (Max), verbatim:

> *"for now we can leave the dashboard/app color palette on hold, but perhaps we will just change the blue to that turqouise, but hold off on that just log it."*

Context for whoever picks this up: the app currently runs on `#0094FF` / `#32C7FF` across **35 files**, as raw inline hex, not tokens. The marketing and legal pages are a **third** system (`teal-300/400` on `zinc-950`). Swapping the blue for `#5CC6C3` is cheap only if the palette is tokenised first; today it is a 35-file hand edit. Do not start it without Max saying so.

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

- ✅ **CLAUDE.md Stripe IDs — FIXED 2026-08-03.** It named `price_1ThbLNCzT2268ei9nkadS8kD` /
  `prod_UgzKT3NrGNAvDA`, both from a retired Stripe account. Corrected to the API-verified
  `price_1TjNHc6ZCSojEKRrKs79ToJ0` / `prod_UiovBHrxJSDVpf` on sandbox `acct_1ThDpr6ZCSojEKRr`,
  which has exactly one active product and one active price. Verifying it surfaced three further
  deltas now recorded in CLAUDE.md §4 and flagged under Stripe live mode below.
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
- ✅ **The Iurix rename is executed** (2026-07-28 → 07-30). Wordmark, publisher line, course name,
  domain, email sender, favicon, and the certificate all carry Iurix. Only the monogram artwork and
  the missing wordmark asset remain — see "Blocked on Rob" #1.
- ✅ Domain — `iurixaccreditation.com` registered, live, and wired through app + Worker + emails.
- ✅ Resend sending-domain verification — DKIM/SPF/DMARC confirmed by Rob 2026-07-29.
- ✅ Cert PDF logo placeholder — closed by the cert rebuild (`6c44493`).
- ✅ Cert Worker is **not** dead code — ~500 lines running the queue drain + daily crons. Do not
  propose removing it.

---

## Session Continuity

- **2026-08-03 (Max, desktop):** Catch-up + correction pass, no app code changed. Fixed the 07-31
  record across four files: the commit count (22/23 → **24**), the contradictory "17 pushed, 5 not"
  opening in `session_handoff.md`, this file's stale migration and phase notes, and the wrong Stripe
  product/price IDs in `CLAUDE.md` (see below). Verified Friday's deploys independently.
- **2026-07-31 (Max):** **Four blocks, 24 commits, `5370fc3` → `277056f`.** *(This entry originally
  read "Doc-accuracy pass on this file, no app code changed" — true of the 07:13 commit only, and
  wrong about the day. Corrected 2026-08-03.)*
  - *Block 1, `5370fc3`:* doc-accuracy pass on this file. Re-verified eight claims by grep and file
    read: the rename is executed (not pending); the live URL is `iurixaccreditation.com` (not the
    `workers.dev` sandbox); the domain decision, the course-name decision, the Resend domain
    verification, and the cert-PDF logo placeholder are all closed; the logo blocker is narrowed to
    the monogram in `atc-logo.tsx` plus the still-missing wordmark asset; migrations `0013` → `0016`.
  - *Block 2, Batch 1 (`8e1e6cc` → `0601f68`):* `/cookies` route as an empty shell; sign-in footer
    fixed (Terms links, Cookies removed pending copy, support mailto off the retired domain); dead
    "View who's left" link removed; two orphaned Athena assets deleted; quiz width and "Your path"
    sizing fixed.
  - *Block 3, Batch 2 (`484e318` → `cc5d969`, plus the `0017` rebuild at `61965d7`):* migration
    `0017` adds `nudge_sent`; the manual Nudge button now writes an audit row with `triggered_by`,
    rate-limited to one per 48h; cron dedupes against it; renewal dedupe widened 24h → 8 days;
    lapsed firms get a shorter admin-only cadence; auto-renewal disclosed before payment.
  - *Block 4, Batch 3 (`368dff4` → `612dc56`):* the `/dashboard/billing` page (see Phase 5 above).
  - Deployed: app **2026-07-31T21:01:39Z** (version `0c4e7ff8`), cert-worker **19:48:34Z**. Both
    re-confirmed 2026-08-03 via `wrangler deployments list`. The final commit `277056f` postdates
    the app deploy by ~2.5 minutes but touches **only** two docs, so no code is unshipped.
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
| `.planning/RENAME-IURIX.md` | Iurix rename scope — **executed**; kept as the record of what was swept. |
| `.planning/STATE.md` | This file — current position + locked decisions. |
| `.planning/REQUIREMENTS.md` | 63 v1 REQ-IDs. |
| `.planning/ROADMAP.md` | 6-phase build order (Progress table is stale). |
