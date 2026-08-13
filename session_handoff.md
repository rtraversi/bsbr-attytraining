# Session Handoff

**Date:** 2026-08-13
**Who:** Max, with terminal-Claude.

## Status in one paragraph

**The Tier 1 PROD cutover is DONE.** `iurixaccreditation.com` now runs against IURIX PROD
(`ttqthtzdjacrhjtrcmmy`). Migrations `0023`/`0024`/`0025` are on PROD, both Workers hold PROD
credentials and the rotated webhook secret, and the production deploy promoted `main` @ `936f048`
— six days of accumulated work, including the whole 08-07 batch. All four `verify-cutover.mjs`
checks pass, including the bundle check that had never been verifiable before tonight.
**Phase B (the ix-prodseed proof) has NOT started** and was deliberately not begun late; B1 is the
first step that writes real rows to PROD and should not be abandoned half-done. Nothing was
committed to `main` this session except this handoff.

---

## 🟢 THE FREEZE IS CLOSED

The rule at the top of the previous handoff — *"no `target: production` dispatch, no
`pnpm run deploy`"* — is **lifted and spent**. Max lifted it deliberately for this run.

The mismatch window opened 2026-08-06 21:07Z when Rob's two Actions secrets moved to PROD while
the deployed bundle still carried staging. **It closed 2026-08-13 20:45:04Z** when run
`31742229934` deployed a bundle built from those same secrets. Bundle and Actions secrets now
agree, proven by fetched browser assets rather than by deploy logs.

The five items that had been **committed-not-deployed since 2026-08-07** are now **shipped**:
`ix-quizforge`, `ix-maybesingle`, `ix-lessoncounter`, `ix-cookiesecure`, `ix-typesregen`.
Plus `ix-quizsubset` (`0025`). Their board rows still say otherwise — see Next steps.

> ⚠️ **The safe-place-to-click rule now matters more, not less.** The live site and every preview
> URL write to PROD. `localhost:3000` via `.env.local` (still staging, deliberately untouched) is
> the only place to click around freely.

---

## What was done — Phase A, all five steps

### A1 — migrations to PROD

PROD remote was at `0022`. **Three** migrations were pending, not two: `0023` was also unapplied.
`0023_remove_avatars.sql` is a genuine no-op (`select 1;`) — the destructive bucket removal lives
in `scripts/remove-avatars-bucket.mjs` and **must not be re-run**. It cannot be skipped without
leaving a permanent hole in the history table, so it went with the other two.

```
supabase migration list --linked   ->   0023 | 0023 | 0023
                                        0024 | 0024 | 0024
                                        0025 | 0025 | 0025
```

Proven on PROD by direct service-role query, not inferred from the push output:

| Object | State on PROD |
|---|---|
| `courses.questions_per_attempt` | exists, `= 8` (course `b7650c08-e036-4165-bbea-c75f0021f3ff`, `pass_threshold=80`) |
| `quiz_questions.lesson` | exists, **8/8 non-null** |
| lesson backfill | **L1=1 L2=1 L3=4 L4=0 L5=2** — matches staging and `QUESTION-POOL.md:53-158` |
| `quiz_sessions` | table exists and is queryable |
| `quiz_attempts.question_ids` | column exists |

The CLI is now **linked to PROD**, not staging. Anyone running `supabase db push` in this repo
hits production until it is re-linked.

### A2/A3 — secrets, and the one that was actually wrong

Four app-Worker secrets and three cert-worker secrets set. Every name already existed — all
overwrites, nothing created, nothing deleted. App Worker's own `WEBHOOK_SECRET` is read by no code
in `app/` and was left alone rather than deleted.

**`.env.prod`'s `CERT_WEBHOOK_SECRET` was byte-identical to `.env.local`'s staging value** (same
length, same SHA-256 prefix `09f840b4`). So `.env.prod` never held the rotated PROD secret, and
sourcing it from there would have failed at B6 looking like a broken webhook. The canonical value
was read from the **`Cert-queue-generate` trigger header** instead and both Workers aligned to it
from one paste — trigger first, Workers second, so there was never a window where the two Workers
agreed with each other but not with the thing that calls them.

`CERT_WEBHOOK_SECRET` has **three** holders, only two of which are Worker secrets:

| # | Holder | Role |
|---|---|---|
| 1 | App Worker | validates inbound on `/api/certs/generate:31` **and** `/api/certs/drain:10`; also *sends* it at `drain:42` and `quiz/attempt:115` |
| 2 | Cert-worker | sends outbound to `/api/certs/drain` on the 5-min cron |
| 3 | **PROD webhook `Cert-queue-generate`** | trigger header → `POST /api/certs/generate`. **No Worker command touches this one.** |

The header was re-copied independently and came to 71 chars both times, ruling out a truncated
paste. 71 is expected — that secret was hand-edited, not generated base64.

