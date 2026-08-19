# Session summary — 2026-08-19 (Max, with terminal-Claude)

Two launch gates closed and shipped to production: `ix-questionpool` and `ix-termsaccept`. Both live
on `iurixaccreditation.com` as of Actions run 32270342849, off `main` at `cfed8bc`.

---

## `ix-questionpool` — closed

The pool was 8 questions and `courses.questions_per_attempt` was also 8, so every candidate saw an
identical exam and an unlimited retake was a second look at the same paper, on the only graded thing
in the product. Migration `0026_question_pool_v1.sql` retires those 8 (deactivate, never delete) and
inserts 50 — ten per lesson, durable `L<n>:<topic>` tags, lesson classification populated.

**Content workflow, worth repeating.** The bank was drafted from the actual SCORM course text, which
was extracted by base64-decoding `public/training-content/scorm-v1/scormcontent/runtime-data.js` (it
is `__jsonp("runtime-data.js","<base64 JSON>")`, five lessons, 21–34 items each). Every factual claim
in the 42 drafted explanations was then checked back against that text: **65 claims, 65 verified.**

Max reviewed, edited and approved. The exchange happened partly in Apple Numbers — he opened the xlsx
in Numbers, which saves a `.numbers` bundle and never writes back to the xlsx, so the repo copy
looked untouched while his edits sat on his Desktop. Merged by reading the `.numbers` file directly
with `numbers-parser`. **If this happens again, that is the fix.**

### Two defects found in the bank itself

- **Answer position clustered at B** — 24 of the first 42 drafts. Rebalanced to A11/B12/C13/D14
  across all 50. Note the app serves answers in stored order and never shuffles them (verified
  through `servedQuestion` → grading against `correct_index`), so position is genuinely exploitable.
- **The correct answer was the longest choice 54% of the time**, against 25% by chance. Combined with
  unlimited retakes, a pure longest-answer guesser passed about 1 attempt in 18. Distractors
  lengthened on 19 questions, correct answers untouched. Now 18%; brute-force is ~24,000 attempts.

**The general lesson: balancing answer position is not the same as making a bank unguessable.** The
first rebalance was declared safe on position alone, and the bigger hole was on a different axis
entirely. Check length too, and check it against chance rather than against intuition.

### Verified against staging with the real selector

2000 simulated exams through `selectQuestionsForAttempt`: every one 8 questions, exact 1/2/2/1/2
lesson coverage, zero quota shortfalls, mean retake overlap **1.39** against a predicted 14/10 =
**1.40**. That confirms the stratification shipped in `adb43f5` works and had simply never had a pool
big enough to act on.

⚠️ **Katy has not reviewed the 50.** Max approved shipping with revision to follow.

---

## `ix-termsaccept` — closed

Terms §1 asserts the customer accepted the terms. Nothing ever asked, so it was false for every
account that has ever existed. `0027_terms_acceptance.sql` adds `terms_accepted_at` + `terms_version`
to `firms` and `firm_members`, CHECK-paired so a timestamp cannot exist without the version pinning
the wording, nullable and **not backfilled**.

- Admins accept at checkout, refused before the Stripe session is created, carried on session
  metadata for the webhook.
- Staff accept at password-set, recorded before the password changes.

`CURRENT_TERMS_VERSION` is `v1-draft-2026-08-18` and says `draft` because `app/terms/page.tsx` still
reads `[ATTORNEY TO COMPLETE]`. **Bump it in the commit that publishes reviewed terms.**

**Near-miss worth recording:** the first pass updated only `/pricing`. Two other components call
`/api/checkout` — `app/_components/checkout-form.tsx` and `app/mockup/_components/pricing.tsx` — and
both would have shipped 400ing. Found by grepping every caller before deploying rather than after.
**Adding a required field to a shared endpoint means auditing every caller, not the obvious one.**

---

## Mail: tested properly, still broken

All four Resend DNS records are present and correct on the apex (`resend-domain-verification` TXT,
`send.` SPF, `send.` MX at `feedback-smtp.us-east-1.amazonses.com`, `resend._domainkey` DKIM), Zoho
MX and SPF intact. A real API send still returns **403, domain is not verified**.

So `ix-dnszoho` changed shape: it is no longer "Rob send the records", it is "someone with Resend
dashboard access completes verification". A click.

Probed with `delivered@resend.dev`, Resend's own sink, so no real person was emailed. The API key is
send-only and 401s on `GET /domains`, which is why a send is the only available test.

---

## Safety fix

`supabase/.temp/project-ref` had pointed at **PROD** since 08-13. Any `supabase db push` from this
repo would have hit production. Relinked to staging, and relinked back to staging again after the
deliberate PROD push. PROD was checked to be at 0025 before pushing so `0023` — which cannot run and
takes any batched migration down with it — would not re-run.

---

## Not done

- **`ix-doublebill`** — a pre-charge identity check needs the buyer's email before Stripe collects
  it, i.e. restructuring the pricing page. Design decision, not a patch. Still blocks `ix-stripeaudit`.
- **20 stems still name the training material** ("Lesson 4's guidance is to use…"). Reads like a
  course quiz rather than a professional assessment. Max cleaned three.
- **Wrangler on Max's Mac cannot reach the Worker's account** (token on `solarsaiko@gmail.com` /
  `92ad73af…`, Worker under `4b2a4023…`). CI deploys fine; there is no local rollback from that
  machine.

---

## State

`main` at `cfed8bc`, deployed and live. PROD and staging both at migration 0027. PROD carries 50
active questions, 10 per lesson, 8 retired, zero nulls, zero PLACEHOLDER tags. Post-deploy live
checks: apex 200, `/api/health` ok with `db: ok`, checkout without acceptance returns
`400 terms_not_accepted`.

Remaining before a customer can buy: Rob's Stripe live mode, the live Price `lookup_key`, the live
webhook, and the Resend verification click.
