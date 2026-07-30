# 2026-07-30 — Max, terminal

Executed `~/.claude/plans/iurix-access-visibility-brand.md` end to end — six tasks, six commits —
then a seventh for a production brand bug found mid-session. All pushed. Two of the three deploy
targets are live; the app is one `pnpm run deploy` behind.

## The headline: seat occupancy was enforced nowhere

`firm_members.occupies_seat` (added by `0015` yesterday) was **written in two places and read as a
gate in zero**. Every training surface gated on "logged in + has a firm_id" and nothing more. Two
real consequences, both reachable:

1. An **admin who declined training** consumed no seat but could still take the course, **pass the
   certifying quiz, and have a real certificate issued** against capacity nobody paid for. Yesterday's
   seat fix is what made this reachable — before it an admin always consumed a seat, so access and
   billing lined up by accident.
2. A **reassigned employee kept working credentials** — one paid seat, two people able to sign in.

### `ef31d84` — the gate (Task 1)

New **`lib/seats.ts`** holds one predicate: `occupies_seat AND status IN ('invited','active')`.
Deliberately the *same* predicate `sync_used_seats()` uses to count seats, so access and billing
derive from one rule rather than two that can drift — two rules that could drift is exactly how the
original double-count happened. **If this predicate changes, `0015`'s trigger has to change with it.**

Applied to all four surfaces: `dashboard/training`, `dashboard/overview`, `dashboard/quizzes`, and
`api/quiz/attempt` (403, checked **before any write**, so a refusal leaves no enrollment behind).
The three pages render a `SeatGate` state rather than redirecting — they are the employee shell's own
tabs, so a redirect would bounce an unentitled user between two pages neither of which explains
anything.

⚠️ **Not gated on `role`**, deliberately. An admin who opted in is legitimately entitled; employees
are entitled by default. The question is about the seat.

### `c77c100` — admin self-enroll (Task 2)

Task 1 turns "admin declined training" into a wall an admin can't get past alone — nobody else in the
firm can grant them a seat. New `POST /api/firm/enroll-self` flips `occupies_seat`; the trigger does
the `+1` (**no manual seat arithmetic** — that was the bug `0015` removed).

**Deviation from the plan, deliberate:** it also creates the `enrollments` row, mirroring the
`enrollSelf` branch of `onboarding/complete`. The route has to land the firm in exactly the state
ticking the box at onboarding would have, and a missing enrollment row is what makes a member read
as "Not started" on the admin dashboard. Capacity refusal reuses the invite route's message.
Already-entitled callers get 200 so a double-click isn't a failure; suspended/deleted/reassigned rows
are refused — this is a way back in for an admin who opted out, not for a revoked account.

### `4634512` — revoke on reassign (Task 3)

Clears the departing user's `app_metadata` (every gate reads `firm_id` from there).

- **Max's decision, asked not assumed:** clear `app_metadata` **only**. `delete` additionally rewrites
  the email to `deleted-{uuid}@redacted.invalid`, but that is irreversible and a reassignment is a
  seat transfer, not a deletion request. Every record — `firm_members`, `enrollments`,
  `quiz_attempts`, `certificates`, `training_events` — is untouched.
- **Deviation from the plan:** placed **after the swap commits**, not beside the status update at
  `:52` as sketched. At `:52` the two existing rollback paths (`createUser` 409, `firm_members`
  insert failure) would each have to restore `app_metadata` — more code and a new failure mode.

## `e8c1864` — invite email failures (Task 4) — **has a migration**

Both invite routes caught the send error, `console.error`'d it, and returned `success: true`. By then
the auth user, the `firm_members` row and **the seat** are all real — so a hard failure produced a
paid-for member who never got an email and an admin told it worked. **That is how the Resend 403 went
unnoticed for days.**

`/api/invite` → `{ success: true, emailSent }`; `/api/invite/bulk` → `emailFailed[]` alongside the
counts (those rows stay in `invited` — the seat is real). **Still 200, deliberately:** a 4xx/5xx
invites a retry that would only fail on "an account already exists with this email."

**Migration `0016`** adds `firm_members.invite_email_failed` so the failure outlives the toast. A
column rather than a `training_events` row because this is *current state*, not an audit fact — the
question is "does this person still need a resend?", which off an append-only log means comparing
latest-sent against latest-failure on every render. The team table badges the row **"Invite not
delivered"**; a successful `/api/invite/resend` clears it. No operator alert — that rides the same
channel that's broken.

⚠️ **`types/supabase.ts` was hand-patched** with the new column so `tsc` would pass, which
contradicts CLAUDE.md's "never hand-write DB types." **`db push` has been applied** (verified — see
below), so `supabase gen types` should now be a no-op diff. **If it isn't, the hand-patch was wrong.**

## `56f58dd` / `de04d35` — retired branding (Task 5 + the new bug)

