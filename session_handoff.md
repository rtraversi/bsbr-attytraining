# Session Handoff

**Date:** 2026-08-06 (wrap-up)
**Who:** Max, with **desktop-Claude**, **terminal-Claude** and **Codex** — four contributors, one
git identity. Every commit says "Max Lugo"; attribution below comes from commit trailers and timing,
not from the author field.

## Status in one paragraph

**Tier 0 is closed — all four items.** **Tier 1 is half done and deliberately stopped.** Max
completed the entire Supabase side of the PROD cutover: Database Webhooks enabled, both triggers
recreated, Auth URLs set, shared secret rotated. The cert-worker's config now names PROD but **has
not been deployed**. Production still runs against **IURIX STAGING** and will keep doing so until
the window below runs start to finish. Nothing was deployed today after `dbb52ab`.

---

## 🔴 The one rule the next session must not break

**Between the moment Rob sets the two GitHub Actions secrets and the moment both Workers' secrets
move, no production deploy may happen.**

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are **inlined into the browser bundle
at build time**. A production build dispatched in that gap ships a bundle that talks to **PROD**
while every server-side read still uses the **staging** service-role key. Sign-in, invites and the
dashboard would then be split across two databases.

**CI stays green through all of it.** The workflow's smoke tests hit `/`, `/pricing` and `/login` —
all of which render fine against either project. There is no check anywhere that the browser bundle
and the server agree. That is why this is written at the top of the file rather than in a step list.

Two consequences worth stating plainly:

- **Do not dispatch `target: production` for any reason** — not for an unrelated fix, not to "test
  the pipeline" — until the whole four-location swap is done. Pushes are safe: `deploy.yml` builds a
  **preview** on push and reserves production for a manual dispatch (verified in the workflow header).
- **Preview URLs stop being a sandbox the instant Rob's secrets change.** `deploy.yml` builds preview
  and production from the same `secrets.NEXT_PUBLIC_SUPABASE_*`, so previews will point at PROD too.
  After that, `localhost:3000` is the only safe place to click. See the testing rule below.

---

## Tier 0 — closed, all four verified against the repo

| Item | Evidence | Verified how |
|---|---|---|
| `ix-mig0023` | `3fe0ca4` | Migration `0023` is an intentional no-op; the destructive bucket removal lives in `scripts/remove-avatars-bucket.mjs` via the Storage API. Run against staging; PROD never had the bucket. |
| `ix-refundnonus` | `c23192b` | The non-US cancellation email no longer promises a refund already in motion; the operator alert says a human must issue it. |
| `ix-lookupkey` | `dbb52ab`, deployed by Actions run [`31122263372`](https://github.com/rtraversi/bsbr-attytraining/actions/runs/31122263372) | Re-checked today with `gh run view`: **`conclusion: success`**. Checkout resolves the seat Price by `per_seat_annual`; live mode fails closed. |
| `ix-www522` | Cloudflare Redirect Rule (dashboard, no commit) | Re-checked today with `curl`: `https://www.iurixaccreditation.com/pricing?redirect-check=1` → **301** → `https://iurixaccreditation.com/pricing?redirect-check=1`, query preserved. Apex `/login` → **200**. |

`dbb52ab` remains the deployed application commit. Everything on `main` after it is documentation,
the cert-worker config change, and the verifier — none of it needs a production deploy, and per the
rule above none of it may get one yet.

---

## Tier 1 — what actually landed today

### Done — Max, in the Supabase dashboard (IURIX PROD `ttqthtzdjacrhjtrcmmy`)

1. **Database Webhooks enabled** — PROD previously had no `supabase_functions` schema and no
   `pg_net`, so the triggers could not exist at all.
2. **Both triggers recreated.** PROD now reports **4** non-internal `public`-schema triggers,
   matching staging on table and event: `cert_generation_queue` ×2 (webhook +
   `trg_cert_queue_updated_at`), `firm_members` (`trg_sync_used_seats`), `quiz_attempts` (webhook).
3. **Auth → URL Configuration** — Site URL and the `/auth/callback` redirect allowlist set to the
   apex.
4. **Shared secret rotated** to a fresh PROD-only value, placed in both PROD webhook headers.

Two details recorded in `.planning/PROD-CUTOVER.md` (`3fefbf5`) that will otherwise cost someone an
afternoon:

- PROD's webhook triggers are named with a **capital C** (`Cert-queue-generate`,
  `Cert-worker-quiz-pass`); staging's are lowercase. The name is a label — nothing references it, and
  the webhook fires on table + event. A future schema diff **will** flag this. It is not a difference.
