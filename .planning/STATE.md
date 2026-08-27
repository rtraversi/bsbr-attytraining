# STATE: Iurix Accreditation

**Last verified: 2026-08-27 (Max, desktop).** Every claim below was re-checked today against the
live site, the repo working tree, or the Supabase API. Where something could not be checked from
this machine it says so **and names the command that would check it**. Nothing is carried forward
on trust.

> **Why this file was rewritten.** The previous version was stamped 2026-08-03 and was read at the
> start of every session for three weeks while eight of its claims went out of date (listed in
> §8). A status file that is read every morning and updated every three weeks is worse than no
> status file, because it is believed. If you change something this file asserts, change this file
> in the same commit.

---

## 0. Precedence: which document wins

| Rank | Document | Authoritative for |
|---|---|---|
| 1 | **this file** | where the project stands right now |
| 2 | `session_handoff.md` | what happened in the most recent session, and what is queued next |
| 3 | `.planning/sessions/<date>-*.md` | full detail for one day |
| 4 | `.planning/REQUIREMENTS.md` | **the only** authority for requirement IDs and their meaning |
| 5 | `CLAUDE.md` | stack, constraints, framing |
| 6 | `.planning/archive/**` | history. Never current. Never cite it for status. |

If two documents disagree, the higher rank wins and the lower one gets fixed. Session notes are
**not** an authority for requirement IDs (they have invented IDs before).

---

## 1. Production, as verified today

- **Live at `https://iurixaccreditation.com`.** `/`, `/terms`, `/privacy` all return 200.
  `/dpa` returns **404 by design**: `app/dpa/page.tsx` calls `notFound()` when
  `NODE_ENV === 'production'`, because every section of it is still an `[ATTORNEY TO COMPLETE]`
  placeholder. The DPA is the one legal document that has never been drafted.

- **Production runs against IURIX PROD (`ttqthtzdjacrhjtrcmmy`).** Verified by reading the
  `NEXT_PUBLIC_SUPABASE_URL` value out of the live `/login` JavaScript bundle: exactly one
  Supabase host appears, and it is `ttqthtzdjacrhjtrcmmy.supabase.co`. The PROD cutover (Phase A,
  2026-08-13) is real and in force. **Development and testing still happen on IURIX STAGING
  (`ndmzvtuywcufvkxtkjhg`), which is what the Supabase CLI is linked to.**

- **All code on `main` is deployed.** Production was last deployed from `2efec949`, the tip of
  `main`'s code, on **2026-08-24 at 19:34:58Z**, and the workflow's own production smoke test
  passed. The only two commits on `main` after that are `docs(session)` commits that touch no code.
  Independently corroborated on the live site: `/terms` reads "Last updated: 24 August 2026",
  `/privacy` lists Articulate Global as a sub-processor, and `og:title` is the governance reframe.

  🔴 **This corrects `session_handoff.md`, which said as late as 2026-08-26 that all of 2026-08-24
  was still undeployed and "two days old". It had been live since the day it was written.**
  Production was deployed **six** times on 08-24.

### How to check deploy status on this project (the only reliable way)

**Deploys do not run from anyone's laptop.** They run in GitHub Actions
(`.github/workflows/deploy.yml`) on Linux, because OpenNext cannot produce a working bundle on
native Windows. **A push to `main` builds a PREVIEW only and never touches production.** Production
requires a deliberate `workflow_dispatch` with `target=production`.

So "is it deployed?" is answered by the workflow run list, not by commits and not by timestamps:

```bash
gh run list --workflow=deploy.yml --limit 15 \
  --json event,conclusion,createdAt,headSha,displayTitle
```

A `push` run is a preview. Only an `event: workflow_dispatch` run whose **"Deploy to production"**
step succeeded actually shipped:

```bash
gh run view <databaseId> --json jobs
```

⚠️ **Two inference methods that look reasonable and are not:** timestamp correlation between a
commit and a deploy (wrong on 2026-07-28), and grepping the live JS chunks linked from a page's
HTML for a string (wrong here on 2026-08-27: the beacon's chunk is not among them, and its absence
was read as "not deployed" when it was). Fetching a page and reading rendered **content** is sound;
reasoning from which chunk files a page links is not.

- **Wrangler on Max's Mac is signed in to the wrong Cloudflare account.** It holds an OAuth token
  for `solarsaiko@gmail.com` (account `92ad73afddb005d06cfd61ec412c9563`), while the Worker lives
  under account `4b2a402334decc9259d7317aaf9782f0`, so `npx wrangler deployments list` fails with
  `Authentication error [code: 10000]`. **This does not block shipping**, because shipping goes
  through CI. It blocks local inspection and local `pnpm run deploy`, and it means
  `wrangler rollback --name bsbr-attytraining` (the documented rollback in the workflow summary)
  would also fail from this machine. Worth fixing before it is needed in a hurry.

