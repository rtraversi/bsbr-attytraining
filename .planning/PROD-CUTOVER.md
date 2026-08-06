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
separate launch gate. Record only identifiers, timestamps, versions and redacted command output in
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
| 4 | **`.env.local` — Max** | Matching PROD URL, anon key, service-role key and local certificate secret | Local development no longer represents production; this is harmless to live traffic but essential for safe follow-up work. |

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
