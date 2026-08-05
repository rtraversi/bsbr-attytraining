# Session Handoff

**Date:** 2026-08-05 (**Rob**, terminal). Merge + CI. Everything is pushed to `redesign-iurix`.

> ## 🚀 The redesign is LIVE on iurixaccreditation.com (2026-08-05 19:11 UTC)
>
> Production version **`2c8bf062-378b-4149-9fb2-26c18ec1fb05`**, deployed by CI from `3e8761e`.
> Rob reviewed the preview and approved promotion.
>
> Verified live: `/`, `/pricing`, `/privacy`, `/terms`, `/dpa`, `/login`, `/verify` all **200**;
> `/cookies` and `/mockup` **404** as intended. The homepage carries `bg-marble` and *Reduce your
> exposure* with no `athena-*` CSS left. `/pricing` shows both the auto-renewal disclosure and the
> US-only declaration. The browser bundle has the Supabase URL and publishable key inlined and no
> `localhost:3000`.
>
> **Rollback:** `wrangler rollback --name bsbr-attytraining`. The pre-redesign build is
> **`a0323ac4-e7f3-44d1-8e0e-9071b5dc241d`** (2026-08-05 13:25 UTC).
>
> **The merge is done.** Do not redo it. `.planning/MERGE-GUIDE.md` is history.
> **`.planning/DEPLOY-RUNBOOK.md` is fully worked through.** Deploys now go through CI:
> Actions → *Build & deploy* → Run workflow → `target: production`.
>
> Rob rolled the Cloudflare API token on 2026-08-05. It lives in exactly one place, the GitHub
> Actions secret — **there is nothing to update on the Cloudflare side.** Neither Worker holds a
> `CLOUDFLARE_API_TOKEN` and no source file reads one; it is a deploy credential, not a runtime
> one. Local wrangler authenticates by OAuth, so rolling it does not affect anyone's machine.

## ✅ What happened this session

**1. The five GitHub Actions secrets were added.** Zero existed before — runbook step 2 had never
been done. This is what removes the Mac dependency.

> ⚠️ **The runbook's step 2 table is wrong on one row.** It says to copy `NEXT_PUBLIC_APP_URL`
> "from `.env.local`", but that file holds `http://localhost:3000`, which is correct for
> `next dev` and wrong for a build. `NEXT_PUBLIC_*` is inlined into the browser bundle at build
> time, and `app/forgot-password/_components/forgot-form.tsx` is a client component — that value
> would have shipped password-reset links pointing at localhost. The secret is set to
> `https://iurixaccreditation.com`, matching the `vars` block in `wrangler.jsonc`. Fix that row
> before anyone follows the runbook again.

**2. Six "successful" CI runs had never uploaded anything.** The upload step ran
`opennextjs-cloudflare upload | tee upload.log`. A bash pipeline exits with `tee`'s status, so
wrangler's failure was masked and the job went green while printing "Preview uploaded". Fixed with
`set -o pipefail`. This is why the run today fails loudly instead of lying.

**3. `main` is merged into `redesign-iurix`** — Max's 26 commits, 12 conflicts, resolved per the
merge guide. Highlights:

- **Avatars stay removed.** Max's signed-URL work is superseded, not rejected. `lib/avatars.ts`,
  the upload route and the upload component are deleted; the three dashboard files took main's
  version with avatar rendering stripped.
- **`pricing-slider` keeps all of Max's logic** — US-only checkbox, `billingCountry` in the
  checkout body, real server errors — restyled for the light page. The checkbox arrived with
  `text-white/60` and `text-white/35`, which measure **2.85:1 and 1.41:1 on the white card**.
  A legally required disclosure at 1.41:1 is invisible. Now `text-ink-soft` (9.23:1) and
  `text-ink-mute` (5.19:1), accent moved off the dashboard blue to `accent-teal-mid` (6.32:1).
- **Legal pages** take the redesign's template. Both branches' page bodies were byte-identical
  `[ATTORNEY TO COMPLETE]` drafts, so no copy was at stake. main's `LegalPlaceholder` was carried
  across for `/cookies`.
- **`0018_remove_avatars.sql` → `0023`** (second collision for this file). Its rationale was
  rewritten: it no longer drops a *public* bucket, because `0019` runs first and already set
  `public = false`.

**4. Two unshippable routes now 404 in production.** Both were unlinked, which is not the same as
unreachable — Next serves them to anyone who types the URL.

- `/cookies` — its own header comment says **MUST NOT SHIP**; it rendered
  "▮▮▮ NO COPY WRITTEN ▮▮▮ … do not deploy" across seven sections.
- `/mockup` — the superseded "Warm Counsel" concept, a whole alternative homepage **with its own
  pricing section** in a palette the product no longer uses.