---

## 2. Databases

| | **IURIX STAGING** `ndmzvtuywcufvkxtkjhg` | **IURIX PROD** `ttqthtzdjacrhjtrcmmy` |
|---|---|---|
| Role | development and testing | **what the live site actually uses** |
| Postgres | 17.6.1 | 17.6.1 |
| Status | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| Supabase CLI | **linked** | not linked |
| Migrations | **0029**, verified today (`supabase migration list --linked`: local, remote and time columns all reach 0029) | **0027**, recorded 2026-08-19. `0028` and `0029` have never been applied. |

🔴 **PROD is two migrations behind, and both of them are the intake.**

| Migration | On PROD? |
|---|---|
| `0026_question_pool_v1.sql` (the 50-question bank) | ✅ applied 2026-08-19 |
| `0027_terms_acceptance.sql` | ✅ applied 2026-08-19 |
| `0028_policy_intake.sql` (the entire intake schema) | ❌ **never applied** |
| `0029_email_deliverability.sql` | ❌ **never applied** |

**Source: `.planning/sessions/20260819-max-summary.md`**, which records the deliberate PROD push and
states "PROD and staging both at migration 0027". ⚠️ `PROD-CUTOVER.md` stops at `0025` and looks
authoritative; it is simply not the last word. **Not re-verified against PROD today**, because
checking means relinking the CLI away from staging, and staging is the sandbox everything else
assumes. To confirm before pushing:

```bash
npx supabase link --project-ref ttqthtzdjacrhjtrcmmy && npx supabase migration list --linked
# then relink to staging: npx supabase link --project-ref ndmzvtuywcufvkxtkjhg
```

🔴 **Leaving the CLI linked to PROD is how an accidental `db push` reaches production.** It had been
pointed at PROD since 08-13 and was only caught on 08-19. Relink to staging in the same session.

**Storage:** the `Intake-uploads` bucket exists on **staging only**. It does not exist on PROD.
The name is capital-I and case-sensitive, buckets cannot be renamed, and a migration cannot create
it. It is a manual action in the Supabase Storage dashboard, and the intake cannot ship without it.

---

## 3. Branches

`main` is at `8eff5ab` (2026-08-25). Seven branches exist; three carry unmerged work.

| Branch | vs `main` | State |
|---|---|---|
| **`policy-intake`** | **+6** | **The whole policy intake.** Built 2026-08-26 in five batches. `tsc`, `eslint`, `next build` clean, 192 tests across 14 files. **Never opened in a browser.** |
| **`ui-polish-batch-b`** | +4 / -1 | UI polish, plus the intake mockup and certificate art moved into the repo |
| **`ui-polish-batch-a`** | +1 / -1 | pills, bare icons, blue active tab, real theme switch |
| `ix-framing-correction` | 0 / -8 | merged, safe to delete |
| `legal/publish-terms-privacy-2026-08-24` | 0 / -6 | merged, safe to delete |
| `ix-questionpool-termsaccept` | 0 / -12 | merged, safe to delete |
| `merge-attempt` | +3 / -79 | scratch branch from the redesign merge. Dead. |

Remote also carries `hero-dark-redesign`, `redesign-iurix` and `stripe-lookup-key`; the last of
these is fully merged into `main`.

---

## 4. Phase status

All six phases are code-complete and deployed. What remains is **not feature development**: it is
content, the PROD migration gap, Stripe live mode, and launch ops.

| Phase | Code | What is genuinely not done |
|---|---|---|
| 0 Foundations | ✅ | 🔴 **Email is down (`ix-dnszoho`).** All four Resend DNS records are present and correct on the apex and the Zoho MX is intact, and a real API send **still** returns `403 domain is not verified`. It is no longer a DNS task: someone with **Resend dashboard access** has to finish verification, which is a click. Until then a firm can pay and their staff receive no invite email. Probe with `delivered@resend.dev`; the API key is send-only and 401s on `GET /domains`, so a send is the only test. ⚠️ **Supabase plan: reported upgraded to Pro on 2026-08-05, but there is no record of it anywhere in the repo and the CLI does not expose the plan.** Both projects report `ACTIVE_HEALTHY`. Confirm it in the dashboard: free tier pauses after 7 days idle and has no PITR. |
| 1 Hello-cert end-to-end | ✅ | superseded by Phase 2 |
| 2 Rise content + React quiz | ⚠️ content-incomplete | The **50-question bank is live on PROD** (10 per lesson, `0026`), but **Katy has never reviewed it**: Max approved shipping on 2026-08-19 with revision to follow. Rise course content itself is still not authored. |
| 3 Firm admin dashboard | ✅ | |
| 4 Automation hardening | ⚠️ ops-incomplete | external uptime monitor still not picked; PITR needs Pro |
| 5 Renewal + launch polish | ⚠️ launch-incomplete | attorney review of cert copy; iPad Safari / Chromebook QA never run; cancellation email never visually rendered |

