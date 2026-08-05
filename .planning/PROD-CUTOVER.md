# PROD database cutover

**Written:** 2026-08-05 (Rob + Claude, terminal)
**Status:** IURIX PROD is schema-complete and seeded. **Nothing points at it yet** — production
still runs on IURIX STAGING. Three steps remain and two of them are Rob's.

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

**Migration history.** The MCP `apply_migration` tool records a **timestamp** version
(`20260805212209`), not the repo's `0001`. Left alone, a later `supabase db push` would treat every
migration as unapplied and try to replay them against a populated database, failing on the first
`CREATE TABLE`. The history table was rewritten to `0001`–`0022`, matching staging and the
filenames.

**Un-versioned objects.** The `certificates` bucket (private) and the `courses` row were created.
`0003`'s placeholder quiz seed was then run, since it is gated on a course existing.

---

## 🔴 `0023_remove_avatars.sql` cannot run

It is the only migration unapplied in **every** environment, and it fails:

```
ERROR: 42501: Direct deletion from storage tables is not allowed. Use the Storage API instead.
CONTEXT: PL/pgSQL function storage.protect_delete()
```

Supabase added a guard that blocks `delete from storage.objects` / `storage.buckets` in SQL. `0023`
does exactly that. **Whoever next runs `supabase db push` hits this**, and because it is DDL inside a
transaction, everything in the same batch rolls back with it.

It needs rewriting to drop the bucket through the Storage API rather than SQL. Until then it is
deliberately **not** recorded in PROD's migration history, matching staging, where it is also
unapplied.

---

## What remains

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
