> 🔴 **Status correction, 2026-08-27. The header below is out of date in the one way that matters.**
>
> It says "Nothing points at it yet: production still runs on IURIX STAGING." **That is no longer
> true.** Production runs on **IURIX PROD (`ttqthtzdjacrhjtrcmmy`)**, verified 2026-08-27 by reading
> `NEXT_PUBLIC_SUPABASE_URL` out of the live `/login` bundle: exactly one Supabase host appears and
> it is PROD. The cutover happened, Phase A, 2026-08-13.
>
> ⚠️ **This file stops at `0025` and it is not the last word.** `0026` and `0027` were pushed to
> PROD on **2026-08-19**; the record of that is in `.planning/sessions/20260819-max-summary.md`,
> which states "PROD and staging both at migration 0027". Reading this file alone gives the wrong
> answer, and did on 2026-08-27.
>
> **PROD is at `0027`. Local and STAGING are at `0029`.** Not on PROD: `0028` (the intake schema)
> and `0029` (email deliverability). The `Intake-uploads` Storage bucket also exists on STAGING
> only. See `STATE.md` §2.
>
> **When a migration is pushed to PROD, record it here in the same session.** Nothing else tracks it.

---

# PROD database cutover

**Written:** 2026-08-05 (Rob + Claude, terminal) · **Tier 1 plan revised:** 2026-08-06
**Status:** IURIX PROD is schema-complete and seeded. **Nothing points at it yet** — production
still runs on IURIX STAGING. Tier 1 is deliberately planned but not started; Max drives the
Supabase and Cloudflare steps, and Rob changes the GitHub Actions secrets before a build.

---

## ⚠️ Read this first: four things are NOT in the migrations

This is the whole reason this document exists.

Applying `0001`–`0023` to a fresh Supabase project does **not** produce a working IURIX database.
Four objects were created by hand in the dashboard over June–July and exist nowhere in source. A
project built only from migrations looks complete, starts cleanly, serves the marketing site, lets
people sign in — and then fails at the moment a certificate should be issued, with nothing in the
logs pointing at the cause.

| Object | Where it lives | What its absence does |
|---|---|---|
| **`certificates` storage bucket** (private) | Storage | Cert generation dies at the storage write, **after** the employee has passed the quiz |
| **The `courses` row** | `public.courses` | Nothing to enrol into. `0003`'s quiz seed is gated on a course existing, so it silently no-ops and the question pool is empty too |
| **Database Webhook `cert-worker-quiz-pass`** | `quiz_attempts`, AFTER INSERT → cert Worker | **A passed quiz produces no certificate. Ever. Silently.** |
| **Database Webhook `cert-queue-generate`** | `cert_generation_queue`, AFTER INSERT → `/api/certs/generate` | The retry/dead-letter path never fires |

`0013_settings_v1.sql` admits the first one in its own comment — *"the `certificates` bucket, which
was created manually in the dashboard; this one is versioned here instead."* Nobody carried that
forward into a checklist.

The two webhooks are the serious ones. They are **Supabase Database Webhooks**, which are dashboard
objects implemented as triggers calling `supabase_functions.http_request`. They are not schema, they
are not in any migration, and a schema diff that only counts tables/columns/policies will not miss
them — you have to compare **triggers**. That is how they were found.

> **If you ever stand up another environment, start from this table, not from `supabase db push`.**

---

## The two projects

| | IURIX PROD | IURIX STAGING |
|---|---|---|
| Ref | `ttqthtzdjacrhjtrcmmy` | `ndmzvtuywcufvkxtkjhg` |
| Created | 2026-06-11 | 2026-06-11 |
| Status | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| Postgres | 17.6.1 | 17.6.1 |
| Serving production? | **not yet** | **yes, today** |

Both are on the same org. Rob upgraded to Pro and unpaused PROD on 2026-08-05; before that PROD had
been INACTIVE since the day it was created and had **zero** migrations, tables and buckets.

> **CLAUDE.md says Postgres 15.** Both projects are actually on **17.6.1**. Minor, but the doc is
> wrong.

