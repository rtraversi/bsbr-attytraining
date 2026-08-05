# Session Handoff

**Date:** 2026-08-03 (**Max**, desktop + terminal). 11 commits. Two threads: closing the
`ix-doublebill` billing gap, and starting the pre-marketing work Katy asked for.
Full detail in `.planning/sessions/20260803-max-summary.md`.

## 🟢 What shipped

**The record was wrong and is now fixed.** Four documents disagreed about Friday. Actual is **24**
commits on 07-31, not 22 or 23. `session_handoff.md` contradicted itself in one file, `STATE.md`
had gone stale within hours of its own accuracy pass, and `CLAUDE.md` named **retired-account
Stripe objects**. Corrected against the Stripe API rather than another document.

**`ix-doublebill` is built.** The webhook no longer uses account creation as its identity check.
It now asks who the buyer is *before* provisioning, resolving **owner before member, active before
non-active**:

| Buyer | Outcome |
|---|---|
| Owns an active firm | Cancels the **new** subscription only. Never the firm's own. |
| Owns a cancelled/lapsed firm | **Reactivates it** — certificates, staff and audit trail intact |
| Staff at someone else's active firm | Refuses, cancels the orphan, emails the buyer |
| Has a login, owns nothing | Provisions normally on the existing account |

Migration `0018` adds `find_user_id_by_email` (service-role only, verified behaviourally) and a
`provisioning_failures` ledger. `/onboarding` no longer tells a refused customer to "please
refresh" forever.

**Pre-marketing groundwork.** Brand palette locked. Logo hand-traced by Max and cleaned (7 paths,
2.2 KB, versus Rob's 3.4 MB auto-trace). Brand blues **tokenised** so a future palette swap is a
one-file edit. The four legal pages moved onto a shared `LegalPage` component. `.planning/DATA-INVENTORY.md`
built from the live schema as the factual base for Privacy, Cookies and the DPA.

**Production config fixed live.** `OPERATOR_ALERT_EMAIL` was **unset**, so the only alert saying a
customer paid and got nothing was mailing `info@aistaffcompliance.com`, a retired domain. Set on the
Worker at 15:07Z. That took effect immediately without a deploy.

## 🔴 Carry forward — read before deploying

1. **A customer email promises a refund nobody has automated.** The plan told terminal to say "a
   refund is coming" while also forbidding any refund call. Terminal implemented it as written and
   flagged it. The operator alert now carries a 🔴 REFUND line, but **if Rob does not act on that
   email we have lied to a customer in writing about money.** Resolve the wording before deploying.
2. **`[ATTORNEY TO COMPLETE]` is LIVE on production** — 20 times on `/dpa`, 16 on `/privacy`, 20 on
   `/terms`. Anyone visiting today sees unfinished legal pages.
3. **The opacity tokenisation degrades on old browsers.** Tailwind cannot resolve `var()` into its
   alpha literal, so ~35 sites emit an opaque fallback plus an `@supports` `color-mix()`. Below
   Chrome 111 / Safari 16.2 / Firefox 113 those render at **full opacity** — solid cyan where a
   5–15% wash belongs. Lands squarely on the iPad Safari QA gap already tracked in Phase 5.
4. **The legal pages have no header and no way back.** They never did. Deliberately not fixed:
   `SiteHeader` renders the retired atc monogram, so adding it would spread retired branding to four
   more customer-facing pages. Fix together, after Rob's mark.
5. **Two favicon sources.** `app/icon.svg` (new, turquoise `#5CC6C3`) and `app/icon.png` (older,
   more detailed artwork). No SVG rasteriser exists on this machine — Max exports a 512px PNG from
   the same mark in Affinity and both match.
6. **No Open Graph tags anywhere.** Sharing the site renders a bare URL, no title or image. New
   brief row `ix-ogimage`.

## ✅ Status

- **`origin/main` = 11 commits ahead of Friday.** Tree clean.
- **Nothing deployed.** Live is still Friday's build (`0c4e7ff8`, 2026-07-31T21:01:39Z).
- **Migration `0018` IS applied** to the live database, so the DB is ahead of the code. That is the
  correct order and it is safe (additive only).
- `tsc --noEmit` clean · `eslint .` clean · `next build` exit 0, verified independently after each
  commit.
- **The four billing cases have NEVER been executed.** Everything is static verification. This
  cannot close `ix-stripeaudit`.
- Stripe sandbox untouched: nothing created, nothing cancelled. Friday's "all restored" claim
  **verified** — 30 subscriptions, all `active`, zero with `cancel_at_period_end`.

## 📌 Next

1. Resolve the refund wording (#1 above), then **deploy — app only**, no cert-worker changes in the batch.
2. Test all four billing cases with `stripe listen` + `pnpm dev`. Case 3 now cancels, so that is a new case to confirm.
3. Max: draft **Terms first** (no inventory dependency), then Privacy → Cookies → DPA.
4. Max: fill the **Why** and **How long** columns in `.planning/DATA-INVENTORY.md`.
5. ~~Cloudflare Email Routing.~~ 🔴 **DO NOT DO THIS. The advice below is now HARMFUL.**

   *Written 2026-08-03, when the apex genuinely had zero MX and zero TXT records. **The DNS changed
   on 2026-08-04:** the apex now carries **Zoho MX** (`mx.zoho.com`, `mx2`, `mx3`) and
   `v=spf1 include:one.zoho.com ~all`. Configuring Cloudflare Email Routing would **overwrite those
   MX records and break inbound mail.** Caught by terminal, verified by dig.*

   Resend is unaffected so far as can be checked: DKIM at `resend._domainkey` is intact, the
   `send.` subdomain still carries its own MX and SPF, and DMARC uses relaxed alignment.
   ⚠️ **Not fully verified** — the Resend API key is send-only and cannot list domains, so the only
   real test is sending a message. A mail change broke everything for days on 07-29; do not assume.

   Two code comments are now stale and say the opposite of the truth: `lib/resend.ts:2-5` and the
   equivalent in `workers/cert-worker/src/index.ts` both justify the `noreply@` sender with "the zone
   has no inbound MX, so replies would bounce."

## 🔵 Open questions

- **Six in `.planning/DATA-INVENTORY.md`**, four of which change what the legal documents say.
- **For Rob:** the final legal entity name (`ix-entity`) — all four documents change if it moves —
  and where the Rise course is actually served from, which decides whether Articulate must be named
  as a sub-processor in the DPA.
- **Decide analytics before writing the Cookies page.** Today there is **zero** tracking and **no**
  custom cookies, which likely means no consent banner and a short document. That stops being true
  the day anyone adds analytics.
- **`--brand-accent`, `--brand-bg`, `--brand-fg` are dead tokens** carrying retired Athena values
  (`#C8783A` is the old beagle tan). Zero consumers. Left in place with a warning; safe to delete.