Both stay viewable under `next dev`. Delete the guards when the copy lands / the concept is retired.

## 🟢 The preview, and what was verified against it

Run `31036234368`, version `26a860e7-8637-41e9-9897-928d29a1da6b`, built from `4eaf7c1`.

```
/          200      /dpa       200      /cookies   404  ← intended
/pricing   200      /login     200      /mockup    404  ← intended
/privacy   200      /verify    200
/terms     200
```

**The browser bundle is correctly wired**, which is the failure the runbook warns is invisible:
the Supabase URL and the `sb_publishable_` key are both inlined, and `localhost:3000` appears
nowhere. Had `NEXT_PUBLIC_*` been missing or wrong, the build would still have gone green and
sign-in would have broken silently.

Content confirmed live: the *Reduce your exposure* section, `info@iurixaccreditation.com` in the
footer, and on `/pricing` both the auto-renewal disclosure and the US-only declaration with its
corrected `text-ink-soft` / `accent-teal-mid` palette.

**A note on the earlier token failure, in case it recurs.** The first token produced
`Invalid format for Authorization header [code: 6111]` — the token *string* was malformed as sent,
not a permissions problem. If that appears again, the usual causes are a Global API Key used in
place of an API token (Global keys need `CLOUDFLARE_EMAIL` + `CLOUDFLARE_API_KEY` and cannot be a
bearer token), whitespace in the paste, or the token's ID copied instead of its value. Verify
before setting:

```bash
curl -s https://api.cloudflare.com/client/v4/user/tokens/verify \
  -H "Authorization: Bearer <TOKEN>"        # expect "status":"active"
```

**The workflow does not print the preview URL.** Its grep expects a `workers.dev` string that
`opennextjs-cloudflare upload` does not emit, so the run summary says "Preview uploaded" with a
blank line under it. Build the URL from the version ID instead: the first 8 characters, then
`-bsbr-attytraining.aistaffcompliance.workers.dev`. Worth fixing in `deploy.yml` at some point.

## ⚠️ Read before promoting to production