---

## What was done on 2026-08-05

**Schema.** Migrations `0001`–`0022` applied to PROD. Verified against staging and identical on every
axis measured:

```
                tables  columns  policies  functions  indexes  triggers
IURIX PROD          13      107        18          9       44         2
IURIX STAGING       13      107        18          9       44         4
```

The trigger gap is the two Database Webhooks above — the only remaining schema difference, and it is
not fixable from SQL until webhooks are enabled on the project (see below).

> ✅ **Closed 2026-08-06.** Max enabled Database Webhooks on PROD and recreated both triggers. PROD
> now reports **4** non-internal `public`-schema triggers, matching staging on table and event:
> `cert_generation_queue` ×2 (webhook + `trg_cert_queue_updated_at`), `firm_members`
> (`trg_sync_used_seats`), `quiz_attempts` (webhook). Auth Site URL and the `/auth/callback`
> redirect allowlist are set, and the shared secret was rotated to a fresh PROD-only value.
>
> ⚠️ **One known, deliberate cosmetic difference — do not "fix" it in a schema diff.** PROD's two
> webhook triggers are named `Cert-queue-generate` and `Cert-worker-quiz-pass` (capital C);
> staging's are lowercase. The trigger name is a label only: nothing in the codebase references it,
> and the webhook fires on table + event with behaviour determined entirely by the configured URL
> and headers. Verified harmless and left alone rather than spending another dashboard pass on it.
> A future staging-vs-PROD comparison **will** flag this as a difference; it is not one.
>
> To compare the two projects properly, filter to the `public` schema — an unfiltered `pg_trigger`
> query also returns Supabase's own `storage` and `realtime` triggers and returns 9 rows, not 4:
>
> ```sql
> select c.relname as table_name, t.tgname as trigger_name
> from pg_trigger t
> join pg_class c on c.oid = t.tgrelid
> join pg_namespace n on n.oid = c.relnamespace
> where not t.tgisinternal and n.nspname = 'public'
> order by c.relname, t.tgname;
> ```

**Migration history.** The MCP `apply_migration` tool records a **timestamp** version
(`20260805212209`), not the repo's `0001`. Left alone, a later `supabase db push` would treat every
migration as unapplied and try to replay them against a populated database, failing on the first
`CREATE TABLE`. The history table was rewritten to `0001`–`0022`, matching staging and the
filenames.

**Un-versioned objects.** The `certificates` bucket (private) and the `courses` row were created.
`0003`'s placeholder quiz seed was then run, since it is gated on a course existing.

---

## `0023_remove_avatars.sql` is no longer a cutover blocker

Closed 2026-08-06 in `3fe0ca4`. Migration `0023` is an intentional no-op; the destructive bucket
removal moved to `scripts/remove-avatars-bucket.mjs`, which was run and verified against staging.
PROD never had that bucket. It must not be run again as part of this cutover.

---

## Superseded 2026-08-05 summary

### Rob — dashboard, IURIX PROD

1. **Enable Database Webhooks.** Database → Webhooks. PROD currently has no `supabase_functions`
   schema and no `pg_net`, so the triggers cannot be created until this is on. Once it is, the two
   webhooks can be recreated from staging's definitions.
2. **Auth → URL configuration.** Site URL and the redirect allowlist must include
   `https://iurixaccreditation.com`. Every invite, password reset and seat reassignment calls
   `redirectTo: ${appUrl}/auth/callback`; a fresh project rejects redirects that are not on the
   allowlist, so all of them break silently.
3. **Rotate the webhook shared secret for PROD.** Staging's value is stored **in plaintext inside
   the trigger definition** and is readable by anyone who can query `pg_trigger`. That is inherent to
   how Database Webhooks work. PROD should not reuse the value that has been in staging since June.
   Whatever is chosen must match `WEBHOOK_SECRET` / `CERT_WEBHOOK_SECRET` on the Workers.

### The credential swap — all four places, together

