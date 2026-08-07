# Session Handoff

**Date:** 2026-08-07 (second session, wrap-up)
**Who:** Max, with terminal-Claude.

## Status in one paragraph

Five items closed: **`ix-maybesingle`** (the duplicate-enrollment factory), **`ix-lessoncounter`**
(the counter that contradicted its own page), **`ix-cookiesecure`** (no `Secure`, and a clobbered
`maxAge`), **`ix-typesregen`** (the casts `3745d49` left behind), and **`ix-claudemd`**. Nothing was
deployed. The cutover freeze is intact and untouched. The board file was not opened.

---

## 🔴 The rule that is still not broken

Rob's two Actions secrets moved **2026-08-06 21:07Z**, so the cutover mismatch window is **OPEN**.

- **No `target: production` dispatch.** Not for an unrelated fix, not to test the pipeline.
- **No `pnpm run deploy`.**
- **Preview URLs are not a sandbox.** `deploy.yml` builds preview and production from the same
  `NEXT_PUBLIC_SUPABASE_*`, so previews point at PROD. `localhost:3000` (`.env.local` → staging
  `ndmzvtuywcufvkxtkjhg`) is the only safe place to click.
- Committing and pushing are fine.

**Everything below lands committed-not-deployed, so the first production deploy after the cutover
carries it.**

---

## 1. `ix-maybesingle` — the guard against duplicates was making them

`enroll-self:89` and `onboarding/complete:109` both asked "does an enrollment exist?" with a bare
`.eq(user_id).eq(course_id).maybeSingle()` — no `firm_id`, no ordering, error discarded.

0007 dropped the unique constraint so renewals insert a fresh row per term, which makes multiple rows
**normal**. `.maybeSingle()` **errors** on multiple matches rather than returning one, so on any
renewed account the read came back `{ data: null, error }`, the guard read "none exists", and
inserted another. That is the source of the duplicates `95c040e` had to defend the dashboard against.

**Extracted rather than patched twice.** The read existed in *three* places — the two broken ones and
the correct one in `lib/training/assessment.ts`. New `lib/enrollments.ts` holds
`findCurrentEnrollment` and `ensureEnrollment`; all three call sites now use it. `enrolled_at` DESC +
`limit(1)`, scoped by `firm_id`. **The column is `enrolled_at`, not `created_at`.**

The error is **returned, never swallowed** — on a read failure `ensureEnrollment` writes nothing and
reports `outcome: 'error'`. Inserting on a failed read is precisely what made the duplicates.

`tests/enrollment-current-term.test.ts` seeds a learner with two terms and **runs the original query
shape first**, asserting it errors — so the regression is pinned, not described. Then: resolves to
the current term, scoped by firm, and `ensureEnrollment` does **not** insert a third row (count stays
2 across repeated calls).

## 2. `ix-lessoncounter` — reproduced, then fixed, then measured

The counter derived from `currentLessonNumber - 1` — where the learner **navigated**, not what they
finished. The same expression existed twice; `overview-client.tsx:96`'s own comment said "same math
as training-client.tsx".

