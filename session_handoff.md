# Session Handoff

**Date:** 2026-07-29 — **Max**, terminal. Domain/cert cleanup + the **seat double-count fix**
(billing correctness). 5 commits, all pushed. A **parallel session (Opus 4.8) landed 4 more** late in
the day. Detail: `.planning/sessions/20260729-max-summary.md`.

## 🟢 What landed

**Seat double-count fix — the big one.** Every employee consumed **two** seats, and an admin who
declined training silently consumed one. Seats are the Stripe billing unit, so this under-delivered
paid capacity. Migration **`0015`** adds `firm_members.occupies_seat` and rewrites `sync_used_seats()`
around one predicate — a row occupies a seat when `occupies_seat AND status IN ('invited','active')`.
`invited → active` is now occupying→occupying and stays silent; that silence removes the double count.
The three manual `used_seats` increments are gone (`invite`, `invite/bulk`, `onboarding/complete`);
`reassign`/`delete` were already correct and untouched. Admin is created `occupies_seat: false` and
flipped true only on `enrollSelf`. Applied to **IURIX STAGING**, types regenerated.
*(`21c6ae9`, `c78df3d`, `1e3814e`)*

**Domain/cert cleanup.** Cert footer → `accreditation@iurixaccreditation.com`; cert-worker `APP_URL`
→ `https://iurixaccreditation.com`. Both deployed and verified. *(`f3db0c3`, `a070030`)*

**`iurixaccreditation.com` is LIVE** — `/api/health` returns `{"status":"ok","db":"ok"}`. Rob's
Phase A landed.

**Parallel session (Opus 4.8), 19:07Z — not the terminal session:** `d593123` domain cutover Phase C
(`wrangler.jsonc` + email shell); `fda2b70` Resend from → `noreply@iurixaccreditation.com`;
`d4acfc4` favicon → `app/icon.png`; `2bf56d7` rename-plan doc. **Resend had been 403ing on every
send** — onboarding, invites, cert delivery and reminders were all silently down until `fda2b70`.

## 🔴 The seat E2E walkthrough was NEVER RUN

Designed, then the session wrapped. **Both predictions remain untested against the real routes:**
(1) `used_seats = 0` after onboarding with **enroll-self unticked**; (2) `used_seats` **unchanged**
when an invited employee sets their password. DB-layer evidence is strong (11/11 trigger assertions;
14 firms, 0 reconciliation mismatches) but no app route was exercised. **No test firms were created —
nothing to clean up.**

**Two traps when running it:**
- **Inviting alone cannot detect the bug.** The old double fired at *activation*, not invite. Invite
  5 without anyone setting a password and buggy and fixed code both read 5.
- **A 5-seat firm with an enrolled admin is admin + 4 employees**, so the 5th employee is *correctly*
  refused — which looks exactly like the bug. Onboard with enroll-self unticked to avoid this.

A ready-made read-only reporting query is at `<scratchpad>/seat-report.mjs` (firm fragment or uuid →
`used_seats`/`max_seats`, recomputed count, every member row with `role`/`status`/`occupies_seat`).

## ⚠️ Deploy state is uncertain

Last deploys — main app `da2270b8` @ 18:38:22Z, cert-worker `32f6fd00` @ 18:39:10Z — **predate the
final commits** (`2bf56d7` @ 19:08:24Z). Probably the usual deploy-then-commit pattern, but it cannot
be proven from timestamps. **A fresh `pnpm run deploy` from clean `main` settles it**; the cert-worker
needs its own (`fda2b70` changed its source, and it requires `--config wrangler.toml`).

## 🟡 Next

1. **Run the seat E2E walkthrough** (top item).
2. **Fresh deploy from clean HEAD**, both workers.
3. **Supabase DB webhook target — still unverified.** Needs the dashboard; no `psql` here. Lower
   stakes than it reads: the primary cert trigger is the in-app `after()` call at
   `app/api/quiz/attempt/route.ts:226` (proven by `IX-20260728-4289` issuing live), so a misaimed
   webhook is a redundant no-op, not a silent outage.
4. **`info@aistaffcompliance.com` still hardcoded in 5 places** — `privacy:65-66`, `terms:78-79`,
   `dpa:80-81`, `login:62`, and the operator fallback at `webhooks/stripe/route.ts:116`. Live on the
   deployed `/login` footer. Cutover item C4, blocked on Rob's new address.