```
NEXT_PUBLIC_SUPABASE_URL       https://ttqthtzdjacrhjtrcmmy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  sb_publishable_gOkxoiEHNtRKORRLyC2dRw_vc2hqmL5
SUPABASE_SERVICE_ROLE_KEY      dashboard → Project Settings → API keys
```

| # | Where | Consumed by | If missed |
|---|---|---|---|
| 1 | `.env.local` | `next dev` | local dev breaks loudly — harmless |
| 2 | App Worker secrets | server-side reads at runtime | server calls fail |
| 3 | **`workers/cert-worker` secrets** | **the cron jobs** | **crons keep writing to STAGING. Nothing errors.** |
| 4 | **GitHub Actions secrets** | **inlined into the browser bundle at build time** | **sign-in breaks silently and CI still goes green** |

`.planning/OPEN-ISSUES.md` and the older handoffs describe this as **three** places. It is four —
`cert-worker` is a separate Worker with its own `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
(`workers/cert-worker/src/index.ts`, `Env`). That omission is exactly the kind that produces a
half-migrated system nobody notices.

### Verification — do not skip, the failures here are all silent

- [ ] `grep` the **live browser bundle** for `ttqthtzdjacrhjtrcmmy`. Do not trust the deploy output.
- [ ] Send a real invite → the email arrives → the link lands on `/auth/callback` and not an error
- [ ] Complete a quiz pass end to end → **a certificate PDF actually appears in the bucket**. This is
      the one that proves the Database Webhooks are wired.
- [ ] Confirm the cert-worker cron ran against PROD, not staging

## Tier 1 execution plan — do not start until explicitly approved

This sequence cuts the live application from staging to the clean PROD project while rotating the
Database Webhook shared secret. It does **not** enable Stripe live mode; `ix-stripeaudit` remains a
separate launch gate.

> ⚠️ **Superseded 2026-08-27.** Both halves of that sentence are now out of date: **Stripe live
> mode was enabled on 2026-08-19** and `ix-stripeaudit` is **closed**. Live keys are in the deployed
> Worker, a real card has been charged and refunded, and Stripe Tax is active. The rest of this
> plan's sequencing still stands — only the "Stripe is not live" premise does not. See `CLAUDE.md`
> §4 and `OPEN-ISSUES.md` #6/#7. Record only identifiers, timestamps, versions and redacted command output in
the evidence log — never commit a service-role key or webhook secret.

### 0. Change control and recovery point

1. Re-run the shared-state checks in `session_handoff.md`; require clean, matching `main`, deployed
   app commit `dbb52ab` ancestral, and successful Actions run `31122263372` before touching config.
2. Freeze unrelated deploys and config changes. Record the current Cloudflare app and cert-worker
   versions, the current live browser-bundle project ref, and screenshots or exports of the staging
   webhook definitions and PROD Auth URL settings. Do not put secret values in the export.
3. Have the prior staging values securely available for rollback. No migrations, bucket deletions,
   Stripe live-mode changes, or test-firm cleanup are part of Tier 1.

### 1. Prepare IURIX PROD in Supabase — Max

1. In **IURIX PROD** (`ttqthtzdjacrhjtrcmmy`), enable **Database Webhooks**. Confirm the feature
   supplies the webhook support required by the dashboard before creating anything.
2. Recreate both triggers by copying staging's definitions field-for-field, changing only the
   environment-specific destination and the freshly rotated secret:

   | Webhook | Source | Destination / contract | Required check |
   |---|---|---|---|
   | `cert-worker-quiz-pass` | `quiz_attempts`, `AFTER INSERT` | production cert-worker POST endpoint with `X-Webhook-Secret` | Trigger exists and can authenticate to the cert worker. Its HTTP handler is currently known to be inert after validating a passed quiz; retain it because it is part of the staging topology, but do not claim it generated the certificate. |
   | `cert-queue-generate` | `cert_generation_queue`, `AFTER INSERT` | `https://iurixaccreditation.com/api/certs/generate` with `x-webhook-secret` | Endpoint accepts the new secret and claims the queue row exactly once. This is the event-driven certificate route. |

   Do not improvise SQL triggers or change payload shape during the cutover. Compare trigger name,
   table, event, URL, HTTP method, headers, enabled state and body template with staging before
   saving. Afterward, inspect the PROD trigger list again; its count should match staging: the two
   ordinary triggers plus these two matching Database Webhooks.
