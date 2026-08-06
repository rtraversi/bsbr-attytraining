---
phase: quick
plan: 260806-lookupkey-merge
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/checkout/route.ts
  - lib/stripe-price.ts
  - tests/stripe-price.test.ts
  - app/_components/included-section.tsx
  - CLAUDE.md
autonomous: true
---

<objective>
Merge the already preview-verified `stripe-lookup-key` feature into the current `main` branch, retaining all newer main-branch work and validating the merged artifact before it is pushed.
</objective>

<context>
The feature commit is `0d5e180` on `origin/stripe-lookup-key`. It replaces the hardcoded checkout Price ID with a lookup-key resolver. Its fallback to the existing sandbox Price is gated on a Stripe test secret key; live mode fails closed when no Price has `lookup_key: per_seat_annual`.

Current `main` also includes local commit `c23192b`, which corrects non-US refund wording and must remain in the pushed result. The merge base is `839918f`; the feature branch changes only the five files named in this plan.
</context>

<tasks>

<task type="auto">
  <name>Merge and validate the checkout Price lookup</name>
  <action>
Merge `origin/stripe-lookup-key` into current `main` with `--no-commit`. Resolve only genuine merge conflicts, retaining newer production/cutover facts in documentation. Run the focused Stripe-price tests, TypeScript, ESLint, and a production build against the merged tree. Commit only if all checks pass.
  </action>
  <verify>
    <automated>pnpm vitest run tests/stripe-price.test.ts && pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm build</automated>
  </verify>
  <done>Current main contains the lookup-key resolver and its tests, preserves c23192b, and passes the prescribed validation.</done>
</task>

</tasks>

<handoff>
Pushing and production deployment require the account holder's GitHub access. After a successful commit, push only with user authorization and trigger production deployment through GitHub Actions; smoke-test sandbox checkout after the deployment.
</handoff>
