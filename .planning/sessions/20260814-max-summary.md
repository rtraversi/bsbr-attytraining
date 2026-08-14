# Session summary — 2026-08-14 (Max, with terminal-Claude)

## Headline

**Phase B (`ix-prodseed`) and Phase C (the purge) are both DONE.** A real sandbox Stripe purchase
provisioned a real firm on IURIX PROD, a real employee completed the training and passed the
certification quiz, a real certificate PDF was generated into the private `certificates` bucket, and
the whole test firm was then purged with `scripts/purge-prod-test-firm.mjs --confirm` — **the first
`--confirm` run of that script against any project.** PROD is verified back to its pre-seed baseline.

---

## What was done

### 0. Stale-doc fix (before anything ran)

`PROD-CUTOVER.md:359-381` still marked migrations `0024` and `0025` as ❌ not-applied on PROD with a
🔴 blocker warning. Both landed 2026-08-13 in Phase A. Corrected to ✅ **before** the run so it could
not be misread as a live blocker mid-flight.

Verified by **selecting the columns**, not by trusting the migration ledger — the ledger says a file
ran, the columns say the schema is actually there:

- `quiz_sessions` present, `quiz_attempts.question_ids` present → `0024` real
- `quiz_questions.lesson` present, 8 questions, **L1=1 L2=1 L3=4 L4=0 L5=2**, matching
  `QUESTION-POOL.md:53-158` → the backfill ran, not just the DDL
- `courses.questions_per_attempt` = **8**

### 1. Observation rig

`wrangler tail bsbr-attytraining` for the duration, plus a filtered monitor over the parsed stream.

**The rig was proven before it was trusted.** The first `/api/health` probe returned 200 but produced
**no tail event** — a CDN cache hit that never reached the Worker. A cache-busted repeat resolved it.
Had that not been checked, a quiet tail would have been indistinguishable from a healthy one, which
is the exact failure mode this runbook exists to prevent.

### 2. The seed sequence (all 7 steps)

| # | Step | Result |
|---:|---|---|
| 1 | Sandbox checkout | ✅ 3 seats (not 1 — deliberate), `cus_V4UgqZa9fX7JsA` / `sub_1U4Lgn6ZCSojEKRrZIVrYmPS` |
| 2 | Firm provisioned | ✅ **`07fb3282-a869-46c4-a7f6-c5cc9277231c`** ("Prod test") |
| 3 | Admin password + sign-in | ✅ `invited`→`active`, `last_sign_in_at` 14:08:19 |
| 4 | Employee invite | ✅ real `token_hash`, `/auth/confirm` 307 → `/update-password` 200, signed in 14:18:47 |
| 5 | Training + quiz | ✅ fail (13) then pass (100); `question_ids` populated on **both** attempts |
| 6 | Certificate | ✅ `IX-20260814-4129.pdf`, 44,200 bytes, `%PDF-1.7` … `%%EOF` |
| 7 | Cert-worker cron on PROD | ✅ drain 200s from `cf-worker: aistaffcompliance.workers.dev` |

**Step 4 — the invite hazard was ruled out by evidence, not assumption.** `app/api/invite/route.ts`
logs a `generateLink` failure at :103 and continues, renders `actionLink ?? ''` at :117, and has
already set `emailSent = true` at :115 — so a failed link generation produces an invite that looks
delivered and carries an empty `href`. A 200 alone proves nothing. What ruled it out: **zero
`[invite]` log lines in the tail** plus a populated `token_hash` in the delivered email.

**Step 5 — `ix-quizforge` architecture confirmed working under real load on PROD.** `/api/quiz/start`
wrote the `quiz_sessions` row with 8 server-chosen ids *before* any question was displayed; the fail
consumed that session (`consumed_at` set, single-use claim held); the retake minted a **fresh**
session. Both `quiz_attempts` rows carry `question_ids`. No cert on the failing attempt.

Note: the retake contained **the same 8 ids in a different order** — the documented consequence of
pool (8) == `questions_per_attempt` (8). Becomes a real subset when `ix-questionpool` grows the pool.

**Step 6 — proof is the PDF, not a 200.** Downloaded and checked both ends of the file (header +
`%%EOF` trailer) to rule out a truncated write. Bucket privacy verified too:
unsigned public GET → **400**, signed GET → **200 application/pdf**.

### 3. The drain probe, observe-only

`/api/certs/drain` was **never probed directly** — it has no payload guard after its auth check and
would begin real queue work. Instead the cert-worker's own `*/5` cron was observed: **200**, three
consecutive firings. That **closes the last unproven secret leg** — the cert-worker's
`CERT_WEBHOOK_SECRET` was written from the same paste as the app's but had never been independently
confirmed. Now confirmed by observation.

### 4. Evidence capture, then the purge

Captured to `/Users/maxlugo/Attorney training/phase-b-evidence-2026-08-14/` (outside the repo, git
cannot see it), checksum-verified after copy: the certificate PDF, full `auth.users` records for both
accounts, all 18 `training_events` ordered, enrollments, both quiz attempts, both quiz sessions,
firms/seats/members/certificates/queue/stripe-events. **The purge is the only copy** and three open
findings depend on it.

Dry run first. Counts matched an independent read of the database exactly, then `--confirm`:

```
1 storage object · 18 training_events · firm cascade (1 seat, 2 firm_members,
1 enrollment, 2 quiz_attempts, 1 certificate, 1 cert_generation_queue, 2 quiz_sessions)
· 2 auth.users
```