**Reproduced on `localhost:3000`** against a seeded staging learner in the test-out state (passed
lesson 5 only, navigated to lesson 4, enrollment `passed`, certificate issued, `contentViewed` false
because Rise's completion signal structurally never fires):

| | Overview "Lessons" pill | Overview "Lesson checks" | Training header |
|---|---|---|---|
| **before** | **`Lessons 3/5`** | `5/5 cleared` | `100% Complete` |
| **after** | **`Lessons 5/5`** | `5/5 cleared` | `100% Complete` |

Both numbers read off the rendered HTML, not asserted. The seeded firm/user/course were purged
afterwards.

### 🔴 The ACCESS-vs-ACHIEVEMENT choice, made explicitly

New `countLessonsFinished` + `grantedClearedLessons` in `lib/training/progress.ts`. The counter uses
**`status === 'cleared'`** — the ACCESS field, which **includes** lessons granted by the test-out
shortcut.

**Justification:** a counter sitting beside a header reading "complete", next to an issued
certificate, is making an ACCESS claim — "is anything more required of this learner here?" That is
what `status` answers. `attemptClearedCount` answers a different question (ACHIEVEMENT: "did they
personally pass this?") and is what `lib/refund-eligibility.ts` computes from. **It is untouched**,
and `tests/lesson-counter.test.ts` pins the separation: for this learner `attemptClearedCount` is
**1** while the counter is **5**. Widening `attemptClearedCount` instead would have silently made a
test-out learner non-refundable for training they never consumed.

The union is taken **per lesson**, not as `max(walked, cleared)`: checks are not sequential, so a
learner who walked to lesson 3 and cleared only check 4 is done with {1,2,4} — three — which neither
scalar reports. The opposite regression is also covered: someone who read three lessons and took no
check still reads 3/5, not 0/5.

`/ 5` vs `LESSONS.length` made consistent in both files.

## 3. `ix-cookiesecure` — and the first fix was wrong

`secure` was never set; any plain-HTTP request carried the session token in the clear before the
redirect. Separately, `middleware.ts` built its own `createServerClient` with **no** `cookieOptions`
and refreshes on every request, overwriting the browser client's `maxAge` with @supabase/ssr's
400-day default. Fixing only `client.ts` would not have held.

New `lib/supabase/cookie-options.ts` is the single definition, imported by both. The "remember me"
intent travels in a companion cookie (`ix-remember`) because **a request carries only `name=value`,
never the `maxAge` it was written with** — middleware cannot recover the intent from the auth cookie.
Absent reads as "no", the safe default. `createClient()` with no args now **inherits** the recorded
choice, so a token refresh from settings/update-password can't silently downgrade a remembered
session.

> ### 🔴 My first version of this fix was broken, and the browser check is what caught it
>
> I keyed `secure` on `request.nextUrl.hostname`. **Next's dev server normalises that to
> `localhost` regardless of the Host header** — measured: a request with
> `Host: iurixaccreditation.com` reported `nextUrl.hostname === 'localhost'`, so `Secure` was
> omitted for *every* host. It typechecked and looked right. It now reads the **Host header**
> (`hostnameFromHeader`), which a browser sets from the URL and page JS cannot forge.
> `X-Forwarded-Host` is deliberately **not** consulted — honouring it would let an intermediary
> *downgrade* the cookie by claiming localhost.

**Verified by driving the real middleware** with an expired access token (which forces the refresh
that triggers `setAll`) and reading the `Set-Cookie` off the wire:

| Host | `ix-remember` | `Secure` | `Max-Age` |
|---|---|---|---|
| `iurixaccreditation.com` | 1 | **Secure** | 2592000 (30d) |
| `iurixaccreditation.com` | 0 | **Secure** | none → session cookie |
| `localhost:3000` | 1 | absent (dev carve-out) | 2592000 |
| `localhost:3000` | 0 | absent (dev carve-out) | none → session cookie |

`HttpOnly` is absent in all four, as required — **do not "fix" it**, @supabase/ssr needs the browser
client to read this cookie.

⚠️ **What was NOT verified:** an actual browser restart in both `rememberMe` states. The cookie
attributes that *decide* that behaviour are verified above, and `tests/cookie-options.test.ts` covers
the resolution logic, but nobody closed and reopened a browser. Worth ten seconds during the cutover
smoke test.

## 4. `ix-typesregen` — done, and it found real nullability

`supabase gen types typescript --linked` against staging. The diff is **purely additive** (checked:
zero removals) — `quiz_sessions` plus `quiz_attempts.question_ids`.

Both casts in `lib/training/assessment.ts` are gone. **The pre-existing `quiz_questions` cast in
`app/api/quiz/attempt/route.ts` was already gone** — `3745d49` removed it when that route was
rewritten to delegate. The two `as any` casts in `tests/quiz-session.test.ts` are also gone, and real
typing immediately surfaced six genuine nullability holes in the test assertions, now fixed.

`checkSessionUsable` is typed on the fields it actually reads rather than the whole row — a predicate
demanding `issued_at` to answer a question it never asks is one nobody can call with a fixture.

## 5. `ix-claudemd`

- **`CLAUDE.md:42`**: Postgres **15 → 17.6.1**, with a note that both projects were verified on
  2026-08-05 and that the row was never right for these projects.
- **§6 rewritten.** It described the *pre-`3745d49`* architecture — i.e. the hole closed this
  morning, written up as if it were the design. Now documents `quiz_sessions`, `/api/quiz/start`, the
  server-chosen set, the single-use claim, the refusal codes, and **the denominator being the served
  set**. Carries a banner saying what it used to say and why that was wrong.
- **"Fresh randomised subset each time"** kept, with a note that it is **true only as of
  `3745d49`** and still inert until `ix-questionpool` grows the pool past 8.

---

## Verification run at wrap-up

| Check | Baseline (after `3745d49`) | Result |
|---|---|---|
| `pnpm exec tsc --noEmit` | exit 0, no output | **exit 0, no output** |
| `pnpm exec eslint .` | 0 errors, 4 warnings | **0 errors, 4 warnings** — same four pre-existing `no-img-element` (closing-cta, hero-section, iurix-lockup ×2) |
| `pnpm test` | 7 files / 71 | **10 files / 111 passing**, 12.4s |
| `.env.local` target | staging | `ndmzvtuywcufvkxtkjhg` — confirmed before the first run |

Three new suites: `enrollment-current-term` (DB, staging), `lesson-counter` (pure),
`cookie-options` (pure). Staging left clean — the seeded demo firm/user/course were purged, and no
scratch files remain in the repo.

---

## Next steps

1. **The cutover is still the blocker.** Order unchanged: app Worker secrets → cert-worker secrets
   (commands in `09f21b3`) → `cd workers/cert-worker && wrangler deploy --config wrangler.toml` →
   production deploy **via Actions dispatch only** → `scripts/verify-cutover.mjs` → Phase 4 proof →
   purge.
2. **Push `0024` to PROD** before the Phase 4 quiz step, or `/api/quiz/start` fails and it reads as a
   broken cutover.
3. **During the cutover smoke test**, confirm sign-in survives a browser restart with "remember me"
   on and does not with it off. That is the one part of item 3 not verified here.
4. **`ix-questionpool`** is the item that makes `ix-quizforge` pay — the slice does nothing while the
   pool is 8.
5. Still open: the duplicate-purchase refund wording (`emails/checkout-email-in-use.tsx:75`,
   `app/api/webhooks/stripe/route.ts:670`), and `oxc: { jsx: 'automatic' }` in `vitest.config.ts`
   without which no email template can be tested.

## Open questions

- **Stripe Product still named "AI Staff Compliance Training — Annual Certification"** on hosted
  Checkout, invoices and receipts. Dashboard change, not code. `ix-stripeaudit`.
- **Does `.env.production` stay?** Undocumented third env file; Actions also supplies
  `NEXT_PUBLIC_APP_URL`, and two sources for one value is how a wrong one goes unnoticed.
- **Should the `ix-remember` companion cookie be renamed or namespaced** before launch? It is
  application-visible and there is no other `ix-` cookie convention yet.

## Safety rules still in force

- Production deploys: **GitHub Actions dispatch only**. Never `pnpm run deploy`. Never a push.
- Do not build OpenNext/Cloudflare artifacts on native Windows.
- Stripe remains sandbox. Sandbox confirmation is never live-money proof.
- Never enable Cloudflare Email Routing on the apex; Zoho owns apex MX.
- `scripts/remove-avatars-bucket.mjs` and `scripts/purge-prod-test-firm.mjs` are destructive.
  Dry-run the purge first, always, and read the counts before `--confirm`.
- **Do not set `httpOnly` on the Supabase auth cookie.** It breaks authentication outright.

---

**Start the next session from the board**, not from this file:
https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075
