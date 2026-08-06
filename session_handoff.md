# Session Handoff

**Date:** 2026-08-06
**Who:** **Codex** (terminal agent; joined the existing Rob / Max / Claude workflow)

## Status

**Tier 0 is complete and production is live.** The deployed application commit
is `dbb52ab` (`feat(stripe): resolve seat Price by lookup key`). The current
`main` branch also contains the documentation-only handoff commits created at
wrap-up; they do not require a production deployment.

GitHub Actions production run
[`31122263372`](https://github.com/rtraversi/bsbr-attytraining/actions/runs/31122263372)
completed **successfully**. Its Linux job passed typecheck, Cloudflare build,
the no-Windows-path assertion, production deploy, and smoke tests for `/`,
`/pricing`, and `/login`.

> A GitHub Actions incident delayed this deployment. An earlier queued manual
> production run (`31121558524`) was cancelled **before it began**. Do not
> mistake it for a partial deploy; `31122263372` is the only production run that
> actually deployed this work.

## What Codex completed

1. **`ix-lookupkey` — merged, validated, and deployed.**
   - Merged `origin/stripe-lookup-key` (`0d5e180`) into current `main` as
     `dbb52ab`, retaining the preceding `c23192b` non-US refund wording fix.
   - Checkout now resolves the seat Price by `per_seat_annual`. A missing key
     falls back to the existing sandbox Price only under a Stripe test key; live
     mode fails closed, rather than charging against an unchosen Price.
   - Validation: 12 focused tests passed; `tsc --noEmit` passed; ESLint passed
     with four existing `no-img-element` warnings; `pnpm build` passed.
   - Browser smoke: a one-seat sandbox Checkout session displayed **$35/year**.
     No card or purchase was entered.

2. **`ix-refundnonus` — deployed with the lookup-key work.**
   - The non-US cancelled-subscription email no longer promises that a refund is
     already under way. It says the payment has not been returned and directs
     the buyer to `info@iurixaccreditation.com` to arrange it.
   - The corresponding operator alert now accurately says a human must issue
     the refund.

3. **`ix-www522` — fixed manually in Cloudflare.**
   - The pre-existing proxied `www` CNAME points to the apex.
   - Max added a permanent Redirect Rule matching
     `http*://www.iurixaccreditation.com/*` and targeting
     `https://iurixaccreditation.com/${2}`, preserving query strings.
   - Browser proof: `https://www.iurixaccreditation.com/pricing?redirect-check=1`
     reached the apex pricing page with its query preserved. The 522 is gone.

4. **`ix-mig0023` was already completed earlier this morning.**
   - `3fe0ca4` makes migration `0023` an intentional no-op and moves the actual
     destructive bucket removal to `scripts/remove-avatars-bucket.mjs` via the
     Storage API. It was run against staging; PROD never had the bucket.

## Important observation to retain

Hosted Stripe Checkout still calls the Product **“AI Staff Compliance Training
— Annual Certification.”** This is customer-visible on Checkout, invoices, and
receipts. It is already an `ix-stripeaudit` configuration issue, not a new code
bug. Agree the final invoice/Checkout title before renaming the sandbox Product
and creating its live counterpart.

## First action next Codex session — verify shared state, do not assume it

The push and production deployment were successful at this handoff, but perform
these read-only checks before new work so an interrupted GitHub session cannot
be mistaken for a completed one:

```bash
git status --short
git fetch origin
git rev-parse --short HEAD
git rev-parse --short origin/main
git ls-remote origin refs/heads/main
gh run view 31122263372 --repo rtraversi/bsbr-attytraining --json status,conclusion,url
```

Expected: clean tree; local `HEAD`, `origin/main`, and `ls-remote` agree; and
Actions conclusion `success`. Confirm that `dbb52ab` is an ancestor of `HEAD`
(`git merge-base --is-ancestor dbb52ab HEAD`). The documentation-only wrap push
will create the normal preview workflow but deliberately does **not** need a
production deploy; app production is `dbb52ab`. If the refs disagree, stop
before building or deploying and report the divergence. If Actions is not
successful, inspect that run; do **not** blindly dispatch another production
deploy. If authenticated, additionally run `wrangler deployments list --name
bsbr-attytraining` to record the live version.

## Next work — sequence stays deliberate

1. **Synchronise the Weekly Intel Brief before new feature work.** Its source
   (`.planning/brief-archive/weekly-brief.html`) still falsely shows
   `ix-lookupkey`, `ix-refundnonus`, and `ix-www522` as to-do. Bake in their
   completed statuses and completion evidence; update `ix-stripeaudit` to remove
   those closed prerequisites. Follow the archive ritual: parse the `SEED` array
   under Node before publishing and then republish the artifact. Never insert a
   straight `"` inside a `t:"..."` value.
2. **Tier 1 — plan, then execute the IURIX PROD cutover plus
   `ix-webhooksecret`.** Do not start it casually. The plan must cover:
   - enabling PROD Database Webhooks and recreating both cert-pipeline triggers;
   - adding `https://iurixaccreditation.com` to Supabase Auth Site URL and
     redirect allowlist;
   - rotating the webhook shared secret;
   - swapping Supabase credentials in all **four** places: `.env.local`, app
     Worker secrets, `workers/cert-worker` secrets, and GitHub Actions secrets;
   - proving an invite, authenticated redirect, quiz pass, certificate PDF in
     the PROD bucket, and cert-worker cron against PROD.
3. **Tier 2 in parallel:** send Katy the real certification question-pool
   request (24–32 reviewed questions), plus obtain certificate/copy approvals.

## Safety rules still in force

- Production deploys: GitHub Actions only; do not build OpenNext/Cloudflare
  artifacts on Windows.
- Pushes create preview builds; production is a deliberate workflow dispatch.
- Stripe remains sandbox. Never treat sandbox confirmation as live-money proof.
- Never enable Cloudflare Email Routing on the apex; Zoho owns apex MX.
- `0023`'s deletion script is destructive: run it only against a confirmed,
  intended environment.