- A `pg_trigger` comparison **must** filter `n.nspname = 'public'`. Unfiltered it returns Supabase's
  own storage and realtime triggers — 9 rows, not 4 — which is exactly how the count in that
  document's own table gets misread. The query is in the file.

### Done — terminal-Claude, code side

`09f21b3` points `workers/cert-worker/wrangler.toml`'s `SUPABASE_URL` at PROD and replaces the
comment that had read "fill in before first deploy" since the worker's first deploy.

**It was deliberately not deployed.** `SUPABASE_URL` is a deployed var, so it only takes effect on
`wrangler deploy`. Shipping it now would point the `*/5` queue drain and the 09:00 daily crons at a
database nothing else is using — and nothing would error, because both projects carry an identical
schema.

**The full ordered `wrangler secret put` sequence for both Workers is in that commit's message.**
It is there rather than here so it cannot drift from the change it belongs to. Read it before the
window; it includes the inventory step, which Worker takes which secret, and the `--config` flag
that stops `wrangler deploy` from walking up and redeploying the main app instead.

### Done — Codex

`6036dd0` adds the read-only cutover verifier: `scripts/verify-cutover.mjs`,
`scripts/verify-cutover-helpers.mjs`, `tests/verify-cutover.test.ts`. It checks the live browser
bundle's project ref, webhook-secret rejection (401 on a wrong secret, never a valid one), `/api/health`,
and direct PROD reachability. It distinguishes **INCONCLUSIVE** from **FAIL** in both output and exit
code — `2` means nothing failed but something could not be observed. Absence of evidence is never
reported as a pass. Run it with `npx dotenv -e .env.prod -- node scripts/verify-cutover.mjs`.

### Blocked — Rob

**Two GitHub Actions repo secrets**, and nothing else:

```
NEXT_PUBLIC_SUPABASE_URL       https://ttqthtzdjacrhjtrcmmy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  the PROD anon key, from the PROD dashboard
```

Nothing wrangler can do substitutes for these. They are the browser bundle.

### Remaining order once Rob confirms

1. Rob sets the two Actions secrets.
2. Max sets app Worker secrets, then cert-worker secrets (commands: `09f21b3`).
3. `cd workers/cert-worker && wrangler deploy --config wrangler.toml` — the flag is mandatory.
4. Production deploy **via Actions dispatch only**, `target: production`.
5. `scripts/verify-cutover.mjs`, then the end-to-end certificate proof — which needs `ix-prodseed`
   resolved first (below).

---

## The testing rule — new today, and it applies to Claude and Codex too

**`.planning/DEV-SANDBOX.md` (`8296855`, `0ad925c`). Test at `localhost:3000`. Do not test on
`iurixaccreditation.com`.**

| File | Points at | Used by |
|---|---|---|
| `.env.local` | **STAGING** `ndmzvtuywcufvkxtkjhg` | `next dev`, `pnpm test`, anything not naming an env file |
| `.env.prod` | **PROD** `ttqthtzdjacrhjtrcmmy` | only commands that name it explicitly |

Verified at wrap-up: `.env.local` → staging, `.env.prod` → PROD, and `git ls-files` shows **zero**
tracked `.env` files. `.gitignore` now covers `.env*` with a `!.env.example` exception rather than
naming `.env.local`, which would have allowed `.env.prod` — holding the **PROD service-role key** —
to be committed.