3. In **Authentication → URL Configuration**, set the Site URL to
   `https://iurixaccreditation.com` and add both the origin and
   `https://iurixaccreditation.com/auth/callback` to the redirect allow-list. Preserve required
   development/staging entries until their owners agree to remove them. This covers invitations,
   password resets and seat reassignment, all of which use `${appUrl}/auth/callback`.

### 2. Rotate the webhook secret — Max

1. Generate one fresh, high-entropy PROD-only value in the approved secret manager. Never reuse the
   staging value or paste the new value into a shell history, issue, commit, screenshot or this file.
2. Use that same new value for the two current certificate-pipeline contracts:
   `WEBHOOK_SECRET` and `CERT_WEBHOOK_SECRET` on the cert worker, and
   `CERT_WEBHOOK_SECRET` on the app Worker. Put it in each PROD Database Webhook's
   `x-webhook-secret` header as the route requires. This preserves the existing one-secret design;
   splitting the secrets is a separate, code-reviewed hardening change.
3. Verify authentication without revealing the value: an old/staging value is rejected with 401;
   the new value is accepted by each intended endpoint. Do this only with an authorized controlled
   request and record status codes, not headers or bodies containing secrets.

### 3. Swap Supabase credentials in all four locations — Rob then Max

Set the GitHub Actions values first; they are consumed only by the next Linux build. Then make the
remaining changes in one controlled window and immediately deploy the already-reviewed `main`.
The project URL must be `https://ttqthtzdjacrhjtrcmmy.supabase.co`; fetch the matching PROD anon and
service-role keys from the PROD dashboard at execution time rather than copying values from notes.

| Order | Location and owner | Required PROD values | Failure if omitted |
|---:|---|---|---|
| 1 | **GitHub Actions secrets — Rob** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The browser bundle remains bound to staging; CI can still pass while sign-in later fails or splits state. |
| 2 | **App Worker secrets — Max** | Runtime Supabase URL, anon key where used, service-role key, and rotated `CERT_WEBHOOK_SECRET` | Server routes use the wrong database or cannot authenticate. Inventory the existing Worker secret names first; do not guess or delete unrelated secrets. |
| 3 | **`workers/cert-worker` configuration and secrets — Max** | `SUPABASE_URL` (the non-secret `wrangler.toml` var), `SUPABASE_SERVICE_ROLE_KEY`, `WEBHOOK_SECRET`, `CERT_WEBHOOK_SECRET` | Its five-minute queue drain and daily crons silently continue against staging. |
| 4 | **`.env.local` — Max** | 🔴 **REVERSED 2026-08-06 — LEAVE THIS ON STAGING.** Create a separate gitignored `.env.prod` for PROD credentials instead. | See below. Pointing local dev at PROD removes the last environment that is safe to click around in. |

