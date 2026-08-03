# Session summary — 2026-07-31 (Max, terminal)

24 commits. Four blocks of work: a doc-accuracy pass, three implementation batches, and a
types verification. **All 24 pushed and deployed.**

> *Corrected 2026-08-03.* This opening previously read "22 commits ... **Batch 3 (5 commits) is
> committed but NOT pushed**". Batch 3 was pushed the same evening (see Status below, itself
> corrected in place on 07-31). The true count is **24** commits dated 2026-07-31, `5370fc3`
> through `277056f`. The "22" was already wrong when written: the file was committed at
> `7f65a19`, which was the 23rd commit of the day.

---

## 1 · `.planning/STATE.md` doc-accuracy pass (`5370fc3`)

STATE.md had drifted since 2026-07-26. Re-verified eight claims against the code by grep and
file read; seven were stale.

- **The rename is executed**, not pending. Zero `Built Smart by Rob` in source. `athena`
  survives only as six cosmetic CSS class/keyframe names in `app/globals.css` plus five
  explanatory comments — no user-visible string.
- **Live URL is `iurixaccreditation.com`**, not the `workers.dev` sandbox. No `workers.dev`
  string exists anywhere in source. `bsbr-cert-worker` relabelled as a deploy-target name,
  not a URL the app calls.
- Closed: the domain item, the course-name decision, Resend domain verification (Rob
  confirmed DKIM/SPF/DMARC 07-29), and the cert-PDF logo placeholder.
- Migration high-water mark corrected `0013` → `0016`.

**Logo blocker narrowed, not closed.** Cert PDF, favicon and emails all carry Iurix now. What
remains: `app/_components/atc-logo.tsx` still inlines the retired atc monogram — path geometry
byte-identical to the deleted `public/atc-athena-logo.svg` — and it renders in the site header,
login, onboarding, forgot-password and update-password. Plus no "Iurix Accreditation" wordmark
asset exists; three places use a text stand-in.

---

## 2 · Batch 1 — six independent fixes (`8e1e6cc` → `0601f68`)

- **`/cookies` route created, structure only.** Loud placeholder markers, no legal language,
  not linked from any nav. Max drafts, Katy/Rob approve.
- **Sign-in footer:** Terms now links (the page has existed since Phase 0; the "no page yet"
  comment outlived the gap). Cookies span removed until copy is approved. Support mailto
  repointed off the retired `aistaffcompliance.com` to `solarsaiko@gmail.com` — the same
  inbox `app/api/support/contact/route.ts:8` already uses. **The other four occurrences in
  privacy/terms/dpa/stripe-webhook were deliberately left.**
- **Dead "View who's left" link removed.** Its only behaviour was `scrollIntoView` on a
  section already on screen — a literal no-op on lg+.
- **Two orphaned Athena assets deleted** (zero code references).

### The two repeat-failure fixes — real causes

**Quiz fixed width.** The full-screen work (`dad01e6`) did not fail; its job was height and it
works. Width was never touched: all three band-inner wrappers carried `max-w-4xl` (896px), so
~1000px sat empty either side at 1920px. The bands are full-bleed by design, which is why it
read as a fixed-width card on a correctly-filling background. Widened the existing cap on each
rather than stacking a new one. **All three ladders must stay identical** or the progress bar,
question card and action bar stop lining up.

**"Your path" got bigger, not smaller.** Both halves of the previous fix were inverted.
*Size:* the box is `aspect-[4/7]`, so width is the only size input and height follows at
1.75×. Growing `max-w` to 520px made the map **910px tall**. The cap is now derived from
viewport height and converted back through the same ratio. **Do not use `max-h`** — the 4:7
ratio is load-bearing (SVG viewBox is 400×700 while labels are positioned as % of the box);
capping height would hold the width, break the ratio, and slide every label off its dot.
*Clipping:* `--lbl-gap` was keyed to viewport width, but the map's width is **not monotonic**
in viewport width — below `md` the grid is one column and the map is at its widest; at exactly
`md` the 12-col grid engages and it hits its narrowest (~222px), which is where `sm:` had
already restored the wide gap. Now keyed to the box's own width via `@container`.

---

## 3 · Batch 2 — reminder correctness + auto-renewal disclosure (`484e318` → `cc5d969`)

