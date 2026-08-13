# 2026-08-13 — Max + terminal-Claude

**Tier 1 PROD cutover: Phase A complete. Phase B not started.**

## What happened

The freeze was deliberately lifted for this run. Its stated reason — not shipping the
`ix-quizforge` cert-forgery hole to PROD — cleared when `3745d49` landed on `main`, and the
cutover was the thing the freeze was protecting. The mismatch window that opened 2026-08-06
21:07Z closed 2026-08-13 20:45:04Z.

| Step | Result |
|---|---|
| A1 | `0023`/`0024`/`0025` pushed to PROD. `migration list` reads `0025\|0025\|0025`. Columns verified by direct query; lesson backfill **L1=1 L2=1 L3=4 L4=0 L5=2** |
| A2 | 4 app-Worker secrets via `wrangler versions secret put` (all overwrites) |
| A3 | cert-worker **`9cdf442e`**, `SUPABASE_URL` now PROD; auth 401/200 both proven |
| A4 | Actions run **31742229934**, app version **`b0e62a6f`** @ 20:45:04Z, from `main` @ `936f048` |
| A5 | **4/4 PASS**, including the bundle check |

## The four findings worth carrying

1. **Three migrations were pending, not two.** `0023` was also unapplied on PROD. It is a genuine
   no-op (`select 1;`) but cannot be skipped without a permanent gap in the history table.

2. **`.env.prod`'s `CERT_WEBHOOK_SECRET` was staging's value**, byte-identical (SHA-256 prefix
   `09f840b4` on both files). Had the Workers been set from it, B6 would have failed looking like a
   broken webhook. The canonical value came from the `Cert-queue-generate` trigger header instead,
   and the ordering was trigger-first-then-Workers so no window existed where the Workers agreed
   with each other but not with the caller. `CERT_WEBHOOK_SECRET` has **three** holders; only two
   are Worker secrets.

3. **The live cert-worker had been writing to staging the whole time.** `wrangler.toml` carried the
   PROD URL from `09f21b3` (08-06 18:51Z) but the deployed version was `c86ca17e` (08-05 13:26Z).
   A deployed var only moves on redeploy. Proven by comparing binding output and version timestamps
   against `git log`, not assumed from the commit.

4. **A4 builds a new version rather than promoting the staged one.** `2355f8ed` held the pasted
   secrets; the deploy created and activated `b0e62a6f`. If that had inherited bindings from the
   *old deployed* version instead of the latest, PROD would have served a PROD browser bundle from
   a server on staging credentials — and neither the A5 bundle check nor `/api/health` would have
   caught it. Closed by probing `/api/certs/generate` with the real secret and a non-`INSERT`
   payload: **200 `{"ok":true}`**.

## Two proofs beyond the runbook

- **Anon key project proven empirically.** The bundle check proves the URL ref only. The live
  bundle ships `sb_publishable_gOkxoiE…`, whose format embeds no ref, so it was tested against both
  projects: PROD **200**, staging **401**.
- **Deployed-Worker secret confirmed live**, which is what made the `b0e62a6f` inheritance question
  answerable at all.

## Left for next session

Phase B (the ix-prodseed proof) and Phase C (purge + reconciliation). B1 is the first step that
writes real rows to PROD, so it was not begun late. Full detail, open questions and operational
gotchas are in `session_handoff.md` — including the one to check before B6: the cert-worker's
`fetch` handler generation pipeline is still a `TODO` at `src/index.ts:1072`, so
`Cert-worker-quiz-pass` appears to be a no-op stub and the live cert path is
`Cert-queue-generate` → app `/api/certs/generate`.