> ### 🔴 Why location 4 is now the opposite of what this table used to say
>
> This document originally said to point `.env.local` at PROD so that "local development
> represents production." **That is wrong, and following it would undo the reason this cutover
> exists.**
>
> There is **one website and two databases.** `iurixaccreditation.com` is a single Worker that
> talks to whichever Supabase project the current deployment was built with. Today that is
> STAGING — which is the only reason the 17 test firms are on staging rather than in production.
> Everyone has been testing against the live site this whole time and it has been landing
> somewhere harmless *by accident of configuration, not by design*.
>
> After the swap, the live site writes to PROD. Checked 2026-08-06, there is no escape hatch:
>
> - **Preview deploys are not one.** `.github/workflows/deploy.yml` builds preview and production
>   from the *same* `secrets.NEXT_PUBLIC_SUPABASE_*`. Once those are swapped, every preview URL
>   points at PROD too.
> - **`.env.local` was the last one**, and the original instruction gave it away.
>
> The result would be zero safe environments, and every casual click writing to the database this
> plan went to real trouble to create clean. That directly contradicts the "Staging keeps 17 test
> firms" section below, whose whole argument is that stale test data on a production database
> destroys the reconciliation report's credibility on the day of the first real sale. Testing
> against PROD rebuilds that problem within a week, and cleanup is genuinely painful here — the
> `RESTRICT` foreign keys mean deleting a test user requires `training_events` → `firms` →
> `auth.users`, in that order.
>
> **So:** `.env.local` keeps STAGING credentials, and PROD gets its own gitignored `.env.prod`,
> named explicitly whenever something must target production:
>
> ```bash
> npx dotenv -e .env.prod -- node scripts/verify-cutover.mjs
> ```
>
> Targeting production becomes a deliberate act rather than the default. The original rationale
> ("local should represent production") does not survive contact with the fact that both projects
> carry an identical schema — staging already represents production structurally. The only
> difference is the data, which is exactly the thing that *should* differ.
>
> ⚠️ **The Phase 4 proof below is a deliberate exception.** The invite and quiz-pass test writes
> real rows to PROD, because that is the only thing that proves the Database Webhooks are wired.
> Decide before running it whether those rows get cleaned out afterwards or are documented as a
> known exception — do not leave it undecided.

Do not treat `wrangler.jsonc` as a replacement for the GitHub public build values: `NEXT_PUBLIC_*`
values are inlined by the Actions build. Similarly, `SUPABASE_URL` in the cert worker is a deployed
non-secret variable, not a Worker secret; update it together with that Worker’s secrets.

### 4. Deploy and prove the full path — Max and Rob

1. Dispatch the existing GitHub Actions production workflow from the verified `main` only. Do not
   build OpenNext on Windows and do not use a push as a production deployment. Record the Actions
   URL and deployed app version.
2. Confirm the live browser bundle contains `ttqthtzdjacrhjtrcmmy`, not the staging ref. Inspect the
   fetched JavaScript asset itself, not the deploy log or source tree.
3. Use a controlled test recipient to send a real invite. Prove delivery, the link reaches
   `/auth/callback`, the user can complete the authenticated redirect on the apex domain, and the
   relevant Auth and application rows appear in PROD rather than staging.
4. Complete a controlled quiz pass. Prove, in order: the PROD `cert_generation_queue` row is claimed
   and succeeds; a certificate row is written; and the expected PDF exists in the private PROD
   `certificates` bucket. This is the end-to-end certificate proof; a 200 from a Database Webhook is
   insufficient on its own.
5. Wait for the cert-worker five-minute cron (and observe the next daily cron or its Worker logs as
   practical). Confirm its request/logs and any queue handling use the PROD project ref, with no new
   writes in staging. Record the worker version and redacted log evidence.

### 5. Decision and rollback

Close Tier 1 only when every proof above is attached to the handoff and both webhook triggers, Auth
URLs, four credential locations and the rotated secret are independently checked. If any test fails,
stop Stripe work, restore the saved staging values in the same four locations, restore the prior
app/cert-worker versions using the established deployment path, and re-run the browser, invite and
certificate checks. Diagnose before trying again; do not retry a failed cutover blindly.

---

## Staging keeps 17 test firms, and that has a date attached

STAGING holds **17 firms (all `status='active'`, all carrying a `stripe_subscription_id`), 55
members, 58 auth users, 12 certificates, 13 quiz attempts**, newest 2026-07-30. They are sandbox
records — the price they were bought with is `livemode: false`.

They are harmless **only while they stay on staging**. The daily reconciliation job filters
`s.livemode === true`, so today `subs.length === 0`, `canCompareFirmsToStripe` is false, and the
firm-to-Stripe comparison is skipped entirely. That is why the job has been quiet.

The moment Stripe goes live **and the first real subscription is more than 15 minutes old**, that
flips true and all 17 firms report as *"access without payment"* — an operator alert claiming 17
discrepancies on the day of the first real sale. `workers/cert-worker/src/index.ts` says this report
must *"be believed on the day it finally says something."* Stale test data on a production database
would destroy exactly that.

