# Session Handoff

**Date:** 2026-08-07 (wrap-up)
**Who:** Max, with terminal-Claude.

## Status in one paragraph

**`ix-quizforge` is fixed.** The certification quiz can no longer be passed with a single answer:
the server now chooses the question set, records it, and grades against its own record. That is the
whole of today's code work — migration `0024`, a new `/api/quiz/start` route, a rewritten
`/api/quiz/attempt`, the client reworked to match, and a 20-test suite. **`ix-prodseed` is decided
and prepared but not executed.** Nothing was deployed. The cutover freeze below is still in force and
was not touched.

---

## 🔴 The rule that is still not broken — and must not be

Rob set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as GitHub Actions secrets at
**2026-08-06 21:07Z**. The mismatch window is therefore **OPEN**.

- **Do not dispatch the deploy workflow with `target: production`, for any reason.** Not for an
  unrelated fix, not to test the pipeline.
- **Do not run `pnpm run deploy`.**
- **Preview URLs are no longer a sandbox.** `deploy.yml` builds preview and production from the same
  `secrets.NEXT_PUBLIC_SUPABASE_*`, so previews now point at PROD too. `localhost:3000` (which reads
  `.env.local` → staging `ndmzvtuywcufvkxtkjhg`) is the only safe place to click.
- Pushing to `main` remains safe — it builds a preview only. Committing is expected.

`NEXT_PUBLIC_SUPABASE_*` are inlined into the browser bundle at build time. A production build in
this gap ships a bundle talking to **PROD** while every server-side read still uses the **staging**
service-role key. CI stays green through all of it — the smoke tests hit `/`, `/pricing` and
`/login`, which render fine against either project.

**Everything below is committed, not deployed. That is intentional.**

---

## Task 1 — `ix-quizforge`: the quiz could be passed with one answer

### What was wrong

`app/api/quiz/attempt/route.ts` took the question ids **out of the request body** (`:96`), loaded
exactly those (`:105`), and computed `correct / questions.length` (`:125`). The denominator was the
number of **submitted** questions. A POST carrying one question the caller knew scored **100**,
flipped the enrollment to `passed`, and enqueued a real certificate. Authenticated and seat-gated —
so this was an enrolled employee self-certifying, the precise failure a Rule 5.3 supervision product
exists to prevent.

### Why the obvious fix was rejected

Clamping the denominator to `QUESTIONS_PER_ATTEMPT` looks sufficient only because the pool is 8
today and the attempt size is also 8, so the slice selects nothing. `ix-questionpool` grows the pool
to ~32, at which point a caller cherry-picks the 8 they know and submits a perfect 8-of-8. The set
has to be **chosen by the server, recorded, and graded against the recording.**

### What landed

| File | Change |
|---|---|
| `supabase/migrations/0024_quiz_sessions.sql` | **New** `quiz_sessions` table (`user_id`, `firm_id`, `course_id`, `question_ids uuid[]`, `issued_at`, `expires_at`, `consumed_at`), RLS on with no policies — service-role only, matching `quiz_questions` (0003) and `verification_rate_limit` (0020). Adds `quiz_attempts.question_ids uuid[]`, nullable and **not** backfilled. |
| `lib/training/assessment.ts` | **New.** `QUESTIONS_PER_ATTEMPT`, `QUIZ_SESSION_TTL_MS` (4h) and `shuffleArray` moved here from `app/dashboard/training/page.tsx:16-25`. Holds `gradeAnswers` and `checkSessionUsable` (pure) plus `startQuizSession` and `recordQuizAttempt` (DB). |
| `app/api/quiz/start/route.ts` | **New.** Auth → `firm_id` → the same `fetchSeatAccess`/`hasTrainingAccess` gate the attempt route uses, **before any write**. Mints a session, returns `{ sessionId, questions, expiresAt }` with no `correct_index`. |
| `app/api/quiz/attempt/route.ts` | Takes `sessionId` instead of client question ids. Rejects missing (404), wrong owner/firm/course (403), consumed (409), expired (410). |
| `app/dashboard/training/page.tsx` | No longer selects questions or fetches `quiz_questions` at all — one fewer DB round-trip. |
| `app/dashboard/training/_components/quiz-component.tsx` | Calls `/api/quiz/start` on mount (the reveal gate) and submits `sessionId`. Owns the retake lifecycle. |
| `app/dashboard/training/_components/training-client.tsx` | `questions` prop and the `attemptKey` remount both gone. |

