# Load Tests (Dormant)

**Status: DORMANT.** This is a capacity-test skeleton, not a running test. It is not wired to
real endpoints, not run in CI, and not required before the 2026-07-20 launch.

## What's here

- `training-flow.js` — a [k6](https://k6.io/) script sketching the employee training path
  (login → view dashboard/progress → submit quiz) as commented steps with `TODO` markers.
  VU ramp stages are placeholder values.

## How to run (once filled in)

```bash
k6 run -e BASE_URL=https://<staging-host> load-tests/training-flow.js
```

> **Point this at STAGING only — never production.** `BASE_URL` defaults to an invalid
> placeholder host specifically so an unfilled run fails safely instead of hitting prod.

## Before this can actually run

- Wire real auth (a Supabase session cookie / test login flow) in Step 1.
- Point Step 2 at the real dashboard/progress endpoint.
- Point Step 3 at the real quiz-attempt endpoint with a representative payload.
- Tune the VU ramp stages in `options.stages` to a realistic target load.

## Review date

Revisit this skeleton **~2026-08-19** (about 30 days after the 2026-07-20 launch), once real
usage patterns are known, to decide whether to fill it in and run an actual capacity test
against staging.
