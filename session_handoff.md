# Session Handoff

**Date:** 2026-08-05 (**Rob**, terminal) — second session of the day, after the redesign deploy.
Runs alongside Max's `9986459`. **Max: start with `.planning/OPEN-ISSUES.md`, then
`.planning/PROD-CUTOVER.md`.**

---

## 🚀 Production right now

**Version `54206300-7fc4-4f69-b98e-0714f56b951b`**, deployed by CI from `839918f` on `main`.
`main` matches production.

Verified live: `/`, `/pricing`, `/privacy`, `/terms`, `/dpa`, `/login`, `/verify` all **200**;
`/cookies` and `/mockup` **404** as intended.

**Rollback:** `wrangler rollback --name bsbr-attytraining` → last-known-good
**`61b5a5fe-13e2-4de3-ac09-69c3e95c3606`**.

> ⚠️ **This document's deploy facts were wrong twice in one day.** The previous version named
> production as `2c8bf062` and rollback as `a0323ac4`; live was actually `61b5a5fe`, because
> `418f079` shipped at 19:29 after the handoff was written. The version before that named a rollback
> target present in **zero** of ten deployments. **Re-check with
> `wrangler deployments list --name bsbr-attytraining` before relying on any ID in here.**

---

## ✅ What happened this session

**1. The homepage was redesigned and is live.** The page had one contrast event (the closing panel);
`marble` → `marble-deep` is a ~3% shift, so five of six sections read as one field. The hero now sits
on `teal-ink`, the ground the brushed-metal mark was actually rendered for — `globals.css` already
documented the cost of ignoring that. The page runs dark → light → dark. `teal-ink` is now a rule,
not a decoration: it marks the seal, the rulings, the price, the sign-off.

Fixed a real distortion bug on the way: the mark `<img>`s carry `width`/`height` attributes, so
sizing one axis in CSS leaves the other in force. `h-auto` is now explicit on both, with a comment.
Tailwind preflight meant the shipped site was never affected.

**2. Stripe price resolution by lookup key — built and verified, NOT deployed.**
Branch **`stripe-lookup-key`**, preview `5e7c5507-bsbr-attytraining.aistaffcompliance.workers.dev`.
Checkout no longer hardcodes a `livemode:false` price ID; it resolves by `lookup_key`, with a
fallback **gated on the secret key being a test key** so sandbox is unchanged today and live mode
refuses rather than charging against a price nobody chose. Waiting on Rob to merge.
Detail in `.planning/sessions/20260805-rob-summary.md` §2.

**3. IURIX PROD is schema-complete and seeded — but nothing points at it yet.**
Everything about this is in **`.planning/PROD-CUTOVER.md`**. Read it before touching either database.

---

## 🔴 The finding that matters most

**Four objects are not in the migrations.** Applying `0001`–`0023` to a fresh Supabase project does
**not** produce a working IURIX database:

| Missing | Consequence |
|---|---|
| `certificates` storage bucket | Cert generation dies at the storage write, **after** the quiz is passed |
| The `courses` row | Nothing to enrol into; `0003`'s quiz seed is gated on it and silently no-ops |
| **Database Webhook on `quiz_attempts`** | **A passed quiz produces no certificate. Ever. Silently.** |
| **Database Webhook on `cert_generation_queue`** | The retry path never fires |

Found by diffing **triggers**, not tables — tables, columns, policies, functions and indexes all
matched staging exactly (13 / 107 / 18 / 9 / 44) while triggers were 2 against 4. A schema diff that
stops at the usual axes misses this completely.

**If you stand up another environment, start from the table in `PROD-CUTOVER.md`, not from
`supabase db push`.**

---

## 🔴 `0023_remove_avatars.sql` cannot run

```
ERROR: 42501: Direct deletion from storage tables is not allowed. Use the Storage API instead.
CONTEXT: PL/pgSQL function storage.protect_delete()
```

Supabase now blocks SQL deletes from storage tables. `0023` does exactly that. It is the only
migration unapplied in **every** environment, and being DDL in a transaction it takes the whole batch
down with it. **Whoever next runs `supabase db push` hits this.** Needs rewriting against the Storage
API. Deliberately not recorded in PROD's history, matching staging.

---

## ⚠️ The credential swap is FOUR places, not three

Every earlier doc says three. `workers/cert-worker` is a separate Worker with its own `SUPABASE_URL`
and `SUPABASE_SERVICE_ROLE_KEY`.

| Where | If missed |
|---|---|
| `.env.local` | local dev breaks loudly — harmless |
| App Worker secrets | server calls fail |
| **`workers/cert-worker` secrets** | **crons keep writing to STAGING, nothing errors** |
| **GitHub Actions secrets** | **sign-in breaks silently, CI still green** |