**Everything specified as preserved was preserved:** the enrollment get-or-create still orders by
`enrolled_at` (not `created_at`), the already-passed idempotency short-circuit, both `training_events`
inserts, the `cert_generation_queue` insert and the `after()` call to `/api/certs/generate`. The
`after()` call stays in the route — `after()` only exists in a Next request scope, which is also why
the DB logic moved to `lib/` where tests can drive it.

### Three decisions worth knowing about

1. **The logic lives in `lib/training/assessment.ts`, not in the routes.** The routes can only be
   exercised through Next's request plumbing (`cookies()`, `after()`), which does not exist under
   vitest. With the logic in `lib/`, the tests drive the **real** code against real staging rows
   rather than a re-implementation of the grading rule.
2. **The session is claimed with a conditional UPDATE** (`.is('consumed_at', null)`), not
   read-then-write, so two concurrent submissions of the same session cannot both be graded. It runs
   **before** any write, so the failure direction is a burned session (retake with a fresh one)
   rather than a session gradeable twice.
3. **`/api/quiz/start` reuses an open session rather than minting a new one.** Not asked for, but
   without it the endpoint is a reroll button: with a pool larger than the attempt size a learner
   could call it until the eight questions they know come up — the same attack in a different shape.
   It reuses only when *every* question still resolves, so an operator retiring a question mid-session
   cannot leave an honest learner unable to score 100.

### Tests — `tests/quiz-session.test.ts`, 20 tests

Every case asked for, plus five more:

- one answer against an 8-question session scores **12.5**, not 100 — and the enrollment stays
  `in_progress`
- a submission containing question ids from **another course**, all answered correctly, still scores
  12.5 — they neither score nor shrink the denominator
- a consumed session is rejected (409), an expired one (410), another user's (403) — *and the
  borrowed session survives unconsumed*, so a thief cannot burn someone else's exam
- a session for a different course is rejected (403)
- a genuine 8/8 passes, flips the enrollment, writes `cert_generation_queue`, consumes the session,
  and records `question_ids` on the attempt
- pure-function coverage: empty submission scores 0 rather than dividing by zero; duplicate answers
  resolve to the first, so spraying every index at one question gains nothing

The seeded pool is **12**, deliberately larger than `QUESTIONS_PER_ATTEMPT`, so the slice is real
rather than a no-op. Teardown was verified: zero leftover firms, courses or `quiz_sessions` rows on
staging afterwards.

### ⚠️ Migration 0024 was pushed to STAGING

`supabase db push --linked` was run against `ndmzvtuywcufvkxtkjhg` (the linked project). It applied
**`0023` and `0024`** — `0023` was not recorded as applied on staging and is `select 1;`, a genuine
no-op. Additive DDL only, nothing dropped.

**PROD does not have 0024 yet.** It must be pushed before the Phase 4 quiz step, or
`/api/quiz/start` fails and the employee never reaches the quiz — which would read as a broken
cutover rather than a missing migration. This is now called out in `PROD-CUTOVER.md`.

`types/supabase.ts` has **not** been regenerated, so `quiz_sessions` is reached through two narrow
named casts in `assessment.ts` with the regeneration command in the comment. Run
`supabase gen types typescript --linked > types/supabase.ts` and they can go.

---

## Task 2 — `ix-prodseed`: decided, prepared, **not executed**

**Decision, Max, 2026-08-07: the PROD test rows get PURGED after the proof, not kept and
documented.** The open question from the 08-06 handoff is closed. Rationale: stale test data destroys
the daily reconciliation report's credibility on the day of the first real sale — the same trap the
17 staging test firms represent, and the reason PROD was kept clean. "Documented as a known
exception" is a note in a file; the reconciliation job does not read files.

### `scripts/purge-prod-test-firm.mjs`

Dry-run by default; `--confirm` deletes. Both `--project-ref` and `--firm` are required, with no
defaults and no discovery.

The guard `remove-avatars-bucket.mjs` does not have: **it refuses to run when the named project ref
disagrees with the project the loaded env actually points at.** Which database that script hits is
decided entirely by which env file was loaded, and the two refs differ by more than three characters
only if you read them carefully.

Deletion order, derived from the schema rather than the three-item sketch in the old notes:

1. **Storage objects** — no FK ties Storage to the DB; deleting rows first orphans the PDFs.
2. **`training_events`** — `firm_member_id → firm_members(id) ON DELETE RESTRICT` (0002) blocks the
   firms cascade.
3. **`firms`** — cascades to `seats`, `firm_members`, `enrollments`, `quiz_attempts`, `certificates`,
   `cert_generation_queue`, `quiz_sessions`.
4. **`auth.users`** — `firms.owner_id → auth.users(id) ON DELETE RESTRICT` (0001) holds them until
   the firm is gone. A user who also belongs to another firm is **skipped and reported**.