**cert-worker deployed:** `9cdf442e-5f08-4611-95b9-cff892ff2b5a` (was `c86ca17e`, 08-05T13:26Z),
via `cd workers/cert-worker && wrangler deploy --config wrangler.toml`. The deploy's own binding
output confirms `env.SUPABASE_URL = https://ttqthtzdjacrhjtrcmmy.supabase.co`. **Until this deploy
the live cert-worker was still writing to staging** — `wrangler.toml` had carried the PROD URL
since `09f21b3` (08-06 18:51Z) but the deployed version predated it, and a deployed var only moves
on redeploy.

Auth proven both directions: wrong secret → **401**; trigger-header secret → **200**.

### A4 — production deploy

| | |
|---|---|
| Actions run | **https://github.com/rtraversi/bsbr-attytraining/actions/runs/31742229934** |
| Ref / SHA | `main` @ `936f048`, clean and synced |
| Deployed app version | **`b0e62a6f-c0e8-4a65-89a4-834e181d3be9`** @ 2026-08-13T20:45:04Z |
| Previous | `c83957c6` @ 2026-08-06T17:18Z, built from `dbb52ab`-era code |
| Result | every step green, incl. Windows-path assert and the `/`, `/pricing`, `/login` smoke test |

**A4 does not "promote" a staged version — it builds a new one.** Version `2355f8ed` (20:36:21Z)
was the one carrying the freshly-pasted secrets; the deploy created `b0e62a6f` (20:45:04Z) from
source and activated that instead. Whether the new version inherited `2355f8ed`'s bindings or the
old deployed version's was a real open risk: had it inherited the old ones, PROD would have served
a PROD browser bundle from a server still holding staging credentials — and **neither the A5
bundle check nor `/api/health` would have caught it**, because the bundle's values come from
GitHub Actions secrets and `db=ok` is just as true against staging. Confirmed good by probe (below).

### A5 — verification

```
PASS | Live browser bundle ref     Found only PROD ref ttqthtzdjacrhjtrcmmy in fetched browser chunks.
PASS | Secret rejection            POST /api/certs/generate with a wrong secret returned 401.
PASS | Health + DB reachability    /api/health -> 200, status="ok", db="ok".
PASS | Direct PROD reachability    Connected to PROD; listBuckets() included certificates.
```

**Two extra proofs beyond the runbook:**

1. **The anon key's project, proven empirically.** The bundle check proves the *URL* ref is PROD but
   says nothing about the anon key — a PROD URL paired with a staging anon key passes it and then
   fails at sign-in. The live bundle ships `sb_publishable_gOkxoiE…` (46 chars, matching
   `PROD-CUTOVER.md:136` exactly). The new `sb_publishable_*` format embeds no ref, so it was tested
   directly against both projects:
   ```
   PROD    (ttqthtzdjacrhjtrcmmy) accepts it -> HTTP 200
   STAGING (ndmzvtuywcufvkxtkjhg) accepts it -> HTTP 401
   ```
2. **The deployed Worker holds the rotated secret.** `POST /api/certs/generate` with the real secret
   and a non-`INSERT` payload → **200 `{"ok":true}`**. This is what closes the `b0e62a6f`
   inheritance risk above. Safe by construction: `generate/route.ts:43` returns before
   `createAdminClient()` on line 48, so no queue row is claimed and nothing is written.
   `/api/certs/drain` was deliberately **not** probed — it has no payload guard after its auth check
   and would begin real queue work.

---

## Status

| Thing | State |
|---|---|
| PROD schema | ✅ through `0025` |
| App Worker | ✅ `b0e62a6f`, PROD creds, rotated secret confirmed live |
| Cert-worker | ✅ `9cdf442e`, PROD `SUPABASE_URL`, auth proven both directions |
| Live bundle | ✅ PROD ref **and** PROD anon key |
| Phase B proof | ❌ **not started** — no firms, no users, no certs on PROD |
| Purge (`--confirm`) | ❌ never run against any project, still true |
| Stripe live mode | ❌ unchanged; `ix-stripeaudit` remains a separate launch gate |
| PROD test data | none yet — PROD still holds only the `courses` row and 8 seeded questions |

**Blast radius carried by this deploy**, worth knowing before B: 16 files, +1428/−336 between
`dbb52ab` and `936f048`. The concentration is exactly where B5 goes —
`lib/training/assessment.ts` (+653, new), `app/api/quiz/start` (new), `quiz/attempt` (rewritten),
plus `middleware.ts`, `lib/supabase/cookie-options.ts` (+186, `ix-cookiesecure`) and
`lib/supabase/client.ts` on the sign-in path B3/B4 exercise. The smoke test only covered `/`,
`/pricing`, `/login`. **Phase B is the first real exercise of this deploy.**

---

## Next steps