`atc-logo.tsx` still rendered the literal `athena.` wordmark on `login`, `forgot-password`,
`update-password`, `onboarding` and `site-header` — retired branding on the pages a customer sees
before signing in. The site footer had the same string. Wordmark → `IURIX`; **monogram SVG
deliberately unchanged** (Max — the Iurix mark isn't final). The wordmark is still **text, not an
asset**; same interim stand-in as the email shell and cert PDF header, and **all three want a second
pass when Rob's real wordmark lands.**

Also `emails/employee-invite.tsx` promised *"a short video course (~20–30 minutes)"* — it's Rise
interactive content, and that line is the first thing a firm's staff reads.

**`de04d35` — found live in production mid-session:** `© 2026 Built Smart by Rob. All rights
reserved.` on the homepage and `/pricing` (`footer.tsx:73`, `features-section.tsx:97` + `:120`). Per
locked decision #3, BSBR is a **sibling brand, not this product's publisher**. Replaced with `IURIX`,
**not** the `BSBR Holdings, LLC d/b/a Iurix` entity form — that belongs on legal pages only.

⚠️ **Why the earlier sweep missed it:** these files were being treated as the redesign branch's
territory. **That branch hasn't landed, so this is the code actually serving traffic.** Worth
carrying: "Rob's redesign will replace it" is not a reason to leave a live string wrong.

`app/api/certs/drain/route.ts:5` still holds `rob@builtsmartbyrob.com` — **left deliberately**, it's
an operator alert address, not a publisher attribution.

## `b30b2a6` — cutover runbook corrections (Task 6)

Both from things that actually went wrong on 07-29:

- **§C1 was wrong and cost several hours.** It listed only `wrangler.jsonc:9` for
  `NEXT_PUBLIC_APP_URL`. Next inlines `NEXT_PUBLIC_*` into the **client bundle at build time** from
  `.env.local` / `.env.production`; `wrangler.jsonc` vars are **runtime-only and never reach the
  browser**. Three deploys produced an identical chunk hash. Both env files are now listed and
  flagged **gitignored — the edit doesn't travel with a commit; every machine that deploys needs it.**
- **§E2 assumed one webhook; there are two.** `cert-queue-generate` (→ the app, the live one) and
  `cert-worker-quiz-pass` (→ `bsbr-cert-worker`, whose `fetch` handler `void`s the payload and returns
  200 — **permanently inert**). Documented as known-inert so nobody deletes it blind or re-verifies it
  a third time hunting a cert bug. The worker's **cron** handler is real and load-bearing —
  inertness applies to the HTTP handler only.
- **Phase D:** the cert-worker deploy needs `--config wrangler.toml`, or wrangler walks up to the root
  `wrangler.jsonc` and **redeploys the main app over itself while reporting success.**

## Deploy + verification

**Verified live, not assumed:**

- **Migration `0016` IS applied.** Probed the staging DB directly (`ndmzvtuywcufvkxtkjhg`): both
  `occupies_seat` and `invite_email_failed` return 200. This was the one thing that could break
  silently — `dashboard/page.tsx` selects that column, and without the push the admin team table
  would render **empty**.
- **Task 5 shipped:** `/login` returns **zero** "athena" occurrences; `IURIX` wordmark renders.
- **Task 2's route shipped:** `POST /api/firm/enroll-self` → 401 unauthenticated, while a bogus
  sibling path → 404. The 401 means the route exists and rejects, not a miss.
- **Cert-worker redeployed** from clean `main` — version **`ca2183d1`**, `APP_URL` =
  `https://iurixaccreditation.com`, `FROM = 'IURIX <noreply@iurixaccreditation.com>'`. **This settles
  the 07-29 ambiguity** (its previous deploy predated the `noreply@` commit and could not be resolved
  by inspection).

## Status

`main` == `origin/main` at **`de04d35`**, working tree **clean**. `tsc --noEmit` and full `eslint`
clean. 7 commits pushed.

## 🔴 Open / next

1. **`pnpm run deploy` — the app is one deploy behind.** `de04d35` (the BSBR marketing fix) is pushed
   but not live. **Confirmed still broken in production**: `"Built Smart by Rob"` returns **2
   occurrences on `/` and 2 on `/pricing`** as of wrap-up. Re-run that grep after deploying — verify
   the homepage and `/pricing`, **not just `/login`**.
2. **The seat E2E walkthrough — still never run**, and now has more to prove. Decisive checks: as an
   admin who opted **out**, `/dashboard/training` must show the enroll offer, not the course, and a
   direct `POST /api/quiz/attempt` must **403**; after "Enroll me", `used_seats` rises by **exactly
   1**. As an opted-**in** admin and as a normal employee, nothing changes. Reassign an employee, then
   confirm the departing user can't reach the dashboard while their cert/quiz/event rows survive.
   **Two traps carried from 07-29 still apply:** inviting alone cannot detect a double-count (the old
   double fired at *activation*), and a 5-seat firm with an enrolled admin is admin + **4** employees,
   so the 5th is *correctly* refused.
3. **Re-run `supabase gen types`** to confirm the hand-patched `types/supabase.ts` round-trips.
4. **Task 4 needs a live negative test:** break `RESEND_API_KEY`, invite someone, confirm the UI says
   "Member added, but the invite email couldn't be sent", the badge persists **across a reload**, and
   a successful resend clears it.
5. **`info@aistaffcompliance.com` still hardcoded in 5 places** — cutover C4, blocked on Rob's
   business contact address. `noreply@` cannot substitute; these are "contact us" links.
6. **`accreditation@iurixaccreditation.com` mailbox still does not exist** — printed on every cert.

## Long-carried (unchanged)

Auth perf ~5s/route (diagnosed, ~7 files, **awaiting Max's go-ahead since 07-17**); real question pool
(Katy/Rob); Stripe live mode; Katy's disclaimer copy + an attorney name for the cert signature line;
the decorative half of the cert (seal, real QR — the QR needs a verification endpoint that doesn't
exist); no wordmark asset; 3.4MB brand SVG needs SVGO; `certificate_number_seq` dead and droppable.