Not purged, deliberately, and printed at the end rather than done: the Stripe subscription/customer
(no Stripe credentials, and it must not acquire any), `processed_stripe_events` (removing the event
id would let a replayed webhook re-provision the firm), and `courses`/`quiz_questions`.

**Verified 2026-08-07:** dry-run against a staging firm (`Ithica & Co` — 24 `training_events`, 4
members, 4 auth users, 1 enrollment, 1 seat) and against a deliberately mismatched `--project-ref`,
which refused. **The script has never been run with `--confirm` against any project.**

### Runbook

`.planning/PROD-CUTOVER.md` gained an `ix-prodseed` section: the seven-step ordered seed sequence
(checkout → webhook provisions firm → password → invite → quiz → cert → cron), what proves each step,
the purge commands, and the decision above with its date.

---

## Verification run at wrap-up

| Check | Baseline | Result |
|---|---|---|
| `pnpm exec tsc --noEmit` | clean | **pass**, exit 0, no output |
| `pnpm exec eslint .` | 0 errors, 4 warnings | **0 errors, 4 warnings** — the same four pre-existing `no-img-element` in `closing-cta.tsx`, `hero-section.tsx`, `iurix-lockup.tsx` ×2 |
| `pnpm test` | 6 files / 51 tests | **7 files / 71 tests, all passing**, 11.5s |
| `.env.local` target | staging | `ndmzvtuywcufvkxtkjhg` — confirmed before the first run |
| Staging left clean | — | zero `QuizForge%` firms/courses, zero `quiz_sessions` rows |

Nothing failed. Nothing was repaired.

---

## Next steps

1. **Regenerate the Supabase types** and drop the two casts in `lib/training/assessment.ts`:
   `supabase gen types typescript --linked > types/supabase.ts`.
2. **Push `0024` to PROD** as part of the cutover window, before the Phase 4 quiz step.
3. **The cutover itself is still the blocker** and its order is unchanged: app Worker secrets →
   cert-worker secrets (commands in `09f21b3`) → `cd workers/cert-worker && wrangler deploy --config
   wrangler.toml` → production deploy **via Actions dispatch only** → `scripts/verify-cutover.mjs` →
   the Phase 4 proof → the purge.
4. **`ix-questionpool` is now unblocked and more urgent.** The slice in `/api/quiz/start` does
   nothing while the pool is 8; growing it to ~32 is what makes the fix above pay. Review and expand
   the 8 seeded questions — they are real Rule 5.3 items, `PLACEHOLDER` is in `section_tag`, not the
   question text.
5. **Correct `ix-quizsubset` on the board.** Its central claim ("no random subset selection anywhere")
   was already false; as of today the selection has moved to `/api/quiz/start` and the item overlaps
   `ix-quizforge` almost entirely.
6. Still open and unaddressed: the duplicate-purchase refund wording
   (`emails/checkout-email-in-use.tsx:75`, `app/api/webhooks/stripe/route.ts:670`), and
   `oxc: { jsx: 'automatic' }` in `vitest.config.ts` without which no email template can be tested.

## Open questions

- **The Stripe Product is still named "AI Staff Compliance Training — Annual Certification"** on
  hosted Checkout, invoices and receipts. Dashboard change, not code. `ix-stripeaudit`.
- **Does `.env.production` stay?** Undocumented third env file (51 bytes, `NEXT_PUBLIC_APP_URL`
  only), harmless today, but Actions also supplies that value at build time and two sources for one
  value is how a wrong one goes unnoticed.
- **Should `/api/quiz/start` rate-limit?** It is seat-gated and reuses open sessions, so there is no
  reroll and no information leak — but it is the one authenticated endpoint that hands out content.

## Safety rules still in force

- Production deploys: **GitHub Actions dispatch only**. Never `pnpm run deploy`. Never a push.
- Do not build OpenNext/Cloudflare artifacts on native Windows.
- Stripe remains sandbox. Sandbox confirmation is never live-money proof.
- Never enable Cloudflare Email Routing on the apex; Zoho owns apex MX.
- `scripts/remove-avatars-bucket.mjs` is destructive; PROD never had the bucket and it must not be
  run as part of this cutover.
- `scripts/purge-prod-test-firm.mjs` is destructive and irreversible. Dry-run first, always, and read
  the counts before passing `--confirm`.

---

> Uncommitted and not mine: `.planning/brief-archive/weekly-brief.html` was already modified in the
> working tree when this session started. Left alone — it belongs to the board archive ritual.

**Start the next session from the board**, not from this file:
https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075