---

## 5. What actually stands between here and launch

### Engineering, verified in the tree today

1. 🔴 **Get `0028` and `0029` onto PROD** and create the `Intake-uploads` bucket there (§2). This is
   the real blocker on shipping the intake: the code reaches production through CI, the database it
   lands on does not.
2. **Merge `policy-intake`, run the production deploy, then open `/intake` in a browser.** It has
   never been seen rendering. Note that merging alone only produces a preview build.
3. **Re-auth wrangler** to the right Cloudflare account (§1). Does not block shipping, but blocks
   local inspection and the documented `wrangler rollback`.
4. **Stripe live mode.** `app/api/checkout/route.ts:196` sets `automatic_tax: { enabled: true }`,
   so **live checkout hard-fails until Stripe Tax is enabled on the account**. On the live Price
   and Product, all three of these must be right: an explicit `tax_behavior`, a `tax_code`, and
   the `lookup_key`. The Stripe **product name still reads "AI Staff Compliance Training"**, the
   retired course name, which customers see at Checkout and on every invoice. Dashboard fix, not
   code.
   ✅ *Closed since the last STATE:* the hardcoded `PRICE_ID` is gone. The seat Price now resolves
   by lookup key (`lib/stripe-price.ts`), so going live no longer needs a source edit mid-cutover.
5. **Auth performance, ~5s per dashboard route.** Still open and still unstarted: **`getClaims()`
   appears 0 times** in `app/`, `lib/` and `middleware.ts`, against **37 `.getUser()` call sites**,
   while `CLAUDE.md` mandates `getClaims()`. Awaiting Max's go-ahead since 2026-07-17.
6. **Pick an external uptime monitor** (UptimeRobot vs BetterStack). Never decided.
7. **Confirm the Supabase plan in the dashboard** (§4). Believed Pro since 2026-08-05, recorded nowhere.

### Blocked on Katy

- Legal-accuracy review of the 50-question certification bank (`0026`, source
  `.planning/question-bank.xlsx`) and the 15 ungraded knowledge checks (`lib/training/questions.ts`).
- Read `lib/intake/questions.ts`. **Two things in it are guesses**: the module letters for
  `doc_review_scale` and `tar` (K/K/L), and the section grouping, which was invented because the
  spec gives module letters and not sections.
- Privacy §2 and §5 have **no category covering intake answers**. Flagged since the intake's first
  batch, still unwritten.
- Revision of the authored training content after the framing correction.

### Blocked on Rob

- **The retired monogram still ships in the web UI.** `app/_components/atc-logo.tsx` inlines the
  old path geometry deliberately, and `AtcLogo` renders in **5 files**. No "Iurix Accreditation"
  wordmark asset exists; three places use a text stand-in in Stack Sans Headline.
- `public/brand/README.md` "Still to handle": the 2048px PNG is white-matted (no alpha), and there
  is no simplified small-size variant.
- **Attorney review** of cert template, landing copy and TOS ($500–$1,500). Hard gate on launch.
- **CPA consult** on SaaS sales tax and home-state registration (~$300–$500).
- *Cleanup, not blocked on Rob:* `public/atc-athena-logo.svg` and `public/athena-logo-email.png`
  are referenced by nothing.

---

## 6. Decisions in force

### Framing correction, 2026-08-24 (Katy, via Max): the one that overrides the oldest docs
**ABA Model Rule 5.3 is not the north star.** The product is the firm's **own written AI use
policy**; the training keeps staff aligned to it; the quiz, attestations and certificates are the
evidence. Rule 5.3 is background context and at most fine-print citation. It stays deliberately in
`.planning/legal/terms-of-service.md` §3 and §11, where naming the rule in order to disclaim it is
protective. Full record: `.planning/FRAMING-CORRECTION-2026-08-24.md`. **Anything in `.planning/`
dated before 2026-08-24 that pitches Rule 5.3 is superseded by this.**