1. **Phase B, with a proper block of time.** `.planning/PROD-CUTOVER.md:345`. Identities are
   `YOURNAME+iurixadmin@gmail.com` (firm admin) and `YOURNAME+iurixemp@gmail.com` (employee).
   B1 is a sandbox Stripe checkout at `iurixaccreditation.com/pricing`, **one seat**.
   **Record the firm id at B2 — it is the only id the purge needs.**
2. **Then Phase C:** purge dry-run → GATE 4 → `--confirm` → cancel Stripe objects by hand → re-run
   the daily reconciliation and confirm **zero discrepancies**. That reconciliation, not the purge,
   is the close condition for `ix-prodseed`.
3. **Board rows are now stale in the good direction.** These need updating to match reality, with
   `items/<id>.md` files alongside: `ix-prodcutover` (A-phase done, B/C outstanding),
   `ix-prodseed` (unblocked, not started), `ix-webhooksecret`, and the five that shipped tonight —
   `ix-quizforge`, `ix-quizsubset`, `ix-typesregen`, `ix-maybesingle`, `ix-lessoncounter`,
   `ix-cookiesecure`. **Do not republish the artifact — desktop does that.**
4. **Re-link the Supabase CLI to staging** when PROD work is finished, or leave it and remember.

---

## Open questions

1. **`.env.prod`'s `CERT_WEBHOOK_SECRET` may be stale again.** Tonight's canonical value is the
   `Cert-queue-generate` trigger header, and `.env.prod` was edited *before* that was settled.
   Anything run as `dotenv -e .env.prod` uses whatever is in that file. It does not affect the
   deployed Workers — they were set from the trigger header directly — but a local script talking
   to `/api/certs/*` would get a 401 that means nothing.
2. **`app/api/invite/route.ts` reports a broken invite as delivered.** Line 103 `console.error`s a
   `generateLink` failure and continues; line 117 renders the email with `actionLink ?? ''`; line
   115 has already set `emailSent = true`, and line 137 returns it. **A failed link generation
   produces an email with an empty link and a success response.** Line 114's own comment says a
   `console.error` nobody reads is not a record — that lesson was applied to `sendEmail` failures
   but not to this one. **Post-cutover fix, not now** — but if B4's invite arrives with a dead
   link, this is the first place to look.
3. **`workers/cert-worker/wrangler.toml` `[env.staging]` has empty `SUPABASE_URL`/`APP_URL`.**
   Harmless unless someone deploys `--env staging`, which would produce a Worker pointed at
   nothing. Note that plain `wrangler deploy` in that directory is *also* wrong for a different
   reason — it picks up the root `wrangler.jsonc` and redeploys the main app. The only correct
   form is `wrangler deploy --config wrangler.toml`.
4. **The Stripe test subscription and customer must be cancelled by hand at C3.** The purge script
   holds no Stripe credentials and must not acquire any. `processed_stripe_events` stays —
   removing the checkout's event id would let a replayed webhook re-provision the deleted firm.
5. **🔴 Verify BEFORE B6 which trigger actually produces the certificate.** The cert-worker's
   `fetch` handler still has `// TODO: implement full cert generation pipeline` at
   `src/index.ts:1072` — after auth it validates payload shape and returns 200, and there is **no
   code path in it that writes a certificate at all**. So `Cert-worker-quiz-pass` looks like a
   no-op stub, and the live cert path appears to be `Cert-queue-generate` → app
   `/api/certs/generate` (which does have the real pipeline: claim, idempotency, `pdf-lib`,
   Storage upload, `certificates` insert, Resend).
   `PROD-CUTOVER.md:186` already says this handler is "currently known to be inert" and to retain
   it without claiming it generated the certificate. **Confirm this before B6, or a missing
   certificate will be misread as a broken cutover when the real question is which trigger was
   ever supposed to produce it.**

---

## Operational facts worth not rediscovering

- **App Worker secrets need `wrangler versions secret put`, not `wrangler secret put`.** The plain
  form errors on this Worker because *latest* != *deployed*. Those writes create an unactivated
  version; they only go live on the next deploy — which is convenient sequencing, but it also means
  **a secret set on the app Worker cannot be probed against production until after a deploy.**
  Probing early returns a 401 that means nothing.
- **Cloudflare secret writes take several seconds to propagate.** An immediate probe after
  `secret put` gives a **false 401**. Tonight one such 401 was real and one was a race; wait a few
  seconds and re-probe before concluding a mismatch.
- **Never infer deploy state from timing or commit history.** The cert-worker's staging/PROD URL
  question was settled by reading `wrangler deploy`'s binding output and comparing deployed version
  timestamps against `git log`, not by assuming a commit had shipped.
- **PROD's two webhook triggers are named with a capital C** (`Cert-queue-generate`,
  `Cert-worker-quiz-pass`) where staging uses lowercase. Deliberate, harmless, documented. Do not
  "fix" it.
