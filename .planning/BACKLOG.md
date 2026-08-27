# Backlog — Issues & Improvements

Items discovered during development that must be addressed before real customers,
or are otherwise worth tracking. Organized by priority.

**Last updated:** 2026-08-03 | **Source:** Max + Claude desktop session; Twilio item added by Rob

---

## Must-Fix Before Real Customers

### 1. Pre-Stripe duplicate purchase check
**Found:** 2026-06-19 during e2e testing
**Problem:** If an attorney already has an account and goes through checkout again,
they get charged a second time. The webhook handler hits `createUser` → fails with
"already registered" → returns early without creating a firm → they lose their money
and land on a forever-spinning onboarding page. Terrible experience.
**Fix:** Before redirecting to Stripe Checkout, check if the submitted email already
exists in Supabase. If it does, show a "You already have an account — log in here"
message instead of sending them to Stripe. Never let a known user reach Checkout.
**Files to touch:** Landing/checkout page + the route that creates the Checkout Session.

### 2. Webhook re-purchase handler (safety net for #1)
**Found:** 2026-06-19
**Problem:** If someone slips past check #1 and pays twice, the webhook handler
silently returns (no error thrown, Stripe gets a 200, no retry). The customer
loses money with zero feedback.
**Fix:** Detect the duplicate in `handleCheckoutCompleted` — when `createUser`
returns an "already registered" error, immediately cancel the new subscription via
`stripe.subscriptions.cancel(sub.id)` and send the customer an email: "We noticed
you already have an account — here's a login link." Then return cleanly.
**File:** `app/api/webhooks/stripe/route.ts` → `handleCheckoutCompleted`

### 3. Login button on marketing/landing page — ✅ DONE 2026-08-03
**Found:** 2026-06-19
**Problem:** Existing customers have no visible path back into the app. There is
no "Log in" link anywhere on the landing page. They'd have to know the URL.
**Fix:** Add a "Log in" button/link in the nav or hero of the landing page pointing
to `/login` (or wherever the auth page lives).
**Resolved:** the rebuilt marketing header carries a "Sign in" link to `/login`, and
the footer and closing CTA both repeat it.

### 4. Pricing tier display on landing page — ✅ DONE 2026-08-03
**Found:** 2026-06-19
**Problem:** Buyers cannot see what they're paying before checkout. The seat bands
($35/user for 1–9, $32/user for 10–24, $28/user for 25+) are not shown anywhere
on the landing page.
**Fix:** Add a pricing section or card to the landing page showing the three volume
bands clearly before the CTA button.
**Resolved:** section 05 ("The details") shows all three bands, with a note that this
is volume pricing rather than tiers, plus a worked example in the closing CTA.

### 5. Remove `devLink` from production routes
**Found:** Earlier session (carried from session_handoff.md)
**Problem:** `devLink` (the on-screen magic link fallback) is currently shown in
production whenever Resend fails. Now that Resend is configured, this should be
removed so it can never leak a login link to the screen in prod.
**Fix:** Remove the `devLink` return from `app/api/onboarding/complete/route.ts`
and `app/api/invite/route.ts`. Keep only the `console.error` for server logs.
Do this after confirming emails deliver end-to-end.

### 7. Business voicemail line (Twilio)
**Added:** 2026-08-03 (Rob)
**Problem:** Iurix Accreditation has no business phone number. Forming as an NC LLC,
and the marketing footer already reserves a `[PHONE — TBD]` slot. No physical phone,
low expected volume. The requirement is **voicemail + notification**; SMS is a
nice-to-have, secondary.

**Decision:** reuse the Twilio number already purchased for KCL and never deployed —
it is already paid for. Google Voice was rejected: the free tier reclaims numbers
after roughly three months of inactivity, which is unacceptable for a number printed
on a compliance product's marketing site.

**Design — voicemail only. Nothing ever rings a cell; there is no `<Dial>` in the flow.**

Three endpoints, and **every one must validate the `X-Twilio-Signature` header** —
these are public URLs and an unvalidated one is an open relay into the notification
inbox:

1. `/voice` — the Twilio Voice webhook. Returns TwiML: a greeting (`<Say>` or
   `<Play>`) followed by
   `<Record transcribe="true" maxLength="120" playBeep="true" finishOnKey="#"
   recordingStatusCallback="/voicemail-complete" />`
2. `/voicemail-complete` — the `recordingStatusCallback` target. Pulls the recording
   URL and transcript, then sends a notification email via Resend.
3. `/sms` — optional, **receive-only**. Inbound text forwarded to email. A2P 10DLC
   registration governs *outbound* US-bound 10DLC traffic, so inbound forwarding
   works unregistered — but it cannot auto-reply or send anything until registered.
   Defer registration until two-way SMS is actually wanted.

**Host: a Cloudflare Worker — this is already decided, not an open question.** The
original spec listed "Netlify function vs Cloudflare Worker" as undecided, but
`iurixaccreditation.com` is a Next.js app on Cloudflare Workers via
`@opennextjs/cloudflare` (`wrangler.jsonc`), and CLAUDE.md's stack constraint is
explicit: CF, not Netlify. There is no Netlify site to put a function on.

