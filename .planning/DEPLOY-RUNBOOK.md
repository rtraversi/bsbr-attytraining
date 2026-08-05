# Deploy Runbook — remove the Mac dependency, ship the redesign

**Written:** 2026-08-05 (Rob + Claude) · **For:** Max, 2026-08-06
**Branch:** `redesign-iurix` (92 commits, all pushed) · **Worker:** `bsbr-attytraining`

## What this fixes

Deploys currently only work from your Mac, because **OpenNext cannot build on native Windows** — it
bakes Windows path separators into the server manifests and workerd cannot resolve them, so the
Worker returns **500 on every route**. It looks like a clean build. It is not.

The fix is not to make Windows build; it is to stop building on anyone's laptop. CI does it on
Linux, and then the platform stops mattering — you can work from the Windows laptop, Rob can
deploy, and nothing is blocked on one machine.

> ### ⛔ The one rule
> **Never run `pnpm run deploy`, `opennextjs-cloudflare build`, or `opennextjs-cloudflare deploy`
> on Windows.** Everything else on Windows is fine — `next dev`, `pnpm build`, `tsc`, the whole
> edit/review loop. Only the Cloudflare bundling is broken there.
> *(The June `.planning/DEPLOY-CHECKLIST.md` still says `pnpm run deploy`. That advice predates
> this discovery and is safe only on macOS/Linux.)*

---

## Step 1 — Sync (5 min, either machine)

```bash
git checkout redesign-iurix
git pull
pnpm install            # two deps landed with the merge of main
pnpm exec tsc --noEmit  # expect: clean
```

Optional sanity check that the app itself is healthy — this works on Windows:

```bash
pnpm dev                # then open http://localhost:3000
```

Expect the rebuilt marketing page: new Iurix mark and wordmark in the header, marble/teal palette,
four sections (the solution → exposure → the record → the details).

---

## Step 2 — Add five GitHub secrets ⭐ this is the step that removes the Mac dependency

GitHub → **Settings → Secrets and variables → Actions → New repository secret**. Five:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → **Create Token** → *Edit Cloudflare Workers* template |
| `CLOUDFLARE_ACCOUNT_ID` | `4b2a402334decc9259d7317aaf9782f0` |
| `NEXT_PUBLIC_APP_URL` | copy from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_URL` | copy from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | copy from `.env.local` |

> ⚠️ **The three `NEXT_PUBLIC_*` are not redundant** with the Worker secrets of the same name.
> Worker secrets cover server-side reads at runtime. These get **inlined into the browser bundle at
> build time**. Leave them out and the build still goes green, but the client-side Supabase client
> ships `undefined` and **sign-in breaks silently**. This is the single easiest way to ship a
> broken site from a passing pipeline.

The Cloudflare token needs *Workers Scripts: Edit* and *Account Settings: Read* — the "Edit
Cloudflare Workers" template covers both. Scope it to the
`Aistaffcompliance@gmail.com's Account` account.

---

## Step 3 — First CI run → preview (10 min)

GitHub → **Actions → "Build & deploy (Cloudflare Workers)" → Run workflow** → `target: preview`.

The job types-checks, builds on Linux, **asserts the bundle contains no Windows paths**, then
uploads a preview version. Production is not touched.

The preview URL is printed in the run summary. Expect roughly:
`https://<8-char-id>-bsbr-attytraining.aistaffcompliance.workers.dev`

**If the run fails,** it is most likely one of: a missing/misspelled secret, an API token without
Workers Scripts:Edit, or a first-run YAML nit (the workflow has never executed). The Windows-path
assertion failing would mean something is very wrong — that check was tested against real broken
and real clean artifacts before it shipped.

---

## Step 4 — Review the preview (20 min)

**Every route must return 200.** The Windows-built preview 500'd on all of them, so this is the
check that proves CI actually fixed it:

```bash
for p in / /pricing /privacy /terms /dpa /login; do
  echo -n "$p  "; curl -s -o /dev/null -w "%{http_code}\n" "https://<preview-url>$p"
done
```

Then by eye:

- [ ] **Mobile at 390px** — never visually verified by anyone. The header is the risk: enlarged
      lockup plus four nav links. Check for horizontal scroll on every section.
- [ ] Header: mark + wordmark, nav on one line, no wrapping
- [ ] Hero: mark unframed, Katy's three-line summary beneath it
- [ ] *Reduce your exposure*: COPRAC pull quote + the three-case docket
- [ ] Footer: `info@iurixaccreditation.com`, **no phone placeholder**
- [ ] `/pricing`: slider moves, bands highlight, total updates. **Do not complete a checkout** —
      it is wired to live Stripe.

---

## Step 5 — ⚖️ Verify the case citations (decision point, do not skip)

*Reduce your exposure* cites three **2026** decisions taken from
`builtsmartbyrob.com/ai-confidentiality`. **None has been checked against a docket.**

| Case | Cited as |
|---|---|
| Morgan v. V2X, Inc. | No. 25-1991 · D. Colo. · Mar 30 2026 |
| Warner v. Gilbarco, Inc. | No. 2:2024-cv-12333 · E.D. Mich. · Feb 2026 |
| United States v. Heppner | S.D.N.Y. · Feb 2026 — source's docket reads `25-cr-XXX`, a placeholder |

Case citations are the most checkable thing on a page sold to attorneys, and a wrong one costs
more credibility than the section earns. Either verify them, or delete the docket block from
`app/_components/exposure-section.tsx` and ship without it — **the COPRAC pull quote beside it is
verified** (string-matched against the source PDF) and carries the section on its own.

Also live on the page, by Rob's explicit decision: four features that do not exist yet (tailored
policy, website token, members-only decisions page, monitoring feed).

---

## Step 6 — Promote to production

GitHub → **Actions → Run workflow** → `target: production`.

It deploys, waits, then smoke-tests `/`, `/pricing`, `/login` and **fails the run if any is not
200**. Alternatively promote the exact version you reviewed from the Cloudflare dashboard
(Workers → `bsbr-attytraining` → Deployments) so it ships the identical bundle rather than
rebuilding.

**Rollback**, if anything looks wrong:

```bash
wrangler rollback --name bsbr-attytraining
```

Last known-good production version: `0cd156ef-1b0e-4b5d-a43a-3a95f0e63039` (2026-07-30).

---

## Step 7 — After it's live

- [ ] `git checkout main && git merge redesign-iurix && git push` — main is still 92 commits behind
- [ ] **`supabase db push`** — `0018_remove_avatars.sql` has never been applied
- [ ] Delete the stale preview version `d5cbb723-a2f1-4b6e-a78e-fe42c9776f9a` (the broken
      Windows-built one) so nobody promotes it by accident
- [ ] Update `session_handoff.md`

## Still open, not blocking

- `/about`, `/contact` and `/ai-policy` do not exist — no approved copy
- Phone number pending the Twilio voicemail line (`.planning/BACKLOG.md` item 7)
- `SUPPORT_INBOX` in `app/api/support/contact/route.ts` and the sign-in mailto both point at a
  personal Gmail; likely want `support@iurixaccreditation.com`
- The legal pages are still full of `[ATTORNEY TO COMPLETE]` — **already true in production today**,
  so not a regression, but visible to anyone who clicks the footer
