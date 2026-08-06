# Stripe lookup-key merge — 2026-08-06

## Outcome

Merged `origin/stripe-lookup-key` commit `0d5e180` into current `main` without conflicts. The merged result retains the local non-US refund wording fix (`c23192b`).

Checkout now resolves its Stripe seat Price by the `per_seat_annual` lookup key. During the sandbox transition only, a Stripe test key may fall back to the existing sandbox Price when no Price has the lookup key. Live mode fails closed instead of selecting an unchosen Price.

## Validation

- `pnpm vitest run tests/stripe-price.test.ts` — 12 passed
- `pnpm exec tsc --noEmit` — passed
- `pnpm exec eslint .` — passed with four pre-existing `@next/next/no-img-element` warnings
- `pnpm build` — passed

The branch had already been verified on its preview against real sandbox checkout at one seat and the ten-seat boundary; that external checkout exercise was not repeated locally.

## Follow-up

Push the merged `main`, trigger the deliberate GitHub Actions production deployment, then smoke-test sandbox checkout and confirm the existing $35 one-seat sandbox price still appears. GitHub Actions access is required for the deployment.