**This reverses location 4 of `PROD-CUTOVER.md`'s original credential-swap table**, which said to
point `.env.local` at PROD so local dev "represents production." Following it would have left zero
safe environments: the live site writes to PROD after the cutover, previews build from the same
secrets, and `.env.local` was the last one. The reasoning is in `8296855` and in `DEV-SANDBOX.md`.

`pnpm test` is `dotenv -e .env.local -- vitest run`, so the suite — including `rls-isolation`, which
seeds and tears down real rows — runs against **staging**. Confirm that before running it after any
env change.

> Minor, unrecorded elsewhere: a third file `.env.production` exists (51 bytes, `NEXT_PUBLIC_APP_URL=`
> and nothing else). `DEV-SANDBOX.md` describes two files. It is gitignored and holds no credentials,
> but Next.js loads it during production builds, so someone should decide whether it stays.

---

## Findings added to the board today

Three from desktop-Claude (`0ad925c`), plus two corrections found while verifying them for this
handoff.

### `ix-questionpool` — reframed, and the reframing is right

The 8 seeded questions are **not** junk: `PLACEHOLDER` lives in `section_tag`, not in the question
text (`supabase/migrations/0003_quiz_questions.sql`). They are real Rule 5.3 items across 8 distinct
topics. The ask is **review and expand**, not write from scratch. The real problem is size: 80%
threshold, pool of 8, every question shown, unlimited retakes — fail once and you have seen the whole
exam. Verified: exactly 8 seeded questions.

### 🔴 `ix-quizsubset` — the board's text is **wrong on its central claim**

The board says *"THERE IS NO RANDOM SUBSET SELECTION ANYWHERE IN THE CODE."* There is:

```
app/dashboard/training/page.tsx:16   const QUESTIONS_PER_ATTEMPT = 8
app/dashboard/training/page.tsx:18   function shuffleArray<T>(...)
app/dashboard/training/page.tsx:198  const questions = shuffleArray(allQuestions).slice(0, QUESTIONS_PER_ATTEMPT)
```

It runs in the async Server Component, so unselected questions never reach the client. The item's
*conclusions* survive, for better reasons than the one given:

- The size is a **hardcoded module constant**, not config. `courses` has no `questions_per_attempt`
  column — that part was correct.
- Pool (8) **equals** attempt size (8), so the slice selects nothing today. It only randomises order.
  Grow the pool to 32 and this line starts working immediately — which is the opposite of what the
  board predicts.
- Nothing records **which** questions an attempt served. `quiz_attempts` has `answers jsonb` and no
  question-set column, so a score cannot be audited against the exam that produced it.

**Correct the board text before anyone plans work off it** — via the archive ritual (parse the `SEED`
array under Node before publishing), not as a drive-by edit.

### 🔴 New, and more serious than either: the quiz can be passed with one answer

`app/api/quiz/attempt/route.ts` grades **whatever the client submits**:

```
:96   const questionIds = answers.map(a => a.questionId)
:105  .in('id', questionIds)
:125  const score = (correct / questions.length) * 100
```

The denominator is the number of **submitted** questions, not `QUESTIONS_PER_ATTEMPT`. Validation
(`:51`, `:63`) rejects only an empty array. So a POST carrying a single question the caller knows the
answer to scores **100** and issues a real certificate. It is authenticated and seat-gated (`:74`),
so this is an enrolled employee self-certifying — which is precisely the failure a Rule 5.3
supervision product exists to prevent.

**Not fixed** — this is a wrap-up session. It belongs with `ix-quizsubset`: the server has to choose
the question set, store it on the attempt, and grade against the stored set. Doing the subset work
without this leaves the hole open.

### `ix-prodseed` — Phase 4's proof is longer than the plan implies