- **`0017` adds `nudge_sent`.** The manual Remind button sent an email and recorded nothing,
  so the most deliberate supervision act in the product was the only one leaving no Rule 5.3
  evidence. Separate type, not a reuse of `inactivity_reminder_sent` (Max's call).
- **Nudge event + 48h rate limit.** The write lives in `/api/invite/remind`, **not** in
  `sendTrainingReminder` — the helper's other caller `/api/invite/resend` is the recovery path
  for a *bounced invite*, and logging that as a nudge would record "the attorney chased this
  person" when our own email failed, and would let the 48h limit block a delivery-failure
  retry. `metadata.triggered_by` carries the admin's id; that attribution is the evidence.
- Cron dedupes against nudges too; "Remind" → "Nudge" in visible copy only.
- **Renewal dedupe 24h → 8 days.** The window equalled the cron period, so the two raced. The
  real error was measuring against the wrong thing: buckets match within ±1 day, so days 31/30/29
  all qualify and a 24h memory lets day 31 forget day 30 — up to 3 sends.
- **Lapsed firms: 30/7, admin only.** `firms.status` is CHECK-constrained to
  `('active','payment_failed','cancelled')` — verified in `0001:45-46`, since the generated
  type is a bare `string`. `payment_failed` is the common case, not `cancelled`.
- **Auto-renewal disclosed before payment** on the pricing page, and the renewal email now
  states the card will be charged. **No dollar amount** — volume bands, mid-term seat changes
  and Stripe-side tax mean the worker cannot compute a reliable figure.
- Settings → Billing section added.

### `0017` was wrong once and had to be rebuilt (`61965d7`)

Max caught it. The list was copied from `0006`, which was **not** current — six migrations
redefine that constraint and `0011` is the live one. Because each restates the whole list,
sourcing from an older one **deletes** everything added since: `knowledge_check_completed`
(`0009`) and `lesson_location_changed` (`0011`). Both are load-bearing — `lib/training/progress.ts`
derives lesson state from them, the Overview feed renders them, and the reassign progress lock
reads them. Applying it would have failed every knowledge-check submit and every lesson-boundary
write. **Rule for `0018`: always diff against the latest definition, never the one a previous
task happened to touch.**

---

## 4 · Types verification — the hand-patch was correct

`types/supabase.ts` was hand-edited on 07-30 with `0016`'s `invite_email_failed`, contradicting
CLAUDE.md. Verified: CLI linked to **IURIX STAGING** (`ndmzvtuywcufvkxtkjhg`), not PROD.
Generated to a temp file and diffed — **byte-identical** (`md5 72de31fc…`). No change, no commit.

The outcome was fine; the process still was not. One boolean across three blocks is the easiest
possible case to get right by hand. The CLI is linked and working on this machine.

---

## 5 · Batch 3 — the billing page (`368dff4` → `612dc56`) — **PUSHED + DEPLOYED**

Settings' Billing section had two rows that both deep-linked the same Stripe portal, so "Cancel
auto-renewal" was a second door to the same room. Now: `/dashboard/billing` owns state and the
renewal switch, the portal owns the payment method.

- `GET /api/billing/summary` — subscription state + last 12 invoices. `cancel_at_period_end`
  is read **live**, no column: `firms.status` cannot express it (a subscription ending at the
  boundary is still `active`, correctly).
- `POST /api/billing/auto-renew` — both directions. Resume is the win-back path that avoids
  the `ix-doublebill` checkout collision entirely.
- Page with a **confirm step, not a toggle**; resume gets no confirmation because it is not
  destructive. Cancellation email on cancel only, no operator alert.

**Verified live against the sandbox** (`acct_1ThDpr6ZCSojEKRr`): cancel → `status=active`,
`cancel_at_period_end=true`, period end unchanged (2027-07-30); resume → back to false. All ten
sandbox subs restored to baseline. **`status=active` + `cancel_at_period_end=true` is the entire
design** — never `subscriptions.cancel()`, which would destroy paid-for access.

---

## Status

| | |
|---|---|
| `tsc --noEmit` | clean |
| `eslint .` | clean |
| production build | succeeds |
| `origin/main` | `277056f` — all 24 commits pushed |
| local `HEAD` | `277056f` — in sync, tree clean |
| deployed | app `21:01:39Z` (`0c4e7ff8`) · cert-worker `19:48:34Z` |
| `0017` | **applied** — confirmed local/remote/time via `supabase migration list --linked` |

*The four rows above were written mid-wrap, when nothing was pushed or deployed and `0017` was
recorded as unapplied. All of it completed minutes later; corrected in place 2026-07-31 21:05Z.*

---

## Next steps — all three closed at wrap

1. ~~`supabase db push`~~ — **done.** `0017` is applied; the nudge audit row writes and the cron's
   nudge-dedupe is live. The earlier claim that it had not run was wrong.
2. ~~Push Batch 3~~ — **done.** All 24 commits are on `origin/main` at `277056f`.
3. ~~Deploy~~ — **done.** App at `21:01:39Z`; cert-worker at `19:48:34Z` and untouched by Batch 3
   (`git diff 61965d7..7f65a19` returns no `workers/cert-worker` paths).

**Live-verified after deploying:** `/api/health` ok · `GET /api/billing/summary` → 401 · `POST
/api/billing/auto-renew` → 401 · `GET /api/billing/auto-renew` → 405 · bogus sibling → 404 ·
`/cookies` 200.
4. **Live-test the nudge** after the migration: nudge → `nudge_sent` row with `triggered_by` →
   second nudge returns 429 → row appears in the audit CSV export.
5. **Eyeball the two layout fixes** (quiz width, path map) — geometry-derived, not measured.
6. **Review the billing confirm copy and the cancellation email** — my wording against Max's
   three required facts; the email has never been rendered.

## Open questions

- **The retired monogram in `atc-logo.tsx`** — ships on five auth/marketing surfaces. Blocked
  on Rob's final mark; the wordmark asset still does not exist.
- **`app/dashboard/settings/page.tsx` has a footer link labelled "Cookies" pointing at `/dpa`.**
  Pre-existing mislabel. `/cookies` now exists and could serve it once copy is approved.
- **The four remaining `info@aistaffcompliance.com` occurrences** (privacy, terms, dpa, Stripe
  webhook operator alert) — still on the retired domain, still deliberately untouched.
- **GSD is not installed here** and cannot be restored as-is: `gsd-build/get-shit-done` was
  archived 2026-06-26 and its successor `open-gsd/gsd-core` uses `/gsd-*` (hyphen), not the
  `/gsd:*` CLAUDE.md documents. Rob is on the archived version. Since `.planning/` is shared
  and committed, this is a decision for both of you, not a local install.