**This is the strongest single argument for the clean-PROD path that was chosen**, and the reason
promoting staging in place would have required purging it first.

---

## `ix-prodseed` — the Phase 4 proof, seed then purge

**Decided 2026-08-07 (Max): the PROD test rows get PURGED after the proof, not kept and
documented.** The open question at the top of `session_handoff.md` is closed.

The reasoning is the section immediately above, applied to PROD. Stale test data destroys the daily
reconciliation report's credibility on the day of the first real sale — the exact trap the 17 staging
test firms represent, and the entire reason PROD was kept clean. "Documented as a known exception" is
a note in a file; the reconciliation job does not read files. It would report the discrepancy anyway,
on the one morning it most needs to be believed.

### Why this is a runbook and not a checklist item

PROD holds the `courses` row and the seeded questions and **nothing else** — no firms, no users.
There is no dashboard button that creates a firm. A firm exists only as the output of
`checkout.session.completed` reaching the provisioning webhook, so the certificate proof is a real
Stripe purchase, in that order, with nothing skippable. **None of it can start until the cutover is
finished** — every step writes to whichever database the deployed bundle is built against, so
running it early proves something about staging.

### The ordered seed sequence

Run only after §4 step 2 — the live browser bundle verified to contain `ttqthtzdjacrhjtrcmmy`.
Record the ids as you go; the purge needs the firm id and nothing else, but the rest is the evidence
log.

| # | Step | Where | What proves it worked |
|---:|---|---|---|
| 1 | Sandbox Stripe checkout against the live site, one seat | `iurixaccreditation.com/pricing` | Checkout completes; note the `cs_…` session id |
| 2 | Provisioning webhook creates the firm | PROD `firms`, `seats`, `firm_members` | A `firms` row exists with the `cus_…`/`sub_…` from step 1. **Note its id — this is the purge target.** |
| 3 | Firm admin sets a password from the onboarding redirect | PROD `auth.users` | Sign-in succeeds on the apex |
| 4 | Admin invites one employee | PROD `firm_members`, email | Invite arrives and the link lands on `/auth/callback`, not an error |
| 5 | Employee completes the training and passes the quiz | PROD `quiz_sessions`, `quiz_attempts`, `enrollments` | `quiz_attempts.passed = true`; **`question_ids` is populated** (migration 0024 — an empty column here means 0024 was never pushed to PROD). If `0025` shipped, also confirm `quiz_questions.lesson` is non-null on PROD. |
| 6 | Certificate generates | PROD `cert_generation_queue` → `certificates` → Storage | **A PDF exists in the private `certificates` bucket.** This is the proof; a 200 from a Database Webhook is not. |
| 7 | Cert-worker cron runs against PROD | Worker logs | Requests carry the PROD project ref; no new writes in staging |

> ✅ **Migrations `0024` and `0025` are both on PROD as of 2026-08-13 (Phase A).** This block was a
> 🔴 blocker until then; it is retained as a record, not as a gate. **Nothing here is outstanding.**
>
> | Migration | Staging | PROD | What it would have broken |
> |---|---|---|---|
> | `0024_quiz_sessions.sql` | ✅ applied 2026-08-07 | ✅ **applied 2026-08-13** | `/api/quiz/start` fails outright. The employee never reaches the quiz. |
> | `0025_quiz_lesson_classification.sql` | ✅ applied 2026-08-12 | ✅ **applied 2026-08-13** | **`/api/quiz/start` fails outright**, same as a missing `0024`. It adds TWO columns, not one: `quiz_questions.lesson` *and* `courses.questions_per_attempt`, which `lib/training/assessment.ts:301` selects on every quiz start. |
>
> **Verified against PROD 2026-08-14**, by selecting the columns themselves rather than trusting the
> migration ledger — the ledger says a file ran, the columns say the schema is actually there:
>
> - `quiz_sessions` present (0 rows) and `quiz_attempts.question_ids` present → `0024` real
> - `quiz_questions.lesson` present, 8 questions, distribution **L1=1, L2=1, L3=4, L4=0, L5=2**,
>   matching `.planning/QUESTION-POOL.md:53-158` — the backfill ran, not just the DDL
> - `courses.questions_per_attempt` = **8** on the single `courses` row
>   (`b7650c08-e036-4165-bbea-c75f0021f3ff`, "IURIX — Annual Certification", `pass_threshold` 80)
>
> `supabase migration list --linked` reads `0025 | 0025 | 0025`. **Note the CLI is now linked to
> PROD** (`supabase/.temp/project-ref` = `ttqthtzdjacrhjtrcmmy`), not staging as it was on 08-11 — any
> `supabase db push` from this repo now hits production until it is re-linked.
>
> **`0025` landed 2026-08-12 in `adb43f5`** (`ix-quizsubset`).
>
> ⚠️ **Historical note, still worth keeping:** `0025` was never optional on the grounds that
> stratification is currently a no-op. That reasoning is true of the `lesson` column and false of
> `courses.questions_per_attempt` — the selector reads the attempt size from `courses` on every start,
> so a PROD without `0025` would fail at step 5 even though the pool is 8 and no stratification
> occurs.