Follow the existing `workers/cert-worker` pattern rather than inventing a new one:
its own `wrangler.toml`, secrets set with `wrangler secret put` and never committed,
and Resend called over plain `fetch` to `https://api.resend.com/emails` with a
`Bearer ${env.RESEND_API_KEY}` header (see `workers/cert-worker/src/index.ts`).
Secrets needed: `TWILIO_AUTH_TOKEN` (for signature validation), `RESEND_API_KEY`,
and the notification target address.

**Cost:** number already paid at ~$1.15/mo. Inbound voice ~$0.0085/min, transcription
$0.05/min — a 90-second voicemail is about $0.09. Immaterial at expected volume.

**Open decisions — resolve before building:**
- [ ] Which Twilio project/subaccount holds the number? If it is KCL-scoped, move it first.
- [ ] Confirm the number is still active (Phone Numbers → Manage → Active).
- [ ] Greeting: TTS `<Say>` vs a recorded `<Play>` MP3. Recorded reads better to
      law-firm buyers, and this is a product sold on looking like a serious instrument.
- [ ] Recording retention: auto-delete from Twilio after the email goes out, or keep
      in the account? Note this interacts with the Privacy Policy and the DPA — a
      retained voicemail from a client is personal data under both, and the DPA's
      sub-processor list would need Twilio added.
- [ ] Notification target email address. Likely the same address that settles the
      `[CONTACT EMAIL — TBD]` placeholder in the footer and legal pages.
- [ ] Area code — the number was picked for the law firm, but Iurix sells into all
      50 states. Decide whether a local NC area code is a liability or a non-issue.

---

## Known Bugs In Progress

### 6. "Try Again" quiz button doesn't reset quiz state
**Found:** 2026-06-18 (Session 3)
**Problem:** `router.refresh()` re-renders the server component with a new shuffled
question set, but React preserves `QuizComponent` client state across server
re-renders — so `qIndex`, `locked`, `phase`, and `result` are still from the
failed attempt.
**Fix:** Add `attemptKey` counter to `training-client.tsx`, pass as `key` prop to
`<QuizComponent>` (forces full remount on change), and replace `router.refresh()`
in `quiz-component.tsx` with `onRetry?.()`.
**Files:** `training-client.tsx`, `quiz-component.tsx`
**Status:** Fix designed, not yet applied.

---

## Blocked on Rob (no dev action needed yet)

- **Rise iframe** — waiting on Articulate Rise 360 web export from Rob + Katy.
  Placeholder iframe is in `training-client.tsx` lines 61–69.
- **Real question pool** — waiting on Rob to seed 24–32 questions in the DB
  (replaces `PLACEHOLDER:*` seeds). See CONTENT-10-STEPS.md Task 7.
- **Logo** — Rob designing; used in cert PDF and eventually marketing pages.
- **Site design** — Max presenting 3–5 design options for Rob to review.

---

## Untracked Gaps (no REQ-ID — needs to be added to requirements)

- **Admin self-training access** — the firm admin can enroll themselves during
  onboarding ("enroll self" checkbox) but there is no UI path from the dashboard
  to their own training page (`/dashboard/training`). No DASH or COURSE requirement
  covers this. It is NOT a Phase 3 item — Phase 3 (DASH-01..09) covers employee
  management only. This needs a new REQ-ID and a home in an upcoming phase.
  Suggested fix: add a "My Training" card or link on the admin dashboard that
  appears only when the admin is enrolled, pointing to `/dashboard/training`.

---

## Phase 4 Addition — Auto-reminder settings

- **Admin-configurable auto-reminders** — let the firm admin set a rule like "remind
  employees automatically if they haven't completed training after X days." Currently
  the Remind button is manual only (DASH-04). This extends AUTO-03 (the Phase 4 cron
  job) to also handle inactivity-based reminders, not just pre-expiry reminders.
  Requires: new `reminder_days` column on `firms` table, a settings UI card on the
  dashboard where admin picks the delay (e.g. 3 / 7 / 14 days), and the cron job
  reading that setting before firing. Build alongside AUTO-03 in Phase 4.

---

## Not Started (post-Phase 2)

- Custom domain `training.aistaffcompliance.com` — not configured yet.
- Firm admin dashboard (Phase 3) — staff completion status, scores, cert reprints.
- Renewal flow (Phase 5) — automated reminders at 90/30/7 days before cert expiry.
- Supabase prod project ownership — currently under Max's account; move to Rob's
  before launch (and upgrade to Pro tier).
- ~~Stripe live-mode objects — deferred pending Stripe Tax setup + CPA consult.~~ ✅ **DONE — live since 2026-08-19.** Stripe Tax active, NC registered, live product + price in use. CPA consult on multi-state SaaS sales tax is still worth doing but no longer blocks anything.
