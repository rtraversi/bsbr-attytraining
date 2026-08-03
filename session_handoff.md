# Session Handoff

**Date:** 2026-07-31 (**Max**, terminal). 24 commits across four blocks: a STATE.md accuracy
pass, three implementation batches, and a DB-types verification. **All 24 pushed and deployed.**
Full detail in `.planning/sessions/20260731-max-summary.md`.

> *Corrected 2026-08-03.* This opening previously read "22 commits ... **17 pushed, 5 not**",
> which contradicted the corrected Status block further down the same file. The true count is
> **24** commits dated 2026-07-31 (`5370fc3` through `277056f`), all on `origin/main`.
> Verified: `git log --pretty=format:'%cd' --date=short | grep -c 2026-07-31` returns `24`.

## 🟢 What shipped

**Batch 1 — six independent fixes.** `/cookies` route created as an empty shell (structure only,
loud placeholder markers, not linked anywhere — Max drafts, Katy/Rob approve). Sign-in footer:
Terms now links, Cookies removed until copy lands, support mailto moved off the retired
`aistaffcompliance.com` to the inbox `/api/support/contact` already uses. Dead "View who's left"
link removed. Two orphaned Athena assets deleted. Plus the quiz-width and path-map fixes below.

**Batch 2 — reminder correctness + auto-renewal disclosure.** The manual Remind button now writes
a `nudge_sent` audit row with the triggering admin's id, rate-limited to one per 48h; the cron
dedupes against it; "Remind" is "Nudge" in the UI. Renewal dedupe widened 24h → 8 days. Lapsed
firms get a shorter admin-only expiry cadence. Auto-renewal is now disclosed **before payment**
on the pricing page, and the renewal email says plainly that the card will be charged.

**Batch 3 — the billing page.** `/dashboard/billing` with subscription state, the last 12
invoices, and an auto-renewal switch with a confirmation step. Settings' Billing section reduced
to a pointer.

## 🔴 Carry forward

**`0017` was wrong once — the lesson generalises.** Six migrations redefine
`training_events_event_type_check` and each restates the *whole* list. I built `0017` from
`0006`, which was not current, and it would have **deleted** `knowledge_check_completed` (`0009`)
and `lesson_location_changed` (`0011`) — breaking every knowledge-check submit and lesson-boundary
write. Max caught it. **For `0018`: diff against the latest definition, never the one a previous
task happened to touch.**

**`cancel_at_period_end`, never `subscriptions.cancel()`.** Verified live on the sandbox:
cancelling leaves `status=active` with the period end unchanged, and is reversible in one call.
`.cancel()` would destroy access the firm has already paid for. The billing route carries a
comment saying so, because the failure mode is a plausible one-word edit.

**Two symptoms were the opposite of what they looked like.** The quiz was never height-broken —
three `max-w-4xl` wrappers capped the width. And "Your path" grew because `aspect-[4/7]` means
every 1px of width costs 1.75px of height, so widening it made it 910px tall. Its clipping fix
had also been keyed to viewport width, but the map is *widest* on mobile and *narrowest* at `md`
— the two are not monotonic. Both are now keyed to the right variable.

**The hand-patched DB types turned out correct** — generated output was byte-identical. That
does not make hand-editing safe; it was one boolean across three blocks. The Supabase CLI is
linked to **STAGING** and working on this machine.

## ✅ Status — all three closed at wrap (corrected 2026-07-31 21:05Z)

*The three items below were listed as pending when this file was first written. All three were
completed minutes later. Corrected in place so the next reader is not misled.*

1. **`supabase db push` HAS run — migration `0017` is applied.** Verified against the remote with
   `supabase migration list --linked`: `0017` appears in the local, remote and time columns. The
   nudge audit row writes correctly and the cron's nudge-dedupe is live. *(The original note here
   said it had not run. That was wrong.)*
2. **Everything is pushed.** `origin/main` = `277056f`, local `HEAD` = `277056f`, tree clean.
   All 24 of the session's commits are on the remote, including Batch 3 and this handoff.
   *(`7f65a19` was this file's own commit; `277056f` is the correction that followed it.)*
3. **Everything is deployed.** App deployed **21:01:39Z** (version `0c4e7ff8`), cert-worker
   **19:48:34Z**. Batch 3 touches no cert-worker code, so it needed no second deploy — `git diff
   61965d7..7f65a19` returns zero `workers/cert-worker` paths. `d28576d` from 07-30 was already
   live before today began.

**Verified live after deploying:** `/api/health` ok · `GET /api/billing/summary` → 401 with
`{"error":"Unauthorized"}` · `POST /api/billing/auto-renew` → 401 · `GET /api/billing/auto-renew`
→ 405 (only POST exported) · a bogus sibling route → 404 · `/cookies` 200 · zero
`info@aistaffcompliance.com` on `/login` · zero "Built Smart by Rob" on `/`.

`tsc --noEmit` clean, `eslint .` clean, production build succeeds.

## 🔵 Open

- **The retired "atc" monogram still ships.** `app/_components/atc-logo.tsx` inlines its own copy
  of the old geometry, so deleting the SVG file changed nothing. It renders on the site header,
  login, onboarding, forgot-password and update-password. Blocked on Rob's final mark; the
  "Iurix Accreditation" wordmark asset still does not exist.
- **Settings' footer links "Cookies" → `/dpa`.** Pre-existing mislabel; `/cookies` now exists and
  could serve it once the copy is approved.
- **Four `info@aistaffcompliance.com` uses remain** (privacy, terms, dpa, Stripe operator alert)
  on the retired domain — deliberately untouched, separate blocked item.
- **GSD cannot be reinstalled as-is.** `gsd-build/get-shit-done` was archived 2026-06-26; the
  successor `open-gsd/gsd-core` names its commands `/gsd-*`, not the `/gsd:*` CLAUDE.md documents.
  Rob is still on the archived version, and `.planning/` is shared and committed — so which
  version to standardise on is a joint decision, not a local install.