### The purge

`scripts/purge-prod-test-firm.mjs`. Dry-run by default; `--confirm` deletes. Both the project ref and
the firm id must be passed explicitly, and the script **refuses to run when the named ref disagrees
with the project the loaded env actually points at** — the guard `remove-avatars-bucket.mjs` does not
have, and the one that matters when two env files differ by three characters.

```bash
# 1. Dry run. Prints per-table row counts and touches nothing.
npx dotenv -e .env.prod -- node scripts/purge-prod-test-firm.mjs \
  --project-ref ttqthtzdjacrhjtrcmmy --firm <firm-id-from-step-2>

# 2. Read the counts. Then, and only then:
npx dotenv -e .env.prod -- node scripts/purge-prod-test-firm.mjs \
  --project-ref ttqthtzdjacrhjtrcmmy --firm <firm-id-from-step-2> --confirm
```

Deletion order is forced by two `RESTRICT` edges, and the script does it in this order for these
reasons:

1. **Storage objects first** — no FK ties Storage to the database, so deleting the rows first would
   orphan the PDFs with nothing left to find them by.
2. **`training_events`** — `training_events.firm_member_id → firm_members(id) ON DELETE RESTRICT`
   (0002) blocks the firms cascade from removing `firm_members`.
3. **`firms`** — cascades to `seats`, `firm_members`, `enrollments`, `quiz_attempts`, `certificates`,
   `cert_generation_queue` and `quiz_sessions`.
4. **`auth.users`** — `firms.owner_id → auth.users(id) ON DELETE RESTRICT` (0001) holds them until
   the firm is gone. A user who also belongs to another firm is skipped and reported.

Earlier notes give this as "`training_events` → `firms` → `auth.users`", which is correct but omits
Storage and omits why — which is how it gets "simplified" back into a failure.

**Not purged, deliberately.** The script prints these at the end rather than doing them:

- **The Stripe subscription and customer.** Cancel and delete in the Stripe dashboard. The script
  holds no Stripe credentials and must not acquire any.
- **`processed_stripe_events`.** Removing the checkout's event id would let a replayed webhook
  re-provision the firm that was just deleted.
- **`courses` / `quiz_questions`.** Real seeded content, not test data.

**Close the loop — corrected 2026-08-14.** This section previously read: *"re-run the daily
reconciliation and confirm it reports zero discrepancies. That — not the purge itself — is the thing
this decision was made to protect."* **That gate does not work, and would have been believed.**

🔴 **The reconciliation cannot verify the purge.** It reports clean whether or not the purge ran:

- `workers/cert-worker/src/index.ts:936` sets `canCompareFirmsToStripe = subs.length > 0`, and
  **suppresses directions 2 and 3 entirely when there are no live subscriptions.** Direction 1
  iterates `subs` and so is also a no-op. With an empty `subs`, the job does nothing at all.