PROD holds the `courses` row and the seeded questions and **nothing else** — no firms, no users. A
firm only comes into existence through Stripe checkout → the provisioning webhook, so the end-to-end
proof needs a **sandbox Stripe purchase against PROD first**, then password set, then invite, then
quiz. Decide **before** the window whether those rows get cleaned out afterwards — `RESTRICT` foreign
keys force `training_events` → `firms` → `auth.users`, in that order — or are documented as a known
exception. `DEV-SANDBOX.md` calls this the one deliberate exception to the localhost rule.

---

## Verification run at wrap-up

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | **pass**, exit 0, no output |
| `pnpm exec eslint .` | **pass** — 4 problems, **0 errors**, 4 warnings, all pre-existing `no-img-element` in `closing-cta.tsx`, `hero-section.tsx`, `iurix-lockup.tsx` ×2 |
| `pnpm test` | **pass** — 6 files, **51 tests**, 5.66s |
| `git status` | clean |
| `main` vs `origin/main` | identical (`0ad925c` before this handoff commit) |
| Actions `31122263372` | `conclusion: success` |
| `www` → apex | 301, query preserved |

Nothing failed. Nothing was repaired.

---

## Next steps

1. **Wait for Rob.** Two Actions secrets. Re-read the rule at the top of this file before anything
   else moves.
2. **Resolve `ix-prodseed` before opening the cutover window**, not during it — the Phase 4 proof
   needs a firm on PROD and creating one is a Stripe purchase, not a dashboard click.
3. **Correct the `ix-quizsubset` board text**, then plan `ix-quizsubset` + `ix-questionpool` +
   the grading hole as one piece of work. They are not three items.
4. Still open from earlier sessions and unaddressed today: the duplicate-purchase refund wording
   (`emails/checkout-email-in-use.tsx:75`, `app/api/webhooks/stripe/route.ts:670`) — same shape as
   `c23192b`, still live — and `oxc: { jsx: 'automatic' }` in `vitest.config.ts`, without which no
   email template can be tested at all.

## Open questions

- **Who decides the PROD test rows?** `ix-prodseed` needs an answer before the window: purge after
  the proof, or keep and document. Leaving it undecided is how the 17 staging test firms happened.
- **The Stripe Product is still named "AI Staff Compliance Training — Annual Certification"** on
  hosted Checkout, invoices and receipts. Dashboard change, not code. `ix-stripeaudit`.
- **Does `.env.production` stay?** Undocumented third env file, harmless today.

## Safety rules still in force

- Production deploys: **GitHub Actions dispatch only**. Never `pnpm run deploy`. Never a push.
- Do not build OpenNext/Cloudflare artifacts on native Windows.
- Stripe remains sandbox. Sandbox confirmation is never live-money proof.
- Never enable Cloudflare Email Routing on the apex; Zoho owns apex MX.
- `scripts/remove-avatars-bucket.mjs` is destructive; PROD never had the bucket and it must not be
  run as part of this cutover.

---

## Closing note — 2026-08-06, after the handoff above was written

Three things landed after this document was rewritten. It is otherwise current.

1. **`ix-quizforge` is on the board** as a critical, unfixed item — the quiz self-certification
   hole terminal found. Desktop verified it independently against the code before recording it.
   It blocks launch on its own terms, separately from `ix-stripeaudit`.
2. **`ix-quizsubset` was corrected.** Its original claim ("no random subset selection anywhere")
   was false — `shuffleArray(...).slice(0, QUESTIONS_PER_ATTEMPT)` is at
   `app/dashboard/training/page.tsx:198`. The conclusion inverted with it: a bigger pool makes the
   existing slice start working, rather than showing every candidate every question.
3. **Board reconciled and republished.** 69 live, 81 archived. Zero done items left on the live
   board. Two smaller findings folded in: `0023` points twice at a `.ts` script that is actually
   `.mjs` (now in `ix-cicleanup`), and a third env file `.env.production` exists (documented in
   `.planning/DEV-SANDBOX.md`).

**Start the next session from the board**, not from this file:
https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075