5. **`accreditation@iurixaccreditation.com` mailbox does not exist** — it is printed on every cert.

## ⚠️ Three traps worth carrying

- **`NEXT_PUBLIC_APP_URL` is inlined from `.env.local` AND `.env.production` (both gitignored)**, not
  just `wrangler.jsonc` — editing the jsonc alone changes the runtime value but not the client bundle
  (three deploys produced an identical chunk hash). **Rob's machine needs the same local edit.**
- **The cert-worker duplicates the Resend from-address constant** — the two must stay in sync.
- **`wrangler deploy` from `workers/cert-worker/` needs `--config wrangler.toml`** or it picks up the
  root `wrangler.jsonc` and redeploys the main app.

---

**Date:** 2026-07-28 (later) — **Max**, terminal. Rename cleanup + the **certificate PDF rebuild**.
7 commits, all pushed. Detail: `.planning/sessions/20260728-max-summary.md`.

## 🟢 What landed

**Rename cleanup (Plan A):** cert numbers are now **`IX-YYYYMMDD-####`** (new migration `0014`,
replacing the `CERT-` sequence) — **verified live**, real cert issued as `IX-20260728-4289`. Cert PDF
signature line → "Reviewed and signed by" (name blank). DPA processor → **BSBR Holdings, LLC d/b/a
Iurix**.

**Certificate PDF rebuild (Plan B):** landscape 792×612, **the real Iurix mark** + an `IURIX`
wordmark top-left, `Name @ Firm` banner, `IURIX ACCREDITATION` headline, a
`SCORE / COMPLETED ON / EXPIRES` row, signature block, and a bordered **QR placeholder**. Stack Sans
Headline replaces Times/Helvetica throughout. **Monochrome** per Max — teal/rose-gold waits for a
locked palette.

Two real bugs fixed on the way: certificates printed the employee's **email** instead of their name
(the route computed the name and never passed it), and the cert **delivery email** did the same thing.

## 🔴 NOTHING IS DEPLOYED

Every change from **both** plans is live-unverified — including the DPA and signature-line edits.
One `pnpm run deploy` covers all of it.

**Two traps when verifying the cert PDF live — each one reads like a bug:**
1. Cert generation fires from the **Supabase DB webhook → the deployed app**. `pnpm dev` never sees
   it. There is no local path to test the real flow.
2. The PDF is **rendered once and stored**, never re-rendered on read. `IX-20260728-4289` will show
   the old design forever. With the `already_exists` short-circuit and the `unique (enrollment_id)`
   constraint, redoing the training on that enrollment regenerates nothing — **provision a new
   employee** to see the new layout.

For layout work specifically, skip the deploy loop: a throwaway harness calls `generateCertPdf`
directly with sample data and writes a PDF locally. Details in the session summary.

## ⚠️ Resolve before a real certificate goes out

**`accreditation@iurix.com` is printed on the certificate footer, and the registered zone is
`iurixaccreditation.com`** — the project may not own `iurix.com`. Max asked for it knowingly as a
placeholder; flagging it so it isn't forgotten.

## 🟡 Next

Deploy + walk it (new employee → fresh cert). Then: real disclaimer copy from **Katy**; an attorney
name for the signature line; the decorative half of the cert design (seal, wave field, real QR,
metallic finish) — **blocked on Rob's art + a locked palette**, and the QR additionally needs a
verification endpoint that doesn't exist yet.

Smaller: `LEGAL-DOCS-ATTORNEY-CHECKLIST.txt` now contradicts the DPA on entity naming (`:19`) and
seeds `@builtsmartbyrob.com` contacts (`:16-17`); the 3.4MB brand SVG still needs SVGO; there is
still **no wordmark asset** (the cert sets `IURIX` in Stack Sans as a stand-in);
`certificate_number_seq` is now dead and could be dropped.

## ⚠️ Two process notes

- **Desktop overwrote the plan file at the same path mid-session** — same filename, completely
  different plan. Caught only by checking its mtime. If a plan path was already used this session,
  re-read it rather than assuming.
- **`supabase db reset` is not this repo's workflow.** A plan recommended it; Max caught it.
  `--linked` would drop the hosted DB **including every login**. Use **`supabase db push`**.