- `subs` is filtered to `livemode === true` (`:888-895`), corroborated by
  `workers/cert-worker/wrangler.toml:24-26`: *"The job filters on each object's own `livemode` flag,
  so a sandbox key here produces silence rather than false alarms."*
- The seed purchase is a **sandbox** purchase. It never appears in `subs`. The test firm would
  therefore have been reported clean **while it still existed** — the reconciliation was never
  capable of seeing it.

This suppression is correct behaviour, not a bug: the comment at `:920-932` explains that without it
a sandbox key empties `subs` and direction 2 then reports *every active firm* as "access without
payment". It just means a clean reconciliation is **not evidence of anything** until live
subscriptions exist.

✅ **The real close condition: a direct read of every table the purge touched**, confirming each is
back to its pre-seed baseline. This is what was actually done on 2026-08-14, and it is the only
check that observes the purge rather than something correlated with it. All zero:
`firms`, `firm_members`, `seats`, `enrollments`, `quiz_sessions`, `quiz_attempts`, `certificates`,
`cert_generation_queue`, `training_events`, `auth.users`, and Storage objects under the firm prefix
— with `processed_stripe_events` **retained at 2** (deliberate) and `courses` + the 8 `quiz_questions`
**untouched**. Take a baseline read before step 1 so "back to baseline" is a comparison, not a guess.

The daily reconciliation is still worth watching as routine health, but it is **not the gate**.

**Executed 2026-08-14 (`ix-prodseed`).** Firm `07fb3282-a869-46c4-a7f6-c5cc9277231c` ("Prod test"),
purged with `--confirm`: 1 storage object, 18 `training_events`, then the firm cascade
(1 seat, 2 `firm_members`, 1 enrollment, 2 `quiz_attempts`, 1 certificate, 1 `cert_generation_queue`,
2 `quiz_sessions`), then 2 `auth.users`. Dry-run counts matched the live run exactly and matched an
independent read of the database. Evidence captured before deletion to
`/Users/maxlugo/Attorney training/phase-b-evidence-2026-08-14/` (outside the repo), including the
certificate PDF `IX-20260814-4129.pdf`. **This was the first `--confirm` run against any project.**

Previously verified 2026-08-07 by dry-running the script against a staging firm (`Ithica & Co`, 24
`training_events`, 4 members, 4 auth users, 1 enrollment, 1 seat) and against a deliberately
mismatched `--project-ref`, which refused.

**Executed again 2026-08-27 (Rob + terminal-Claude) — the live purchase, not a seed.** Firm
`d3eab4a9-f36d-4c73-ba2d-305426dee0f8` ("Katy Chavez Law"), created 2026-08-19 by a **real $37.54
card charge** on live Stripe, purged with `--confirm`. Dry run and live run matched exactly and
matched an independent read of the database: 0 storage objects, 0 `training_events`, then the firm
cascade of **1 seat, 1 firm_member, 1 firm**, then **1 auth.user**. Everything else was already
zero. Baseline was taken before step 1, per the rule above.

Close condition met — every table back to zero: `firms`, `firm_members`, `seats`, `enrollments`,
`quiz_sessions`, `quiz_attempts`, `certificates`, `cert_generation_queue`, `training_events`,
`auth.users`, Storage. `courses` (1) and `quiz_questions` (**58**) untouched.

> 📌 **`processed_stripe_events` went 7 → 8, and that is correct.** Cancelling the Stripe
> subscription immediately before the purge fired `customer.subscription.deleted`; the **live** prod
> webhook processed it two seconds later (`evt_1U99KS5md3Gcv1Z15goDQ6tO`), which is why the purge
> script read the firm as `status=cancelled` rather than `active`. Anyone re-checking this later
> should expect 8, not the 7 in the baseline. The row is retained deliberately — removing it would
> let a replayed webhook re-provision the firm.

**Order of operations that mattered:** cancel the Stripe subscription *first*, then purge. The
refund issued on 2026-08-19 had **not** cancelled the subscription — refunds and subscriptions are
separate objects — so it was still `active` and would have billed again on 2027-08-19. Purging the
firm without cancelling first would have left a live subscription with no firm behind it.