1. **A customer email promises a refund nobody has automated** (carried from Max's 08-03 handoff).
   The operator alert carries a 🔴 REFUND line, but if Rob does not act on that email, we have told
   a customer in writing that money is coming back. **Resolve the wording before deploying.**
2. **`[ATTORNEY TO COMPLETE]` is on `/privacy`, `/terms` and `/dpa`** — and is already live on
   production today, so this is not a regression this deploy introduces. It is still unfinished
   legal copy on a paid compliance product.
3. **390px mobile has never been checked by anyone.** The browser extension would not change the
   viewport for Rob, and it is not connected on this machine either. Needs one pass in the DevTools
   device toolbar. The header is the risk: enlarged lockup plus four nav links.
4. **`supabase db push` has not been run** for `0023_remove_avatars.sql`.
5. **Four features are advertised before they exist** (policy generator, website token, sanction
   summaries page, per-staff signed attestations). Rob's call, flagged in code comments.

## 🔴 The live site runs on the STAGING database — resolve before real customers

Found 2026-08-05 while verifying accounts before the promotion. **This predates the redesign and
the deploy did not change it** — the pre-redesign build and the new one inline the same project.

| Project | Ref | Status |
|---|---|---|
| **IURIX STAGING** | `ndmzvtuywcufvkxtkjhg` | ACTIVE_HEALTHY — **this is what production uses** |
| **IURIX PROD** | `ttqthtzdjacrhjtrcmmy` | **INACTIVE** — created 2026-06-11, appears never used |

`iurixaccreditation.com` inlines the STAGING ref in its browser bundle, and `.env.local` points
there too, which is where the CI secrets were copied from. IURIX PROD is paused — free-tier
projects pause after 7 days idle, which is exactly the failure mode CLAUDE.md calls "fatal for
prod."

STAGING currently holds **17 firms (all 17 carrying a `stripe_subscription_id`), 55 members, 12
certificates, 13 quiz attempts**, newest firm 2026-07-30. These are almost certainly test records:
checkout hardcodes `price_1TjNHc6ZCSojEKRrKs79ToJ0`, which CLAUDE.md verified as `livemode: false`.
**Stripe is still in sandbox, so no real money has moved.** Confirm that before assuming it.

**Rob is upgrading to Supabase Pro within 24 hours of 2026-08-05** and activating the prod DB. The
decision that comes with it: either IURIX PROD becomes the real production database (and the three
`NEXT_PUBLIC_SUPABASE_*` values change in `.env.local`, the Worker secrets **and** the GitHub
Actions secrets — all three, or sign-in breaks silently), or STAGING is promoted in place and a new
staging is stood up. Whichever way, migrations `0001`–`0022` must exist on the target before it
takes traffic, and `0023` still needs applying anywhere.

> 🔴 **`www.iurixaccreditation.com` returns 522 and has done consistently.** DNS resolves to
> Cloudflare, but the response carries **no `x-opennext` header**, so www is not bound to the
> Worker the way the apex is — Cloudflare accepts the request and then has no origin to reach.
> Anyone who types the `www.` form gets a Cloudflare error page. This is broken *now*, is
> independent of the redesign, and **promoting will not fix it** — it needs a custom-domain or
> redirect rule added in the Cloudflare dashboard (Rob owns that).

> ⚠️ **The rollback target this document used to name did not exist.** It said
> `0cd156ef-1b0e-4b5d-a43a-3a95f0e63039`, which appears in **zero** of the Worker's 10 deployments —
> following it during an incident would have failed at the worst possible moment. Rollback is
> `wrangler rollback --name bsbr-attytraining`; the real last-known-good is
> **`a0323ac4-e7f3-44d1-8e0e-9071b5dc241d`**. Re-check with
> `wrangler deployments list --name bsbr-attytraining` before relying on it — production was
> deployed by CLI as recently as today.

## ⛔ Still true: never build Cloudflare artifacts on Windows

`opennextjs-cloudflare build` / `deploy` bake Windows path separators into the server manifests and
produce a Worker that **500s on every route**. It looks like a clean build. `next dev`, `pnpm build`,
`tsc` and the test suite are all fine on Windows — only the Cloudflare bundling is broken. CI does it
on Linux. `.planning/DEPLOY-CHECKLIST.md` (June) still says `pnpm run deploy`; that advice predates
the discovery and is safe only on macOS/Linux.

## ✅ Verified this session

- `tsc --noEmit` clean · `next build` passes, all routes present · **33 tests pass** in 4 files
- CI builds the merged tree on Linux and passes the no-Windows-paths assertion
- `/pricing` still renders both the auto-renewal disclosure and the US-only declaration
- `cookies.html` no longer contains "NO COPY WRITTEN"; `mockup.html` no longer contains its body
- No avatar references survive outside migration history

## Next steps

1. **Supabase Pro + activate the prod DB** — Rob, within 24h of 2026-08-05. See the STAGING/PROD
   section above; if the project ref changes, all three copies of the `NEXT_PUBLIC_SUPABASE_*`
   values must change together.
2. **Fix `www.iurixaccreditation.com`** — it still 522s. Dashboard action, Rob.
3. Resolve the refund-email wording (blocker 1 below) — deferred during the deploy, still open.
4. **390px mobile** — the site is live and still has never been checked at that width.
5. `supabase db push` for `0023`.
6. ~~Merge `redesign-iurix` → `main`~~ — done 2026-08-05, `main` now matches what is live.
7. Still open: `/about`, `/contact`, `/ai-policy` have no copy; $35 vs $39 undecided (Stripe first
   if it changes); Twilio voicemail line (`.planning/BACKLOG.md` item 7).

## 🔴 Carried from Max (c9d5665) — do NOT configure Cloudflare Email Routing

Max's 08-05 commit landed while the deploy was running and the handoff was being rewritten; this
warning is reproduced here so the rewrite does not bury it.

Earlier notes called Cloudflare Email Routing "verified safe: the apex has zero MX and zero TXT."
**That was true on 2026-08-03 and is false now.** The DNS changed on 08-04 — the apex carries
**Zoho MX** (`mx.zoho.com`, `mx2`, `mx3`) and `v=spf1 include:one.zoho.com ~all`. Configuring
Email Routing would **overwrite those MX records and break inbound mail**. Caught by Max, verified
by dig.

Resend looks unaffected: DKIM at `resend._domainkey` intact, the `send.` subdomain keeps its own MX
and SPF, DMARC on relaxed alignment. ⚠️ **Not fully verified** — the Resend API key is send-only and
cannot list domains, so the only real test is sending a message. A mail change broke everything for
days on 07-29; do not assume.

Two code comments now say the opposite of the truth and still need correcting: `lib/resend.ts:2-5`
and the equivalent block in `workers/cert-worker/src/index.ts`, both of which justify the `noreply@`
sender with "the zone has no inbound MX, so replies would bounce."

Max also added `.planning/POLICY-DECISIONS.md` (his decisions, dated, so the four legal drafts can
be traced rather than invented) and resolved the retention contradiction in
`.planning/DATA-INVENTORY.md`: **keep `training_events` rows, strip the identifiers.** The row is
the Rule 5.3 evidence a certificate rests on. Consequence for the Privacy Policy — training
activity is retained as long as the certificates it supports, which is indefinitely, and that must
be stated.
