# Session Handoff

**Date:** 2026-08-14
**Who:** Max, with terminal-Claude.

## Status in one paragraph

**Phase B (`ix-prodseed`) and Phase C (the purge) are both DONE — the PROD cutover is now proven
end-to-end with real money and a real certificate.** A sandbox Stripe purchase provisioned a real
firm on IURIX PROD (`ttqthtzdjacrhjtrcmmy`), an admin set a password and signed in, an employee was
invited and accepted, completed the training, failed the certification quiz once and then passed it,
and a real certificate PDF was written to the private `certificates` bucket. The whole test firm was
then purged with `scripts/purge-prod-test-firm.mjs --confirm` — **the first `--confirm` run of that
script against any project** — and PROD is verified back to its pre-seed baseline. Two findings were
**withdrawn or rewritten** on evidence this session: the "nameless certificate" launch blocker was
wrong, and the documented Phase C close condition did not work. Full detail in
`.planning/sessions/20260814-max-summary.md`.

---

## 🟢 WHAT IS PROVEN ON PROD NOW

| Step | Proof |
|---|---|
| Checkout → firm | `07fb3282-a869-46c4-a7f6-c5cc9277231c`, from `cus_V4UgqZa9fX7JsA` / `sub_1U4Lgn6ZCSojEKRrZIVrYmPS` |
| Admin onboarding | `invited`→`active`, signed in on the apex |
| Employee invite | real `token_hash`, `/auth/confirm` 307 → `/update-password` 200 |
| Quiz (`0024`/`0025`) | server-chosen session written before display; fail 13 → pass 100; `question_ids` on both attempts |
| Certificate | `IX-20260814-4129.pdf`, 44,200 bytes, `%PDF-1.7`…`%%EOF`, private bucket |
| Bucket privacy | unsigned public GET **400**, signed GET **200** |
| Cert-worker on PROD | `*/5` drain cron **200**, `cf-worker: aistaffcompliance.workers.dev` |

**The cert-worker's `CERT_WEBHOOK_SECRET` is now independently confirmed.** It was written from the
same paste as the app's but never separately verified. `/api/certs/drain` was **not** probed directly
(no payload guard after its auth check — it would begin real queue work); the worker's own cron was
observed instead.

## 🧾 EVIDENCE — kept outside the repo

`/Users/maxlugo/Attorney training/phase-b-evidence-2026-08-14/` — 12 files, checksum-verified after
copy, git cannot see it. Certificate PDF, full `auth.users` records, all 18 `training_events`
ordered, enrollments, both quiz attempts, both quiz sessions, and the firm/seat/member rows.
**The purge was the only other copy.**

## ⚠️ TWO CORRECTIONS MADE ON EVIDENCE

1. **The nameless-certificate blocker is WITHDRAWN.** `holder_name: "Employee"` was not a fallback —
   `user_metadata.full_name` really was `"Employee"` (typed test data), and `"Admin"` for the admin.
   `generate/route.ts:101-102` and `:168` both received real values and used them. The pipeline
   behaved correctly. The real no-name behaviour is deliberate and documented at `:164-167`: the PDF
   falls back to the email address; `holder_name` goes null.
2. **The Phase C close condition was rewritten in `PROD-CUTOVER.md`.** It said "re-run the daily
   reconciliation and confirm zero discrepancies." **That gate cannot see the purge.**
   `cert-worker/src/index.ts:936` short-circuits directions 2 and 3 when `subs` is empty, and `subs`
   is filtered to `livemode === true` (`:888-895`, corroborated by `wrangler.toml:24-26`). The seed
   purchase was sandbox, so **the test firm would have reported clean while it still existed.** The
   real close condition — now documented and actually performed — is a **direct read of every table
   the purge touched**.

## ✅ CLOSED

**`ix-testfirmfuse` — moot**, on two independent grounds: the reconciliation reads `/firms` on its
own worker's `SUPABASE_URL` and the PROD cert-worker points at PROD (0 firms), so staging's 17 firms
are in a database it never opens; and `[env.staging]` is unconfigured (`SUPABASE_URL = ""`), and even
if configured would carry a sandbox key → `subs` empty → directions 2 and 3 skipped. Staging's 17
firms (all `status: active`) were verified, not assumed. **Moot through configuration, not a code
change** — hence this note, so it is not reopened on sight of the 17.

## 📌 CARRIED FORWARD

- **`ix-stripeaudit`** — set `lookup_key: per_seat_annual` on the **live** Price at creation. The
  tail caught the fallback warning at checkout; live mode refuses to charge without the key.
- **`ix-stripeaudit`** — **the "paid but got nothing" detector is unexercised.** Reconciliation
  direction 1 has never run with a non-empty `subs`; it goes live the same day money does, having
  never run against real input. Verify deliberately against the first live subscription.
- **`ix-prodseed` residual** — the first live subscription also switches directions 2 and 3 on for
  the first time. A future PROD test firm left un-purged becomes a **real alert**. Keep the purge
  discipline.
- **`ix-signinlogo`** — `AtcLogo`, retired Athena monogram, four surfaces from one component:
  login, onboarding, forgot-password, update-password.
- **`ix-questionpool`** — the quiz retake served the same 8 ids reshuffled. Expected while pool (8)
  == `questions_per_attempt` (8); becomes a real subset when the pool grows.

## ❓ OPEN QUESTIONS

1. **`ix-lessongate`** — Max saw the first four lessons available from the start, and the header at
   **100% while content was still being read**. **Check `INTERFACE-CORRECTIONS.md` item 2
   (false-positive course completion — clicking a scenario element fires `video_completed`) before
   writing this up as new.** The captured events may be that same bug reproducing on PROD: three
   separate `video_started`, a `video_completed` at 14:35:39, knowledge checks for lessons 1, 2, 4
   and 5 but **never 3**, and check-2 firing *after* the move to lesson 3. Evidence:
   `phase-b-evidence-2026-08-14/training-events-employee.json`.
2. **`ix-certpage`** — there is **no completion screen and no durable certificate page**. The only
   handle on a finished certificate is an **expiring signed URL**. A compliance artifact the holder
   cannot reliably re-reach undercuts the product's core promise.
3. **The Supabase CLI is still linked to PROD** (`supabase/.temp/project-ref` =
   `ttqthtzdjacrhjtrcmmy`). **Any `supabase db push` from this repo hits production** until it is
   re-linked to staging. Re-link before any further migration work.

## NEXT STEPS

- Decide `ix-lessongate`: new bug, or a PROD reproduction of `INTERFACE-CORRECTIONS.md` item 2
- Re-link the Supabase CLI to staging
- Set the live Stripe Price `lookup_key` when the live Price is created
- Plan the first-live-subscription verification of reconciliation direction 1