---

**Date:** 2026-07-28 — **Rob**, terminal. Planning + infra audit. **No app code written.**
Detail: `.planning/sessions/20260728-rob-summary.md`. *(All app-code commits on `main` today are
Max's rebrand sweep, landed in parallel.)*

## 🟢 Decisions locked — these SUPERSEDE the 07-27 entry below

1. **Design fresh for Iurix.** The Netlify site is a **content/structure reference ONLY** — its
   visual identity is *not* inherited. Build around the **Iurix logo's palette (teal + rose-gold
   metallics)**, not the Netlify editorial look (Fraunces/Newsreader serif, brick red `#912d1f`).
   **This also retires the app's Athena landing design — neither existing identity survives.**
   ⚠️ *Supersedes the 07-27 line saying the Netlify design was canonical.*
2. **Rob owns the marketing redesign**, in a new session, working in `C:\sites\attytraining`.
   ⚠️ *Supersedes the 07-27 "MAX — start here: build the new marketing site" item below.*
3. **The Netlify waitlist is empty** — nothing to export; the cutover has no irreversible step.

## 🟡 MAX — your list

1. **Continue the rename sweep** — `.planning/RENAME-IURIX.md` Layers 1–3. (You're well into this.)
2. **The domain cutover** — 📘 **`.planning/DOMAIN-CUTOVER.md`**, the new step-by-step runbook.
   Split by owner: Rob takes registrar + dashboards, you take repo + CLI. Blocked on Rob finishing
   Phase A (zone setup).
3. **NOT the marketing site** — Rob has it now (decision 2).

**Two traps in the runbook, each worth a day if hit:**
- `NEXT_PUBLIC_APP_URL` is **inlined at build time** — changing the var without rebuilding does
  nothing to built bundles and reads exactly like a caching bug.
- A Worker **secret silently overrides** a `vars` entry. Run
  `wrangler secret list --name bsbr-attytraining` before editing `wrangler.jsonc:9`.

**Also:** the cert worker needs its own redeploy (separate `APP_URL`, separate step, last shipped
06-24), and the Supabase DB webhook must point at the **app** `/api/certs/generate` — if it ever
targets the cert worker, certs silently never generate and every delivery still returns 200.

## 🔴 Coordinate before the redesign starts

**Rob and Max are on the same branch.** `branching_strategy = none`, and Max landed 10+ commits to
`main` today touching `app/layout.tsx`, `app/_components/footer.tsx`, page titles, and
`emails/_components/email-shell.tsx`. The redesign hits those same files plus `globals.css`.

**Recommended: run the redesign on a branch** (`redesign-iurix`). `preview_urls: true` is already
set, so if Workers Builds is connected the branch gets its own preview URL — worth confirming.
Alternative: split by file, Max staying out of `app/_components/*` and `globals.css`.

## 🔵 Still blocked on Rob

Zone setup (Phase A); an **"Iurix Accreditation" wordmark** (none exists — Max used *text*
wordmarks as an interim in the email shell and cert header, so those want a second pass once a real
asset lands); a simplified small-size logo variant; new contact email + phone.

## Notes

- **Marketing source:** `rtraversi/aistaffcompliance` (private; clone at `C:\sites\aistaffcompliance`)
  — `index.html` is 434 lines of plain HTML, one inline `<style>` block, no framework. Only copy +
  structure are needed from it now. ⚠️ Max may lack access — invite outstanding since June.
- **Rob's machine is dev-ready:** Node 24.15, pnpm 11.9, wrangler 4.99, `node_modules` + `.env.local`
  present. **`.dev.vars` MISSING** → `pnpm run preview` (workerd) won't run until Max supplies it;
  not needed for design work. `pnpm dev` = local Node; `preview` = workerd; `deploy` = live Worker.

---

**Date:** 2026-07-27 — **Rob**, terminal. Scoping + Cloudflare audit. **No app code changed.**
⚠️ **Two items below are superseded by the 07-28 entry above** — the "Netlify design is canonical"
decision, and the assignment of the marketing site to Max.

## 🟢 Decisions locked

- **Domain: `iurixaccreditation.com`.** Rob is setting the zone up on Cloudflare now.
  `aistaffcompliance.com` is retired. This unblocks Layer 4 of the rename.
- **The website moves off Netlify onto Cloudflare** — served by the existing `bsbr-attytraining`
  Worker under the new domain. No new worker; no separate static site.
- **The Netlify site's design is canonical.** The Athena-branded homepage in the app is retired.
  **Build the new site fresh in the Next.js app**, using the Netlify version as the reference.

## 🟡 MAX — start here

**Task: build the new marketing site** (`.planning/RENAME-IURIX.md` → **Layer 8**).

Nothing infrastructural is needed to leave Netlify — the Worker already serves marketing + app in
one deploy. This is a page build, not a migration.

⚠️ **The one trap:** the Netlify site is a **pre-launch "coming soon" page with a waitlist and no
checkout.** The app has a real one wired to `/api/checkout`. Take the Netlify structure/design/copy
but **replace sections 5 ("coming soon") and 6 ("Be first in line" email capture) with the real
checkout CTA** — following it literally would ship a coming-soon page over a finished product.

Netlify site = single page, six sections, no internal routes: hero "Your staff is using AI." /
"What we do" (3 value props) / "Why Rule 5.3 just changed" (*Mata v. Avianca*, *In re Crabill*,
*Wadsworth v. Walmart*) / "Simple annual pricing" / coming-soon / waitlist.

Layers 1 + 2 (the Athena→Iurix string sweep, 16 files; Built-Smart-by-Rob removal, 9 files) are
also unblocked and can land alongside this. Leave domain strings alone until the zone is live.

### 2026-07-28 — 📘 NEW: `.planning/DOMAIN-CUTOVER.md`

**Full step-by-step runbook for putting `iurixaccreditation.com` on the `bsbr-attytraining`
Worker.** Supersedes `DEPLOY-CHECKLIST.md` (06-17, stale). Split by owner — Rob does registrar +
dashboards, Max does repo + CLI. Includes exact `file:line` edits, verification commands, and a
rollback path.

**Two traps documented up front, both of which cost a day if hit:**
1. `NEXT_PUBLIC_APP_URL` is inlined at **build** time — changing the var without a rebuild does
   nothing to already-built client bundles, and reads as a caching bug.
2. A Worker **secret silently overrides** a `vars` entry. `DEPLOY-CHECKLIST` step 4 told Rob to
   `wrangler secret put NEXT_PUBLIC_APP_URL`; if that secret exists it wins and the
   `wrangler.jsonc` edit is ignored. Run `wrangler secret list --name bsbr-attytraining` first.

**Also:** the cert worker needs a redeploy too (own `APP_URL`, own deploy step, last shipped 06-24),
and the Supabase DB webhook must be repointed to the **app** at `/api/certs/generate` — if it ever
points at the cert worker, certs silently never generate and every delivery still returns 200.

### 2026-07-28 — marketing site: source located + design direction set

- **Source found: `rtraversi/aistaffcompliance`** (private; local clone `C:\sites\aistaffcompliance`).
  Three files — `index.html`, `thanks.html`, `README.md`. `index.html` is **434 lines of plain HTML
  with one inline `<style>` block** — no framework, no Tailwind, semantic class names. Easy to read
  copy and structure off. ⚠️ **Max may not have repo access** — private, invite outstanding since June.
- ✅ **Design fresh for Iurix (Rob).** The Netlify site is a **content/structure reference only** —
  do NOT inherit its visual identity (Fraunces/Newsreader serif, brick red `#912d1f`, "5.3" seal).
  Build a new look around the **Iurix logo's palette — teal + rose-gold metallics**. This also
  retires the app's existing Athena landing design. **Neither existing identity survives.**
- **Build it in this repo** (`C:\sites\attytraining`) as Next.js pages on the `bsbr-attytraining`
  Worker — not a separate site, not a second Worker.
- ⚠️ **The waitlist can't migrate** — it's Netlify Forms (`data-netlify="true"` → `/thanks.html`),
  platform-specific with no CF equivalent. Being replaced by real checkout anyway, but **export any
  captured signups from the Netlify dashboard before tearing the old site down.**

### Two more decisions landed 2026-07-27 (later in the same session)

- ✅ **"AI Staff Compliance Training" is retired — use "Iurix Accreditation" everywhere.** Rob chose
  the single-brand story over keeping the descriptive course name. This is a **wider sweep than
  Layers 1 + 2** (22 files: cert PDF, all five email templates, legal pages, dashboard, training)
  and includes two things a string sweep will miss: the DB `courses.title` row and the **Stripe
  product name** (shows on invoices and receipts).
- ⚠️ **Logo delivered but not production-final.** Staged at **`public/brand/`** — read
  `public/brand/README.md` before wiring anything. Short version: the two files Rob designated are
  *different artwork* (certified vs no-certified), so there's **no transparent version of the
  designated primary**; the only transparent file is a 525×475 remove.bg free preview; and all
  three high-res files have the marble background **baked in** (`A=255` at every edge pixel).
  Still needed: full-res transparent cutout, a simplified small-size variant (the mark is
  unreadable at nav ~32px and favicon sizes), and an "Iurix Accreditation" wordmark lockup.

**Still blocked on Rob:** the logo gaps above; new contact email + phone (Netlify publishes
`info@aistaffcompliance.com` / `+1 919-609-2808`).

## 🔵 Cloudflare audit (via MCP)

`bsbr-attytraining` (last deploy 07-20, covers all code commits) and `bsbr-cert-worker` — **both
active, both stay.** `aistaffcompliancetraining` is a literal `Hello world` worker created 06-11
and never touched — safe to delete. `kc-assets` is unrelated (Katy's signature assets).

⚠️ **Verify:** `bsbr-cert-worker`'s **cron** handler is real and load-bearing (expiry / inactivity /
renewal reminders + the queue drain). Its **`fetch` handler is a no-op stub** — it validates the
secret, parses the payload, then discards it and returns 200. Cert generation lives in the app at
`/api/certs/generate`. **Confirm the Supabase DB webhook targets the app, not the worker** — if it's
aimed at the worker, certificates silently never generate and the webhook still returns a clean 200.
Re-check after the domain cutover, since that URL changes.

---

**Date:** 2026-07-26 — **Rob**, terminal. **SCOPING ONLY — no code changed.**
Full detail: `.planning/sessions/20260726-rob-summary.md`. Deliverable: `.planning/RENAME-IURIX.md`.

## 🟢 What happened this session

**1. Corrected a wrong premise.** Rob came in believing the payment backend was the one unfinished
piece. It isn't — it's built and deployed. Verified in code: `app/api/checkout/route.ts` (seats as
`quantity`, `adjustable_quantity`, `automatic_tax`, double-purchase guard),
`app/api/webhooks/stripe/route.ts` (373 lines — raw-body signature verify, `processed_stripe_events`
idempotency, five handlers incl. grace-vs-lapsed renewal re-enrollment), `app/api/portal/route.ts`.
**The gap is Stripe LIVE MODE, not code.** Everything runs on sandbox `acct_1ThDpr6ZCSojEKRr`.

**2. The project has a name: "Iurix Accreditation" ("Iurix" for the company).** Replaces "Athena".

**3. Corporate structure locked — and it changes the rename's shape.** BSBR Holdings, LLC is the
*parent*; **Iurix, IurisIQ, and Built Smart by Rob are three separate companies under it.** So
"Built Smart by Rob" is a **sibling brand, not this product's publisher** — it must be removed
entirely (9 files, 15 refs: cert PDF, cert Worker cron emails, all three legal pages, site footer).

**4. Legal entity = BSBR Holdings, LLC; Iurix is a DBA.** → **This half-kills the Stripe live-mode
blocker** carried since 06-12 as "LLC/EIN + Stripe Tax." Stripe activates on BSBR Holdings' existing
EIN — no new entity, no new EIN. Remaining: head-office address → Stripe Tax → state reg / CPA.

**5. Domain moves to an Iurix domain** — specific domain **not yet chosen**.

## Status

Nothing deployed, nothing broken, working tree otherwise clean. `.planning/RENAME-IURIX.md` has the
full 7-layer inventory with file:line detail — **Max should work from that file, not this summary.**

## 🔴 Blocked on Rob (blocks Max)

1. **Pick + register the actual Iurix domain.** Blocks all URL/secret/Resend/Stripe-webhook work.
2. **Logo artwork** — 3 files carry the "atc" monogram + "athena." wordmark, incl. the base64 blob
   printed on the certificate (`lib/cert-pdf.ts:18`). Max can't generate these.
3. **Decide whether the course keeps the name "AI Staff Compliance Training."** Recommend keeping
   (Iurix = company, that = the course); renaming costs ~22 files + a DB `UPDATE` + a Stripe
   product-name change.

## 🟡 Max can start immediately (no dependencies)

Layers 1 + 2 of the rename — the Athena→Iurix string sweep (16 files) and the Built-Smart-by-Rob
removal (9 files) — **leaving every domain string untouched.** Safe, no infra, independently
deployable. The `athena-*` CSS class rename is cosmetic; do it as its own commit or skip it.

## ⚠️ Sequencing traps

- **Domain cutover BEFORE registering the Stripe live webhook**, or it gets registered twice.
- `app/api/checkout/route.ts:68` already has `automatic_tax: { enabled: true }` — **live checkout
  hard-fails until Stripe Tax is on.**
- Verify the **new** domain in Resend, not `aistaffcompliance.com`.

## Doc corrections found while scoping

- **CLAUDE.md Stripe IDs are stale.** Code actually uses `price_1TjNHc6ZCSojEKRrKs79ToJ0`
  (hardcoded, `app/api/checkout/route.ts:17`), not the `price_1Thb...`/`prod_Ugz...` pair in the doc.
- **`.planning/STATE.md` still says "Phase 0, 0% complete."** Phases 1–5 are done and deployed.
  Flagged on 07-24, still not fixed, has now misled the start of two sessions. Refresh or delete it.
- **`cloudflare_stream_video_id` is NOT a real gap** (contra the 07-24 notes). Only ever written
  (`app/api/onboarding/complete/route.ts:82`), never read by app code — vestigial `NOT NULL` from
  the pre-Rise CF Stream era. Drop the column someday; not a blocker.

## Long-carried (unchanged)

Auth perf ~5s/route — zero `getClaims()` repo-wide, 3 serialized `getUser()` round-trips
(`middleware.ts:36` → `app/dashboard/layout.tsx:11` → page) + `getUserById` fan-out
(`app/dashboard/page.tsx:56`); ~7 files, **still awaiting Max's go-ahead since 07-17.** Real question
pool (Katy: legal accuracy; Rob: pool size, open since 06-12). Cert PDF logo placeholder. Storyline
"Paul" false-positive gate (Rob/Katy). Max's unset `git config --global user.email`.

---

**Date:** 2026-07-24 — Max, **desktop Claude** (not this repo's terminal). No code changed. Multi-project
session; only Section 1 applies here. Detail: `.planning/sessions/20260724-max-desktop-summary.md`.
Closed: the deploy (everything since `61b152d` is live), the team-status bug (no bug — stale build),
CF Error 1102 (dropped from tracking), cert-worker (**not** dead code — don't propose removing it).

---

**Date:** 2026-07-17 (Friday) — Max, terminal. Ran alongside a separate agent (that agent landed
the final Rise export, `4ee94fa`). Full detail: `.planning/sessions/20260717-max-summary.md`.

## 🟢 What happened this session

A long `/dashboard` UI/polish + perf pass. In order:

- **Nav pill rebuilt to the locked sketch; `AccountMenu` deleted.** Admin dashboard cluster merged
  into one pill (profile icon + firm name + "Dashboard" + grid icon), member view = plain identity
  slot, real branded icons, inline capsule dark-mode toggle with a click-squish. Sign out moved to
  the end of Settings; name/email already there. Then made the pill full-width and moved the toggle
  out of the scroll-clip. (`eba5a81`, `0275579`)
- **Full-bleed mask-pattern background on both shells**, colors cross-swapped (training uses the
  admin bg, admin uses the training bg), light + dark. Iterated a lot (opacity, a taller SVG so
  scrolled pages don't clip, `mask-size: 100% auto`, `fixed h-screen` to kill both an accordion-lag
  bug and a Settings dead-scroll bug). (`5af900d`, folded into `14997d5`)
- **Real Support page + working contact form.** Live search / FAQ accordion / modal, brand-styled,
  inline icons. New `POST /api/support/contact` → Resend to a temporary hardcoded inbox
  (`solarsaiko@gmail.com`); submitter identity from the session, confirmation shows the real email.
  Then trimmed per Max's eyeball (removed card icons, "Quick answers"/"Support center" eyebrows,
  restyled "File an issue"). (`5e217e8` + wrap-up bundle)
- **Settings:** dropped the dead Weekly-summary toggle (saved a pref nothing reads). **Overview:**
  fixed lesson 5 never showing "done" (now off the quiz system's real cleared state, not the
  never-firing `contentViewed` signal). (`661cc5b`)
- **Certificate details + download consolidated onto the Quizzes tab** (hover/tap-reveal on the
  "Access certificate" pill + `CertPreviewModal`); Overview + Training reduced to a one-line "issued
  — Go" pointer. (`e9e84e1`)
- **Perf: shell-pattern mask cost halved** — two masked layers per shell → one, cross-fading
  `background-color` instead of overlapping opacity layers. **svgo on the SVG: 702KB → 229KB
  (−67.4%).** (`14997d5`)
- **Avatar now shows in the nav pill** (admin + member) **and the admin dashboard "who's left"
  avatar stack**, threaded `avatarUrl` back through. **Reassign success screen** fills the full
  width (was capped, wasting space). **Billing hover text** bumped to subheading + brand blue.
  (wrap-up bundle)
- **Training focus mode — 3 fixes:** (1) bottom tab bar no longer shows over the focus player
  (z-index stacking-context trap — hidden via an `html.training-focus` class + CSS); (2) the exit
  button slides to the left edge when "Your Training" fades (title collapses width, not just
  opacity); (3) the dark scrim fades out with the title + progress on idle (its own opacity layer),
  leaving only the exit button. (wrap-up bundle)

## Status

All committed AND pushed — `main` == `origin/main`. Working tree clean. `tsc --noEmit` + `eslint`
clean throughout. **NOTHING deployed this session** — everything since `61b152d` (07-16) is
deploy-unverified. Verify via `pnpm run deploy` + a real walkthrough as admin AND employee.

## 🔴 Next steps / open

1. **Navigation is ~5s per route (every route, even revisited).** Diagnosed, NOT fixed: it's
   per-navigation server work, not bundle size — 3 serialized `getUser()` auth round-trips
   (middleware + layout + page) + free-tier Supabase + the `/dashboard` `getUserById` fan-out.
   Fix = `getUser()` → `getClaims()` (local verify, per CLAUDE.md), pass user down from layout,
   batch the fan-out, upgrade Supabase. Touches auth across ~7 files → **needs Max's go-ahead.**
   Max was discussing this with another agent at wrap-up.
2. **`pnpm run deploy` + full walkthrough.** Highest-risk to eyeball: nav pill (full-width, active
   state, avatar, mobile collapse), the shell background pattern (light/dark toggle smoothness),
   Support page + a real contact-form send, Quizzes cert hover/tap reveal + download modal, the
   three training focus-mode fixes (tab bar hidden, button slides left, scrim fades).
3. **Final Rise export now reports "completed-incomplete"** (other agent). If that changes whether
   `contentViewed`/`video_completed` can ever fire, revisit the places that route around it as
   "never true." Walk the SCORM gate as a provisioned employee.
4. Nav-shell SVG only shrinks on next deploy (stale `.open-next` copy); no long-cache `_headers` on
   `/nav-shell-pattern.svg` (revalidates on repeat visits) — add one if wanted.

## Long-carried (unchanged)

Admin 1102 blocker (07-10, untested); Storyline "Paul" false-positive gate (Rob/Katy); real question
pool; Stripe live mode (LLC/EIN + Stripe Tax); Resend domain verification; Max's unset
`git config --global user.email`.

---

**Date:** 2026-07-16 (Thursday) — Max, desktop + terminal in parallel. Layered on top of 2026-07-15
below, which is still current. *Amended by the terminal session at its own wrap-up* — the desktop
session's draft below didn't yet know the team-status fix had been deployed and confirmed broken,
and was missing the shell-height-floor work (entirely a terminal-session thread); see the ⚠️-marked
bullets and the Status/Next-steps sections for the corrected picture.

## 🟢 What happened this session

- **Storyline animation — Episode 2 ("The Perfect Brief," Attorney Jacqueline/Carlos) DALL-E prompts
  finalized.** All 9 shot prompts locked in chat (character/style bible + single-device consistency
  rule from 07-15, plus this session's additions: Shot 6 toned down from "stressed" to "confident,"
  and a new Shot 9 — "Wait, but look. Let me ask it again so you can see how I verified" — the
  transition line into the existing "verifying with Claude" animation). Also extracted
  `storyboard AI-1.pdf` into PNGs, zipped to Max's Downloads — unrelated to the repo.
- **Reassign-panel — merged the redundant notice cards.** The "Replacing X" callout and "Preserved
  record" card were repeating the same email 3x and reading as two disconnected boxes — mocked up
  in chat, Max picked the merged-single-card direction (icon + "Replacing" on the left, divider,
  preserved-data fields on the right). Prompted to terminal; diff is in the working tree now,
  uncommitted until this wrap-up.
- **eslint fixed at the root cause, not just papered over.** It wasn't actually a memory-limit
  problem — `eslint.config.mjs` had no ignore for `public/**`, so it was linting ~15MB of vendored
  Rise/SCORM export JS as project source (that's what produced the earlier "186,848 problems" and
  the OOM). Fixed: `public/**` + `.open-next/**` added to ignores, `lint` script bumped to
  `NODE_OPTIONS=--max-old-space-size=4096` as a safety margin (this machine only has 8GB RAM). Real
  lint surfaced two genuine warnings in `load-tests/training-flow.js`, fixed with eslint-disable
  comments on TODO-placeholder code.
- **"Cleared" vs "100%" — resolved, not a bug.** Some lessons showed "Cleared" instead of a score
  because of the lesson-5 "test-out" shortcut (skips 1–4 entirely — those checks were never
  actually taken, `lastScore` is genuinely `null`). Decision: show 100% to the employee regardless
  of path (they don't care which path they took), but the fix is display-only — `lastScore` itself,
  the average-score calc, and the admin dashboard's score column all stay based on real data. Fixed
  in both `overview-client.tsx:604` and the equivalent spot in `quizzes-client.tsx` (which had the
  same edge case, previously rendering nothing).
- **SCORM exit button fixed.** The in-course Exit button (`LMSFinish`) had no handler — dead end.
  Added a fire-once handler in `scorm-content.tsx` calling a new `onExit` prop; `training-client.tsx`
  wires it to drop the user out of focus/fullscreen mode.
- **Settings page rebuilt** — full redesign (sticky left nav, wide content area instead of the old
  cramped `max-w-3xl` center column) plus real new scope: Organization name field, two new admin
  notification toggles (team-member-certified email, weekly-summary — the digest cron itself is
  explicitly NOT built yet, just the persisted preference), profile photo upload, and the
  Appearance theme selector relocated out of the old account-menu dropdown. Went through a full
  sketch→react→lock cycle in chat before the build prompt. **Committed** (`71bc60d`).
- **Team-status fix — committed and pushed, but ⚠️ CONFIRMED BROKEN LIVE, needs re-investigation.**
  Root cause diagnosed (admin dashboard showed "Not started" for members mid-course because
  `enrollments` rows only get created at first quiz attempt; added a `training_events` presence
  check as a fallback in `app/dashboard/page.tsx`). **Max deployed this exact fix and confirmed it
  still doesn't work** ("does not show in progress") — needs fresh investigation, not a re-deploy.

## Status (07-16)

Everything committed AND pushed — `main`/`origin/main` were in sync at `61b152d` on top of
`71bc60d`. But `61b152d` includes the team-status fix Max confirmed broken live.

---

**Date:** 2026-07-15 (Wednesday) — Max, terminal. Built the three-column reassign-panel fix. Detail:
`.planning/sessions/20260715-max-summary.md`. (Superseded by the 07-16 single-card merge above.)

---

Older sessions: see `.planning/sessions/` (2026-06-15 → 2026-07-14), read oldest-first for full
history. Key reference: main app URL `https://bsbr-attytraining.aistaffcompliance.workers.dev`;
Supabase dev project `ndmzvtuywcufvkxtkjhg`; Stripe sandbox `acct_1ThDpr6ZCSojEKRr`.

## Workflow (in force)

Verify via `pnpm run deploy` (Max runs pnpm/supabase/stripe/CLI himself; Claude runs git
add/commit/push after explicit go-ahead). Secrets in Worker env only. Authz via `getClaims()`;
`firm_id`/`role` from `app_metadata`.