---

## Next steps

> 📋 **`.planning/OPEN-ISSUES.md` is the working list.** This is the short version.

**Rob, to finish the cutover:**
1. Enable **Database Webhooks** on IURIX PROD (no `supabase_functions` schema / `pg_net` on it yet),
   then the two triggers can be recreated
2. Auth → Site URL + redirect allowlist must include `https://iurixaccreditation.com`
3. The four-place credential swap, then verify by grepping the **live bundle** for the project ref
4. Rotate the webhook shared secret for PROD — staging's sits in plaintext in the trigger definition

**Rob, before real money:**
5. Stripe live-mode: decide **$35 vs $39 first**, then Tax registrations, then create the live
   Product/Price **with `lookup_key: per_seat_annual`**, fix `tax_behavior` / `tax_code` / the
   product **name** (still "AI Staff Compliance Training" on every invoice), configure the Customer
   Portal in live mode, new webhook endpoint + secret, live key into **both** Workers
6. **The refund wording** — `route.ts:630` tells a non-US buyer in writing that their payment is
   being refunded. `refunds.create` appears **zero times** in the codebase. Harmless on sandbox
   money; not on real money
7. `www.iurixaccreditation.com` still **522** (verified again this session — apex sends
   `x-opennext: 1`, www sends none)
8. **Real quiz questions.** 8 `PLACEHOLDER`, 0 real, on both databases. `BACKLOG.md` wants 24–32

**Either of us:**
9. Rewrite `0023` against the Storage API
10. Verify Resend by actually sending a message — the key is send-only and cannot list domains
11. `devLink` still renders in production (`invite-form.tsx`, `onboarding-client.tsx`) — backlog #5
12. **390px still never checked by anyone**, and the hero changed shape today
13. `deploy.yml` never prints the preview URL; `DEPLOY-RUNBOOK.md` step 2 and `DEPLOY-CHECKLIST.md`
    both still give wrong advice

---

## Corrections to earlier docs

- **`BACKLOG.md` #2 is DONE**, not open. The webhook resolves identity via `find_user_id_by_email`,
  cancels the duplicate subscription and files a `provisioning_failures` row. **#1 is still open** —
  `/api/checkout` does no identity check, so a returning customer can still reach Stripe.
- **The refund promise is the non-US billing path only**, not the duplicate path.
- **CLAUDE.md says Postgres 15.** Both projects run **17.6.1**.
- The `certificates` bucket being hand-made was documented all along, inside a comment in
  `0013_settings_v1.sql`. Nobody carried it into a checklist. That is what `PROD-CUTOVER.md` is for.

---

## ⚠️ Carried forward from Max — the weekly brief broke and was repaired (2026-08-05)

The brief artifact rendered **completely empty** at the end of the day. Max spotted it.

Its 135 items live in a JavaScript `SEED` array of double-quoted strings, patched by string
replacement. Two edits (`ix-doublebill` on 08-04 and `ix-legaldrafts`) inserted **raw straight double
quotes inside those strings**, terminating the string early, making the whole script a syntax error
and blanking the board. **No data was lost** — the 135 rows and every verbatim decision log were
intact the whole time; only the script failed to execute.

**Rule for anyone patching that artifact:** never insert a straight `"` into a `t:"..."` value. Use
curly quotes, and **parse the `SEED` array under `node` before publishing** rather than trusting the
diff. A silent syntax error in that file is indistinguishable from having lost everything.

Max is doing a manual cleanup pass on the brief on 2026-08-06; several rows are now very long.

---

## ⛔ Still true

**Never build Cloudflare artifacts on Windows.** `opennextjs-cloudflare build`/`deploy` bake Windows
path separators into the server manifests and produce a Worker that 500s on every route. `next dev`,
`pnpm build`, `tsc` and the tests are all fine on Windows — only the CF bundling is broken. CI does
it on Linux. Deploys: Actions → *Build & deploy* → Run workflow. **Pushes only ever build a preview;
production requires a deliberate `target: production` run.**

**Never enable Cloudflare Email Routing on the apex.** It carries Zoho MX (`mx.zoho.com`, `mx2`,
`mx3`) and `v=spf1 include:one.zoho.com ~all` since 08-04; enabling Email Routing would overwrite
those records and break inbound mail. Resend sends from the `send.` subdomain and the two do not
collide.

**The Cloudflare API token lives in exactly one place** — the GitHub Actions secret. Neither Worker
holds a `CLOUDFLARE_API_TOKEN` and no source file reads one; it is a deploy credential, not a runtime
one. Local wrangler authenticates by OAuth, so rolling it affects nobody's machine.
