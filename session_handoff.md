# Session Handoff

**Date:** 2026-09-24 (latest section; older sections kept below)
**Who:** Rob, with terminal-Claude (earlier sections: Max, Rob)
**Written for:** someone who has never seen this repository

---

## 🔴 Added 2026-09-24 (Rob, terminal-Claude) — Resend works; test runs were bouncing real mail

**Resend is verified and sending.** `scripts/test-resend.mjs` (Rob's; run `dotenv -e .env.prod -- node scripts/test-resend.mjs`) delivered
to `delivered@resend.dev`. The 403 "domain is not verified" blocker (item 5 under "Blocked on
infrastructure" below) is **closed** — invite and certificate emails now actually reach people.

**That immediately exposed a new problem, now fixed and live.** Test users are seeded at
`@test.invalid` (`tests/quiz-session.test.ts` and four other files) and drive the real pipeline, so
a quiz pass sent real cert emails that bounced. A sustained bounce rate can get the Resend account
suspended — the same account that delivers customer invites. Fix `b7a78ca`: `sendEmail` in
`lib/resend.ts` and in `workers/cert-worker/src/index.ts` now drops `.invalid` recipients
(`isUndeliverable()`) and skips the send if none remain; an empty list still throws. 5 new tests in
`tests/resend-recipients.test.ts`. **Deployed to production** — run `36037312575`, success,
`headSha` verified = `b7a78ca`.

**Cert worker also deployed** (`bsbr-cert-worker`, version `7126c9ab-34e6-44aa-8788-cc4ab558c309`,
both crons, prod `SUPABASE_URL`/`APP_URL`). **To redeploy it: `pnpm run deploy` from
`workers/cert-worker`.** That now works as-is; two traps hit on the way were fixed in config:

1. **Bare `wrangler deploy` there picks up the ROOT `wrangler.jsonc`** (the main app) and fails on
   missing `.open-next/worker.js`. Fixed: the worker's `deploy` / `deploy:staging` scripts now pass
   `--config wrangler.toml` (and `--env=""` for prod). Never run bare `wrangler deploy` there —
   the main app must only deploy via GitHub Actions.
2. **Wrangler targeted the stale account `2809122619…`** → `Authentication error [code: 10000]`,
   same trap as 2026-08-27. Fixed: `account_id = "4b2a402334decc9259d7317aaf9782f0"` is now in the
   worker's `wrangler.toml` (Rob).

**🔴 Max — this moves your delivery-email copy to the top of the list.** With Resend live, the
only thing between a firm and its policy email is `POLICY_EMAIL_COPY_APPROVED = false` in
`lib/policy/delivery-email.ts:41` (item 7 below). It's safe as-is — nothing sends a `[TODO(copy)]`
email — but no firm gets its policy emailed until that copy lands. Cancel-refund copy on
`/dashboard/billing` is next after that.

---

## 🔴 Added 2026-09-21 (Rob, terminal-Claude) — the punch list got built, the DB caught up, and it all shipped

**Status: session complete. Everything below is live in production**, except the one item
explicitly called out as deferred (renewal-side auto-charging). Start here, then read
`.planning/OPEN-ISSUES.md` for full detail on any item — it was updated in place throughout the
day, not duplicated here.

### What shipped

Max hadn't picked up the 2026-09-11 punch list ten days later, so Rob had terminal-Claude build it
directly, then kept going through two more real issues Rob raised mid-session.

- **#15/#17 firm name asked twice** — ✅ built. `/pricing` collects it, carries it via Checkout
  metadata, webhook pre-fills `firms.name`, `/onboarding` shows it read-only when pre-filled.
- **#20 payment-failure alert** — ✅ built. `handlePaymentFailed` now calls `alertOperator`
  (extracted to `lib/operator-alert.ts` so more than the webhook route can use it).
- **#20 self-serve cancel + refund request** — ✅ built. New eligibility rule
  (`lib/cancel-refund-eligibility.ts`), new `/api/billing/cancel-refund` route, new section on
  `/dashboard/billing`. Never calls Stripe's refund or cancel APIs — alerts the operator instead,
  by design. **UI copy is a first draft and needs a copy pass before it's truly final** — Max is out
  for a few days, Rob is covering this himself.
- **#18 mid-year seat additions** — 🟡 half built, on purpose. The add side is done and charges real
  money through Stripe today: `app/api/billing/add-seats/route.ts`, `/dashboard/billing`'s "Add
  seats" control, `lib/seat-ledger.ts`'s credit math (matches Rob's own worked example exactly,
  unit-tested). **The renewal side — actually making Stripe charge the true-up amount automatically
  at renewal — was deliberately NOT built.** Real Stripe-timing design work of its own, flagged
  rather than rushed. `CLAUDE.md`'s flat-on-renewal pricing rule now has a dated, explicit exception
  recorded for this.
- **#9c pre-Stripe duplicate-purchase check** — ✅ built, raised by Rob mid-session. `/pricing` now
  collects email up front and `/api/checkout` refuses `duplicate`/`email_in_use` buyers **before**
  a Stripe session exists, instead of only catching them after the card was charged. Extracted
  `resolveBuyer()` to `lib/buyer-identity.ts` so the webhook's existing post-charge check and this
  new pre-charge check share one implementation.
- **DPA retired as a blocker** — Katy's call, 2026-09-21: not going to be written. Fixed three live
  spots still promising one (checkout error message, every transactional email footer, `/mockup`) —
  `/terms` and `/privacy` were already clean, `/dpa` was already 404-guarded since 08-24.
  **"Permanently" means until Katy reverses it** — `.planning/OPEN-ISSUES.md` #4 has a numbered
  checklist of exactly what to restore if she does; every touched spot is tagged `ix-dparetired`
  in a code comment.
- Statement descriptor (`BSBR HOLDINGS LLC`) — Rob's call: not a problem, it's the parent company.
  No change made.

### Database

Staging was missing `0033_seat_ledger.sql`'s migration-history registration (Rob applied it
directly, not through the CLI, so it wasn't tracked) — fixed. **Production was missing six
migrations outright** (`0028`–`0033`) — applied all six via the Supabase MCP, in order, verified
table-by-table against the migration files afterward. `Intake-uploads` storage bucket already
existed on prod (someone had already created it). `types/supabase.ts` is hand-patched to match the
new `seat_ledger` table — correct, checked column-by-column, but not a real `supabase gen types`
output; regenerate for real next time someone has the CLI linked to staging.

### Deploy — the big one

**Nothing had reached production since 2026-08-24.** A month of work — the entire policy intake
system, the policy generator, and everything above — was sitting on `main` undeployed. Rob asked
for it to ship. It now has, confirmed three separate times today by matching the deployed
`headSha` to `git log`, not just trusting a green checkmark:

🔴 **The first deploy attempt reported success but shipped nothing new.** All of this session's
commits were sitting local-only — never pushed — and `gh workflow run --ref main` checks out
`origin/main`, not the local branch. The run went green against 8-commit-stale code and would have
looked like a successful ship to anyone who didn't check the SHA. **Lesson, worth repeating every
time:** after triggering a deploy, run `gh run view <run-id> --json headSha` and compare it to
`git log -1`. A green run is not proof of what it shipped.

Production is current as of commit `48c260e` (the DPA-retirement fix). One commit sits ahead of
that undeployed — `253271d`, a docs-only reinstatement checklist with zero code change — so there's
nothing to redeploy for it.

### Verification

`npx tsc --noEmit` clean throughout. `pnpm lint` clean on every changed file. `pnpm test`: **527
passed, 1 skipped, 0 failed** — full suite, not just the changed files. (Earlier in the session a
partial run showed 15 failures; `git stash` proved they were pre-existing and unrelated, and a
later full clean run showed 0 failures, confirming they were transient — Supabase auth rate-limit
flakiness under concurrent test load, not a real problem.) 28+ new tests added across
`tests/cancel-refund-eligibility.test.ts`, `tests/seat-ledger.test.ts`, and
`tests/buyer-identity.test.ts` (the last one run against real staging data — real firm owners,
real staff members — not mocks).

**No browser click-through was done.** Everything above is type/unit/integration-tested and now
live, but nobody has actually opened `/pricing`, `/onboarding`, `/dashboard/billing` or the
duplicate-purchase refusal in a real browser yet. Worth doing before telling Katy or a real
customer any of this is ready to demo.

### Next steps

1. Max: pass on the cancel-refund UI copy when he's back.
2. Someone: click through the new flows in a real browser — `/pricing` (email + firm-name fields,
   the duplicate refusal), `/dashboard/billing` (add seats, cancel+refund request).
3. Someone with the Supabase CLI linked to staging: regenerate `types/supabase.ts` for real,
   replacing the hand-patched version.
4. Rob/Katy: the renewal-side auto-charging for #18 needs its own dedicated pass — Stripe
   sandbox testing, timing design against Stripe's own invoice cycle. Not urgent until a firm that
   added mid-year seats actually reaches a renewal.
5. Katy: still owns the DPA decision (permanent unless reversed), the 9 unwritten policy clauses,
   vendor-block review, and the ~15 missing intake questions — none of that moved today.

---

## 🔴 Added 2026-09-11 (Rob, terminal-Claude) — Katy's billing/Stripe punch list, scoped for Max

**What was done.** Rob walked through several billing/Stripe issues Katy raised. Each was verified
against the actual code (not guessed) and, where it needed one, a design was agreed with Rob.
**Nothing has been coded.** This is scoping only — Max is picking up the build.

**Full detail lives in `.planning/OPEN-ISSUES.md`, items #15–20 (added 2026-09-10/11).** One line
each:

- **#15/#17 Firm name asked twice at signup.** Root cause confirmed (Stripe's optional Tax ID field
  vs. `/onboarding`'s own ask). Design agreed: capture firm name on `/pricing` before Stripe, carry
  it via Checkout Session `metadata.firm_name`, have the webhook write it into `firms.name`
  directly, `/onboarding` shows it read-only instead of asking again.
- **#16 "Keep credit cards on our side" — rejected, nothing to build.** Katy's ask would move IURIX
  from PCI SAQ A into SAQ D — real ongoing compliance cost and real breach liability, wildly
  disproportionate at this scale. The actual need (client changes their card) is **already built**:
  `/dashboard/billing` → "Update payment method" → `/api/portal` → Stripe Customer Portal. Likely
  just needs demoing to Katy, since nothing's deployed to prod since 2026-08-24.
- **#18 Mid-year seat additions — billing model agreed, currently has zero mechanism.**
  Today, inviting staff past the purchased seat count is a hard 409
  (`app/api/invite/route.ts:53-58`), and the UI's own "Add seats in Billing" pointers
  (`invite-form.tsx`, `csv-upload-form.tsx`, `intake-client.tsx`) lead to a page with no add-seats
  control. Agreed model: mid-year add = one-time full-year charge at the firm's *current* per-seat
  rate (no band recalculation at add-time); annual renewal recomputes headcount, applies the new
  band to everyone, and credits any seat still inside its mid-year-paid window. Needs a new
  seat-ledger table (`seats` today is one aggregate row per firm, no per-seat date/rate) and moves
  the annual renewal from passive Stripe auto-billing to an app-controlled step. **Flagged for
  Katy:** this modifies the standing "flat on renewal, no discount" pricing rule in `CLAUDE.md` —
  should be a conscious sign-off, not a silent contradiction.
- **#19 Change payment method mid-year — already built, no work needed.** Same mechanism as #16.
- **#20 Cancellation is four separate mechanisms, not one.** Auto-renewal cancel and single-staff
  removal are both already built and need no change. Two gaps agreed for Max to build: (a) a
  self-serve "Cancel" action that checks 14-day + no-certificate-issued eligibility in-app and, if
  eligible, emails the operator to review and manually issue the refund via the existing
  `alertOperator` helper (`app/api/webhooks/stripe/route.ts:186-214`) — no auto-refund; (b) wire
  that same `alertOperator` pattern into `handlePaymentFailed`
  (`app/api/webhooks/stripe/route.ts:881-890`), which today silently flips a firm to
  `payment_failed` with no notification to anyone. Full account/data deletion is **pinned** —
  Rob needs to talk to Katy first, since it conflicts with the evidentiary retention rule on
  `training_events` (kept indefinitely, identifiers stripped, as the record behind a certificate).

**Status:** all six items above are scoped, none are built. **Next step is Max's** — pick these up
against `main` (currently at whatever commit this handoff was pushed with; check `git log` for the
real tip, per trap #1 below about not trusting dates).

**Open question for Katy, not Max:** the full-account-deletion policy (item #5/pinned above) needs
her input before it can even be designed, let alone built.

---

## 🔴 Added 2026-09-03 (Max, desktop) — policy review in progress

Max and desktop worked the policy document section by section against Katy's source.
**Sections 1 to 5 are settled and approved; Section 6 is mid-discussion.** Every approved
sentence is recorded in **`.planning/POLICY-REVIEW-2026-09-03.md`** with the reasoning and
Max's own instruction quoted. **None of it is built** — the approved text still has to be
written into `lib/policy/blocks/` by terminal.

Katy's definitive intake list of 2026-09-02, which is the sole authority behind retiring 22
intake questions, existed nowhere in the repo and was cited only in two code comments. It is
now saved verbatim at **`.planning/KATY-INTAKE-LIST-2026-09-02.md`** with a gap analysis
against what is built.

**The one defect from that pass is RESOLVED (2026-09-04) and was misdiagnosed.** Katy's core
no-training rule was missing from the rendered policy, and 09-03 blamed the condition evaluator.
The real cause was the `maximal` fixture setting `tool_grid` without `ai_tools`, which `isAnswered`
derives the grid's rows from. A real firm could never reach that state. One line in
`lib/policy/fixtures.ts`; the renderer now shows 55 verbatim clauses instead of 54.

---

## What this is

**IURIX** — a self-serve platform where a small law firm pays once a year and
gets a **written AI use policy personalised to that firm**. The policy is the
product. The staff training exists to hold people to it; the quiz, the
attestations and the certificates are the evidence they are.

> ⚠️ **ABA Model Rule 5.3 is NOT the thesis.** Katy corrected this on 2026-08-24
> and it is a correction, not a preference. The rule is background context and at
> most a fine-print citation. Do not reintroduce it as the pitch. The one
> deliberate exception is the legal disclaimers in `.planning/legal/terms-of-service.md`
> §3 and §11, which name it in order to disclaim it.

Stack: Next.js 15.5 App Router on **Cloudflare Workers** (via `@opennextjs/cloudflare`),
Supabase (auth + Postgres + storage), Stripe, Resend. Never add
`export const runtime = 'edge'` anywhere.

---

## 🔴 Read these five before you touch anything

### 1. Deploy status is answered by ONE command, and nothing else

```bash
gh run list --workflow=deploy.yml --limit 15 \
  --json event,conclusion,createdAt,headSha,displayTitle
```

A run with `"event": "push"` is a **preview**. It ships nothing. Only a
`workflow_dispatch` whose "Deploy to production" step succeeded actually went
live:

```bash
gh workflow run deploy.yml --ref main -f target=production
```

> ✅ **Closed 2026-09-21 (Rob, terminal-Claude).** The month-long gap above is over —
> `workflow_dispatch` run `35608044732` deployed `main` at `c014ca0` to production, confirmed
> `success` on every step including "Deploy to production" and "Smoke-test production", and
> `headSha` in `gh run view` matched local `HEAD` exactly. Live-checked afterward: `x-opennext: 1`
> on the apex, and `/pricing`'s new email field (`pricing-email`, added this session) present in
> the served HTML — not just a green checkmark, the actual new code.
>
> 🔴 **One real mistake in getting there, worth remembering.** The first deploy attempt
> (`35607540104`) reported `success` and looked identical to the real one — but its `headSha` was
> `d12501c`, eight commits behind. **The 8 commits from this session had never been pushed** —
> `gh workflow run --ref main` checks out `origin/main`, not the local branch, and `git push` had
> simply been skipped. The workflow ships whatever is on the remote, correctly, even when that's
> stale — it is not a bug in the deploy, it's a step that's easy to forget. **Always check `gh run
> view <run-id> --json headSha` against local `git log -1` after triggering a deploy, not just the
> conclusion.** A green run with the wrong SHA is a deploy that did nothing.
>
> Production now carries the entire policy intake system, the policy generator, and everything
> from this session (firm-name dedupe, payment-failure alerts, self-serve cancel+refund, mid-year
> seats add-side, the pre-Stripe duplicate-purchase check) — all of it live for the first time.

Historically true and worth keeping for the pattern, even though the specific gap above is closed:
**do not infer deploy status from commit dates, branch names or a green checkmark** — every one of
those has misled a previous session, including this one, until the `headSha` was checked.

### 2. Staging and production are different databases

> ✅ **Closed 2026-09-21 (Rob, terminal-Claude, via the Supabase MCP).** Production was missing
> `0028`–`0033` as of this morning — confirmed by querying both projects' migration history
> directly, not inferred. All six were read from the repo and applied to prod in order
> (`apply_migration`), each verified to land before the next ran. The `Intake-uploads` bucket
> **already existed on prod** (private, correct capitalization) — that half of the old blocker had
> already been resolved by someone before this session; only the schema gap was real.
>
> One thing worth knowing for next time: `apply_migration` registers its own timestamp-based
> version string (e.g. `20260921125758`), not the migration's own `0028`-style prefix. Left alone,
> that would make `supabase db push`/`db diff` think these were never applied and try to rerun
> them against objects that already exist. Corrected by hand — `update
> supabase_migrations.schema_migrations set version = '0028' where name = 'policy_intake'` (and
> so on for each) — so prod's history now reads `0001`...`0033` exactly like staging's. **If you
> ever use `apply_migration` again, check `select version, name from
> supabase_migrations.schema_migrations order by version` afterward and fix the version string if
> it doesn't match the filename.**
>
> `get_advisors` (security) run on both projects post-migration: identical warning set on prod and
> staging, all pre-existing, nothing new from today's tables.

| | Project ref | State |
|---|---|---|
| **STAGING** | `ndmzvtuywcufvkxtkjhg` | migrations current through `0033`; 22 firms; **this is what `.env.local` points at** |
| **PRODUCTION** | `ttqthtzdjacrhjtrcmmy` | migrations current through `0033`; 0 firms |

Code reaches production through CI; the database it lands on does not follow automatically — that
is still true and still worth checking each time, it just isn't a live gap right now.

Before any migration work:

```bash
npx supabase link --project-ref ndmzvtuywcufvkxtkjhg   # staging
```

The CLI sat pointed at **production** for six days once already. Whatever you
link it to, **relink it to staging in the same session**.

### 3. Standing traps that have each cost someone a day

- **`enrollments` has no `created_at`.** The column is **`enrolled_at`**. A
  comment in `0007` claimed otherwise for weeks.
- **Never run `wrangler deploy` from inside `workers/cert-worker/`.** Without
  `--config wrangler.toml` wrangler walks up, finds the root `wrangler.jsonc`,
  and **redeploys the main app over itself while reporting success.**
- **The cert-worker does not generate certificates.** Its `fetch` handler is a
  stub that returns 200 and does nothing (`src/index.ts`, `// TODO`). The live
  path is the Supabase webhook `Cert-queue-generate` → the app's
  `/api/certs/generate`. Its **cron** handler is real and load-bearing (queue
  drain, expiry reminders) — the inertness is the HTTP handler only.
- **A stored certificate PDF is never re-rendered.** Changing `lib/cert-pdf.ts`
  affects only certificates issued afterwards. To see a new design you need a
  **new employee** — the `already_exists` short-circuit plus the unique
  constraint on `enrollment_id` mean re-running training regenerates nothing.
- **A worker secret silently overrides a `vars` entry**, and `NEXT_PUBLIC_*` is
  **inlined into the client bundle at build time** from `.env.local` /
  `.env.production`. Changing it in `wrangler.jsonc` alone does nothing to
  already-built assets and presents as a caching bug.
- **`??` does not fire on an empty string.** Firms are now created with
  `name: ''`, so every `firm?.name ?? 'fallback'` in the codebase renders blank
  rather than its fallback. Deliberately left alone (a name is now always
  captured), but it is why `deliver-policy.mjs` needed fixing today.

### 3.5 🔴 HOPSCOTCH — Max's one-word reset (added 2026-09-04)

**If Max says the single word "hopscotch," he is resetting how you are working.** It means: run
the whole output discipline, starting with verification.

**The verification half, which is the new part.** Before asserting anything load-bearing, check
yourself:

- **Name the source.** File and line. If you cannot, you are recalling, not knowing.
- **Check the source is still authoritative.** A document can be real, quoted correctly, and
  superseded. Katy's 2026-09-02 list supersedes her August research doc for what the intake asks.
- **Existence is not intent.** "She once wrote this" is not "she wants this."
- **Say which is yours.** Mark inference as inference.

*Why it exists:* on 2026-09-04 Claude proposed adding a clause and told Max "Katy's own design had
two halves." It was in her August draft and had been **dropped** from her September list. Claude
had already established that list as the authority an hour earlier. Same shape twice more that
week: two intake claims published from a regex parse that had silently dropped entries, and a
"broken condition evaluator" that was a broken test fixture. All confident, all wrong, all
catchable by reading the source instead of the artefact.

**The rest of what the word recalls:** concise bullets and lead with the answer, never walls of
prose; Max does **not** read terminal output, so translate it rather than quoting it; propose
changes in the form *what it says now, what I propose, why mine is better*; no spaced em dashes and
no `§` in anything he reads; customer-facing copy is his to write, never yours; and answer the
instruction he actually wrote rather than the adjacent thing you noticed.

### 4. 🔴 Max writes all user-facing copy

Do not write, improve, soften or "clarify" any string a customer reads. Propose
it and let him write it. Copy already in the tree marked as his is verbatim and
is not yours to edit.

### 5. 🔴 Spaced em dashes are never acceptable in shipped text

Not in prompts, help text, option labels, buttons, emails, legal pages or
anything built at render time. Use a colon or a comma. **Code comments may keep
them.**

Note that a grep of source literals is **not** sufficient: `formatAnswer` in
`lib/intake/review.ts` was *building* em dashes at render time, invisible to
search, and they were only caught in a screenshot. There is now a test that
sweeps every prompt, help string and option label.

---

## Where the code is right now

`main` carries everything below. **None of it is deployed.**

```
main
 └── intake-firm-name-and-copy   MERGED today (9 commits)
 └── em-dash-purge  5ea8687      NOT merged — Codex's, see below
```

| | |
|---|---|
| `pnpm test` | **530 passed, 25 files** |
| `npx tsc --noEmit` | exit 0 |
| `pnpm lint` | 0 errors, 4 warnings (pre-existing `no-img-element`) |

### What landed today

- **The firm name is captured at `/onboarding`, required**, and a **middleware
  gate** holds any signed-in admin whose `firms.name` is blank at
  `/onboarding/firm-name`. The Stripe webhook writes `''` instead of the literal
  `'My Firm'` it used to show every real buyer for the whole intake.
- **The pre-filled name now counts as an answer** — it was a display-only prop,
  so Send refused until the firm retyped it.
- **`foreign_languages` is a 95-entry picker** with an "Other" write-in, not free
  text.
- **The intake copy is Max's rewrite** — new h1, shorter intro, ten of eighteen
  help strings deleted.
- **The review page** numbers 1..N matching the intake, has exits (it had none),
  and lost a paragraph that claimed an attorney is notified when answers change.
  **Nothing notifies anyone.**

Full reasoning: **`.planning/sessions/20260902-max-summary.md`**. Read it before
touching the intake.

### ⚠️ The gate is one field, not the intake

Katy killed the hard intake gate on 2026-08-26 — *"People will want to explore
without having to fill it all in."* Today's gate demands **one field** and the
firm explores freely once it is answered. **Do not widen it.** And it must stay
in middleware: a shared layout does not re-render on soft navigation, which is
how the earlier gate was got wrong.

---

## The other branch — `em-dash-purge`, Codex's, do not merge

`5ea8687`. 21 files, 85 user-facing em dashes removed across `app/_components`,
`app/pricing`, `app/terms`, `app/privacy` and `emails`. It touches **nothing**
under `app/intake` or `lib/intake`.

**Codex rebases it onto the new `main` and merges it.** Its worktree at
`.worktrees/em-dash-purge` can stay — `.gitignore`, `vitest.config.ts` and
`eslint.config.mjs` now exclude worktrees, because both tools were walking into
it and reporting two branches' results added together.

One defect handed back to Codex, not fixed here:
`app/_components/exposure-section.tsx:158` renders a double space.

---

## Unfinished, with enough to pick up cold

### Blocked on Katy

1. **Nine policy clauses need real prose.** `lib/policy/blocks/` has 51 verbatim
   and 18 TODO. Of the 18: **nine need new writing** (source lines 268, 276, 278,
   312, 316, 318, 320, 330, 342 in `AI-Policy-Research-2026-08-20.md`), **five are
   structural** (bare headings whose sub-bullets are already transcribed), **three
   are intake questions not clauses**, and one is a deliberate hold. The most
   important is **342** — *"Professional level of data protection: API, Claude
   Enterpirse, ..[finish this list]"*. §5, §9 and §10 all turn on that term.
2. **`lib/policy/vendor-block.ts` is unreviewed and is on `main`.** It is the only
   *generated* rather than transcribed text in `lib/policy`. For the 15 vendors
   whose terms are unclear it bars client-confidential information from the
   platform's AI features until the firm holds written no-training confirmation.
   That follows from Katy's rule but **is a reading of it, not her words.** Fine
   only while nothing deploys. Known problems: about half of it is action items
   (which D2 says is a separate deliverable), "written confirmation" is not the
   term §22 will define (her rule says *express agreement*), and the DPA is
   bundled into the training sentence though a DPA is not a no-training agreement.
3. **D3's count of nine missing intake questions is wrong — there are about
   fifteen.** Cross-referencing Katy's Section 0 and Modules A–W against the built
   question keys turns up: practice areas (Section 0 Q3), research verification
   step (B Q2), onboarding process (G Q1), attestation cadence (G Q3), vendor
   diligence beyond no-training (G-Q6), who approves a new tool (G-Q8), who trains
   staff and how often (G-Q9), local-vs-cloud storage (H Q5), TAR methodology (L
   Q2), notetaker states (M Q3), citation-verification step (O Q1), engagement
   letter (P Q2), malpractice AI exclusions (R Q2), employee handbook (S Q1),
   client "safe question" examples (T Q3). **Reconcile before taking anything to
   her.**
4. **Privacy §2 and §5 have no category covering intake answers**, and now also
   owe the **three-day retention rule** (Max, 2026-09-01: a lapsed subscription
   keeps answers for three days, then they are permanently removed). Open since
   the intake's first batch.

### Blocked on infrastructure

5. **Resend returns `403 The iurixaccreditation.com domain is not verified.`** All
   four DNS records are present and correct — someone with Resend dashboard access
   has to click verify, possibly in **Max's** account. **Money is live**, so a firm
   can pay tonight, invite staff, and no invite email is ever delivered.
6. ~~`0028`–`0032` are not on production, and `Intake-uploads` does not exist there.~~ —
   ✅ **Closed 2026-09-21.** See trap #2 above. Prod now has the schema and the bucket was
   already there. Resend's 403 (item 5, still open) is the real remaining blocker on the intake
   actually reaching anyone.
7. **The delivery email is locked twice.** Resend's 403 is one. The other, and the
   important one, is `POLICY_EMAIL_COPY_APPROVED = false` in
   `lib/policy/delivery-email.ts:41`, pinned by a test. Without it, the day
   someone fixes DNS every delivery would email firms a message reading
   `[TODO(copy) — headline]`. **Copy is Max's to write, and it has to land before
   or with the DNS fix, never after.** The intake intro now promises *"We email
   you when it is ready"* to every buyer.

### Code, open

8. **`/api/invite/bulk` discards the name** (`route.ts:91` —
   `createUser({ email, email_confirm: true })`, no `user_metadata`). Staff
   invited from the dashboard get a certificate made out to their email address.
   Does **not** affect the intake roster, which goes through `promote` and does
   stamp the name.
9. **The translations clause does not name the languages.** `p19-translations` in
   `lib/policy/blocks/s09-drafting.ts` is verbatim and does not interpolate
   `foreign_languages`. The new control collects them cleanly — including "Other"
   and multiple selections, tested through `assemble()` — but no clause reads them
   yet.
10. **The roster line reads ambiguously for a short name.** `1, x@y.com, Attorney`
    — the comma separator (from today's em-dash purge) makes a one-character name
    indistinguishable from the question numeral beside it. Needs a better
    separator. **This is not a lost name** — see #12.
11. **Two known AA contrast failures on the nav pill**, accepted by Max with the
    numbers in front of him: white on `#0094FF` is 3.14:1, and `#0094FF` on
    `#EAF6FF` is 2.86:1. Do not "fix" by moving the brand token. The compliant
    near-miss is a deeper ground on that pill only.

### 📌 Do NOT re-hunt these two

12. **The roster names were never lost.** A review row reading
    `1, dev0902b@example.com, Attorney` is Max having typed `1` through `10` as
    the names himself. They are intact in `intake_answers` and were stamped onto
    `auth.users` by `promote`. Nothing to recover.
13. **The marketing nav links on `/pricing` are not dead.** Reported, could not be
    reproduced — all three resolve and scroll. Almost certainly a dev-server
    rebuild mid-save.

---

## How to work here

- **Verification is `pnpm run deploy` or a real browser**, not `pnpm dev` alone.
  Max runs `pnpm` / `stripe` / CLI commands himself; git add/commit/push are the
  agent's — **but only after Max's explicit go-ahead.**
- **Sessions run in parallel.** Another agent may commit and push to the same
  branch mid-task. Re-check `HEAD` before any amend or reset, stage explicit
  paths, never force-push.
- **Two scripts refuse to run against production**, by parsing the project ref out
  of the environment actually loaded: `scripts/dev-auth.mjs` and
  `scripts/dev-seed-firm.mjs`. There is no `--force`. Keep it that way.
- **`dev-seed-firm.mjs` passes a real firm name**, which is exactly why the
  `'My Firm'` placeholder went unseen for weeks. A fixture that fills in what
  production leaves empty hides that class of bug every time.
- **Run the suite as `pnpm test`.** Bare `npx vitest run` fails five suites on
  missing env and looks like a regression.
- At session start: `git pull`, read this file, then read **every** file in
  `.planning/sessions/` oldest first. Rob and Max work on different machines and
  may each be unaware of the other's work.