### Intake, 2026-08-26 (both reversals landed mid-build and both stand)
- **No hard gate.** Katy, 12:11: *"The problem is that the intake is time consuming. People will
  want to explore without having to fill it all in."* The dashboard opens for everyone; the intake
  is a **persistent, undismissible** notice on `app/dashboard/page.tsx`. It has to stay
  undismissible, because nothing else ever gets the intake completed.
- **The roster is capped at seats purchased**, reversing flag-never-block. Attorneys are unlimited
  and never consume a seat. Known and accepted: a capped firm cannot reach full accreditation
  until it buys the extra seat. The old copy promised to "sort the extra seats out with you
  afterwards" and nobody owned "afterwards".
- **The buyer's path no longer touches email.** They set a password on `/onboarding` and are signed
  straight into `/intake`. This is the only reason any of it is testable while Resend is down.
- 🔴 `intake_sensitive` has **RLS on and no policy at all**, deliberately. Service-role routes only.
  The migration carries a red-flagged comment. Do not add a policy.
- 🔴 **`auth.users.email_confirmed_at` is not a deliverability signal.** Every creation path passes
  `email_confirm: true`, so it is true for everybody. A test fails if anyone tries to use it.
- **A deterministic policy assembler is in scope (Max, 2026-08-27).** Answers select prepared
  module text and fill fixed slots. No model, no inference, no generated prose. **Katy reviews and
  signs off every policy.** This amends `intake-spec.md`, which read "there is no generator, no
  template engine". ⚠️ **Katy has not been told**, and the original framing was hers.
  🔴 **The rule that intake answers are never sent to a model is UNCHANGED** and is not negotiable
  without her express approval.
- 🔴 **Open defect on `policy-intake`: attorneys cannot reach the training.** `lib/seats.ts` makes
  `occupies_seat` both the billing predicate and the access predicate, deliberately, so the two
  cannot drift. Promote sets `occupies_seat: !isAttorney`, so an attorney promoted through the
  intake fails `hasTrainingAccess`. An attorney **admin** is offered self-enrolment, which sets
  `occupies_seat: true` and consumes a seat; a non-admin attorney gets a dead end. Katy's rule
  (2026-08-25 11:57) is that attorneys never consume a seat **and train for free**. The 192 tests
  do not catch it: `tests/intake-promote.test.ts` asserts the inverse relationship and nothing tests
  `hasTrainingAccess`. Fixing it means splitting the predicate into "may train" and "costs a seat",
  moving the `sync_used_seats` trigger from 0015 with it, and covering both invite routes plus
  `enroll-self`, none of which accept an attorney flag.
- 🔴 **Promote is not one transaction and cannot be** (GoTrue admin API calls cannot sit inside a
  `BEGIN`). Every step is idempotent and the status flip happens **last**, so a half-finished
  promote leaves the intake open and pressing Send again completes it.

### Brand palette, 2026-08-03 (Max)
- Primary turquoise **PANTONE 14-4912 TCX "Rinsing Rivulet" `#5CC6C3`**; neutral light
  **`#D5D5D8`**; neutral dark **`#9C9EA0`**.
- ⏸ **The app palette swap is still deferred, not decided.** Logged verbatim 2026-08-03 13:15 CST:
  *"for now we can leave the dashboard/app color palette on hold, but perhaps we will just change
  the blue to that turqouise, but hold off on that just log it."*
  ✅ **The blocker named in the last STATE is gone:** the app palette is now **tokenised**
  (`--brand-primary: #32C7FF`, `--brand-emphasis: #0094FF` in `app/globals.css`). `#0094FF` appears
  in **1 file**, not 35. Swapping to turquoise is now a token edit, not a 35-file hand edit. Still
  do not start it without Max saying so.

### Naming and corporate structure, 2026-07-26 (Rob)
Product **"Iurix Accreditation"**. **BSBR Holdings, LLC** is the parent; Iurix is a **DBA** of it,
so legal pages read "BSBR Holdings, LLC d/b/a Iurix" and Stripe activates on BSBR Holdings'
existing EIN (no new entity, no new EIN). "Built Smart by Rob" is a sibling brand and is removed
from the product entirely.
**Rename verified complete today:** `grep -ril "built smart by rob"` over `app lib emails workers
public supabase` returns **0 files**. `athena` survives in **4 files** as cosmetic CSS class names
and explanatory comments only (`app/globals.css`, `app/layout.tsx`, `app/_components/atc-logo.tsx`,
`emails/_components/email-shell.tsx`), deliberately left.