PROD verified back to baseline: every seeded table 0, `auth.users` 0, storage 0 —
`processed_stripe_events` correctly **retained at 2**, `courses` + 8 `quiz_questions` untouched.

Stripe subscription and customer cancelled/deleted by hand (Max).

---

## Corrections made this session

### The nameless-certificate "blocker" — WITHDRAWN

Terminal-Claude initially reported the certificate's `holder_name: "Employee"` as a fallback
literal and flagged it as a Rule 5.3 launch blocker. **That was wrong.** The captured
`auth.users` records show `user_metadata.full_name` was written for both accounts — literally
`"Employee"` and `"Admin"`, i.e. the names typed into the password-set form. Nothing in the code
fabricates that string: `generate/route.ts:101-102` reads `full_name || employeeEmail` and `:168`
reads `full_name?.trim() || null`. Both received real values and used them. **The pipeline behaved
correctly.**

The genuine no-name behaviour is milder and deliberate — `:164-167` documents it: the PDF falls back
to the **email address**, while `holder_name` (the public verification field) goes **null**, so "a
holder with no recorded name verifies as having none."

### The Phase C close condition — REWRITTEN

`PROD-CUTOVER.md` said the close condition was a clean daily reconciliation. **That gate does not
work and would have been believed.**

- `cert-worker/src/index.ts:936` — `canCompareFirmsToStripe = subs.length > 0` suppresses directions
  2 and 3 when there are no live subscriptions; direction 1 iterates `subs` and is also a no-op
- `subs` is filtered to `livemode === true` (`:888-895`), corroborated by
  `cert-worker/wrangler.toml:24-26`
- The seed purchase was **sandbox**, so it never entered `subs`. **The test firm would have reported
  clean while it still existed.**

The suppression is correct behaviour (`:920-932` explains the mirror-image false alarm it prevents).
It just means a clean reconciliation is not evidence of anything until live subscriptions exist.

**Real close condition, now documented: a direct read of every table the purge touched.**

### `ix-testfirmfuse` — CLOSED as moot

Two independent grounds:

1. The job reads `/firms` on **its own worker's** `SUPABASE_URL`. The PROD cert-worker points at
   PROD (0 firms). Staging's 17 firms live in a database it never opens.
2. `[env.staging]` (`wrangler.toml:43-48`) has `SUPABASE_URL = ""` / `APP_URL = ""` — not
   operational. Even if configured, staging would carry a sandbox Stripe key → `subs` empty →
   directions 2 and 3 skipped.

Premise verified rather than assumed: staging genuinely holds **17 firms, all `status: active`**.
Moot through **configuration**, not a code change — hence the note so it is not reopened on sight.

---

## Also found

- **`ix-stripeaudit` / launch checklist.** The tail caught, at checkout:
  `[checkout] No Stripe Price carries lookup_key "per_seat_annual"; using the sandbox Price
  price_1TjNHc6ZCSojEKRrKs79ToJ0.` Behaving exactly as designed. **Set `lookup_key: per_seat_annual`
  on the live Price at creation** or live checkout refuses to charge.
- **`ix-stripeaudit` — the paid-but-got-nothing detector is unexercised.** Direction 1 has never run
  with a non-empty `subs`. The detector for *someone was charged and received nothing* goes live the
  same day money does, having never run against real input — `matchFirm`, the sub/customer dual-key
  matching at `:948-956`, `RECONCILE_GRACE_MS`, and the email send path all included. Verify
  deliberately against the first live subscription.
- **`ix-prodseed` residual — purge discipline.** The first live subscription also flips
  `canCompareFirmsToStripe` true for the first time, switching directions 2 and 3 on. A future PROD
  test firm left un-purged becomes a **real alert** rather than a silent row. This is
  `ix-testfirmfuse`'s concern relocated from staging to PROD.
- **`ix-signinlogo`.** `AtcLogo`, the retired Athena monogram, ships on four surfaces from one
  component: login, onboarding, forgot-password, update-password.

---

## Open questions

1. **`ix-lessongate`** — Max saw the first four lessons available from the start, and the header
   reading 100% while content was still being read. **Check `INTERFACE-CORRECTIONS.md` item 2
   (false-positive course completion — clicking a scenario element fires `video_completed`) before
   writing this up as new.** The captured events may be that same issue reproducing on PROD: three
   separate `video_started`, a `video_completed` at 14:35:39, knowledge checks for lessons 1, 2, 4, 5
   but **never 3**, and check-2 firing at 14:28:59 *after* the move to lesson 3 at 14:27:25.
   Evidence: `/Users/maxlugo/Attorney training/phase-b-evidence-2026-08-14/training-events-employee.json`
2. **`ix-certpage`** — no completion screen and no durable certificate page. The only handle on a
   finished certificate is an **expiring signed URL**. A compliance artifact the holder cannot
   reliably re-reach is a gap in the product's core promise.
3. **The Supabase CLI is still linked to PROD** (`supabase/.temp/project-ref` =
   `ttqthtzdjacrhjtrcmmy`). **Any `supabase db push` from this repo hits production** until it is
   re-linked to staging.

---

## Next steps

- Decide `ix-lessongate` — new bug, or a PROD reproduction of `INTERFACE-CORRECTIONS.md` item 2
- Re-link the Supabase CLI to staging before any further migration work
- Set `lookup_key: per_seat_annual` on the live Stripe Price when it is created
- Plan the first-live-subscription verification of reconciliation direction 1
