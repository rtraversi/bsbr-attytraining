# Session Handoff

**Date:** 2026-08-05 (**Rob**, terminal). Merge + CI. Everything is pushed to `redesign-iurix`.

> ## 👉 One thing is blocking the deploy
>
> **`CLOUDFLARE_API_TOKEN` is set but malformed.** CI now builds the whole app on Linux and passes
> the Windows-path assertion — the upload is the only step that fails, with
> `Invalid format for Authorization header [code: 6111]`. Re-set that one secret and the preview
> ships. Details in *Where it stands* below.
>
> **The merge is done.** Do not redo it. `.planning/MERGE-GUIDE.md` is now history, not a to-do.
> **The five GitHub secrets are added.** `.planning/DEPLOY-RUNBOOK.md` step 2 is done; start at step 3.

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

## 🔴 Where it stands — the token

CI run `31035257829` on `6f20b9a`:

```
✓ Install   ✓ Typecheck   ✓ Build the Cloudflare worker
✓ Assert the bundle has no Windows paths      ← the check that proves CI fixed the 500s
X Upload preview version
```

The upload fails on authentication, not on the bundle:

```
A request to the Cloudflare API (/user/tokens/verify) failed.
  Invalid request headers [code: 6003]
  - Invalid format for Authorization header [code: 6111]
```

`CLOUDFLARE_ACCOUNT_ID` is verified correct (`4b2a402334decc9259d7317aaf9782f0`, confirmed against
`wrangler whoami`). Code 6111 means the token *string* is malformed as sent. GitHub secrets cannot
be read back, so this needs re-setting. Most likely, in order:

1. **A Global API Key was used instead of an API token.** Global keys are 37 hex characters and
   need `CLOUDFLARE_EMAIL` + `CLOUDFLARE_API_KEY` — they do not work as a bearer token.
2. **Whitespace or a newline came along with the paste.**
3. **The token's ID was copied rather than its value.** The value is shown once, at creation.

Create via Cloudflare → My Profile → API Tokens → **Create Token** → *Edit Cloudflare Workers*,
scoped to `Aistaffcompliance@gmail.com's Account`. Verify it before setting it:

```bash
curl -s https://api.cloudflare.com/client/v4/user/tokens/verify \
  -H "Authorization: Bearer <TOKEN>"        # expect "status":"active"
gh secret set CLOUDFLARE_API_TOKEN          # paste at the prompt
```

Then re-run: Actions → *Build & deploy* → **Run workflow** → `target: preview`.

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

Rollback is `wrangler rollback --name bsbr-attytraining`; last known-good production version is
`0cd156ef-1b0e-4b5d-a43a-3a95f0e63039` (2026-07-30).

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

1. **Re-set `CLOUDFLARE_API_TOKEN`**, re-run the workflow for a preview.
2. Review the preview — every route 200, then **390px mobile**, then the US-only checkbox by eye.
3. Resolve the refund-email wording (blocker 1 above).
4. `supabase db push` for `0023`.
5. Promote: Actions → *Build & deploy* → **Run workflow** → `target: production`.
6. Merge `redesign-iurix` → `main` after production is verified.
7. Still open: `/about`, `/contact`, `/ai-policy` have no copy; $35 vs $39 undecided (Stripe first
   if it changes); Twilio voicemail line (`.planning/BACKLOG.md` item 7).