### ⚠️ Open contradiction: where Rise content is hosted
`CLAUDE.md` still records Rise hosting as **LOCKED 2026-06-18** to Articulate's own hosting or R2,
embedded by iframe, and `supabase/migrations/0010_rise_embed_url.sql` sets
`courses.rise_embed_url` to a `share.articulate.com` URL, which is what is live. **Rob has since
approved hosting the Rise content inside the platform instead.** That reversal is not written into
`CLAUDE.md` and has not been executed. It also has a legal tail: `app/privacy/page.tsx` carries a
comment explaining that the "served from our own infrastructure" paragraph was **deleted** from
Privacy §4 precisely because it was not true, and Articulate Global was listed as a sub-processor
instead. **When the Rise export moves behind a session-gated route, drop the sub-processor row and
restore that paragraph in the same commit as the routing change.**

### Stack (carried, unchanged)
Next.js 15.5 LTS (App Router, Node runtime via `nodejs_compat`) on Cloudflare Workers via
`@opennextjs/cloudflare`. No `runtime = 'edge'` anywhere. Supabase for Auth/Postgres/Storage, RLS
via `firm_id`/`role` in `app_metadata`. Stripe webhook in a Route Handler, raw body via
`req.text()`, `processed_stripe_events` for idempotency.

---

## 7. Traps that have caught previous sessions

- **`enrollments` has no `created_at`.** The column is **`enrolled_at`**. Ordering by `created_at`
  silently fails and creates ghost enrollments.
- **Never `wrangler deploy` from inside `workers/cert-worker/`.** It picks up the root
  `wrangler.jsonc` and redeploys the main app. Always
  `cd workers/cert-worker && wrangler deploy --config wrangler.toml`.
- **The cert-worker does not generate certificates.** Its `fetch` handler is a TODO stub returning
  200. Real generation is: quiz pass → `cert_generation_queue` INSERT → `after()` → 
  `/api/certs/generate` in the main app. The cert-worker only drains the retry cron and sends daily
  expiry reminders.
- **Stored certificate PDFs are never re-rendered.** A design change only appears on newly issued
  certificates.
- **OpenNext cannot build on native Windows.** `pnpm run deploy` there produces a Worker that 500s
  on every route.
- **`REQUIREMENTS.md` is the only source for requirement IDs.** Session notes have invented them.
- **Applying every migration to a fresh Supabase project does NOT produce a working database.**
  Four objects were hand-created in the dashboard and exist in no migration: the `certificates`
  bucket, the `courses` row, and **two Database Webhooks that are the entire certificate pipeline**.
  A migrations-only project looks healthy and then silently never issues a certificate. It was found
  by diffing **triggers**; tables, columns, policies, functions and indexes all matched.
- **The Supabase credential swap is FOUR places, not three:** `.env.local`, the App Worker secrets,
  **the `workers/cert-worker` secrets**, and the GitHub Actions secrets. Miss the cert-worker and its
  crons keep writing to staging with nothing erroring.
- **`0023_remove_avatars.sql` cannot run.** `storage.protect_delete()` blocks SQL deletes from
  storage tables, and it is DDL in a transaction, so it takes any batched migration down with it.
- **Never enable Cloudflare Email Routing on the apex.** It carries Zoho MX (changed 2026-08-04).
- **`question-bank.xlsx` edited in Apple Numbers does not write back.** Numbers saves a `.numbers`
  bundle to the Desktop, so the repo copy looks untouched while the edits sit elsewhere. Read the
  `.numbers` directly (`numbers-parser`) and merge. `0026` is **generated** from the workbook; never
  hand-edit the SQL.
- **Check the rollback target ID before trusting it.** The one the handoff named for weeks appeared
  in zero of ten deployments.

---

## 8. Corrections to the 2026-08-03 version of this file

Recorded so the same drift is visible next time:

1. Said 2026-08-24's legal and framing work was undeployed. **It is live.**
2. Said the seat Price was a hardcoded `PRICE_ID` needing a source edit. **Resolved by lookup key.**
3. Said the app palette was 35 files of raw inline hex. **It is tokenised; `#0094FF` is in 1 file.**
4. Said the question pool was 8 questions with no randomisation. **`0026` replaced it with 50, and
   it has been live on PROD since 2026-08-19.**
5. Carried no record that production had cut over to the PROD database. **It has, since 08-13.**
6. Carried no PROD-versus-staging migration gap. **PROD is at `0027`; `0028` and `0029` are not on it.**
7. Predated the framing correction, the intake, and both 08-26 reversals.
8. Listed `NEXT-10-STEPS.md` as a live companion. **It was a June 12 onboarding checklist and is
   now in `.planning/archive/`.**
