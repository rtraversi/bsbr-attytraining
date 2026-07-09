---
phase: quick-260709-aeh
plan: 01
subsystem: billing
tags: [stripe, checkout, webhooks, resilience]
requires: []
provides: [PAY-DOUBLE-BILL, PAY-SILENT-PROVISION]
affects: [app/api/checkout/route.ts, app/api/webhooks/stripe/route.ts]
tech-stack:
  added: []
  patterns:
    - "Best-effort auxiliary check wrapped in its own try/catch that falls through to the primary revenue path on any failure"
    - "Best-effort operator alert email on silent provisioning collision, never throws the webhook handler"
key-files:
  created: []
  modified:
    - app/api/checkout/route.ts
    - app/api/webhooks/stripe/route.ts
decisions:
  - "Active-firm short-circuit checks user.app_metadata.firm_id via cookie-based auth client, then looks up firms.status with the admin client — kept as two separate clients per existing project convention (createClient for auth, createAdminClient for RLS-bypassing lookups)"
  - "Operator alert email reuses the existing sendEmail() helper and the same inline-styled HTML markup pattern already used elsewhere in the webhook file (see the renewal notification email)"
  - "No auto-cancel, no auto-refund, no auto-provisioning on the createUser collision — alert is informational only, matching the plan's explicit instruction to leave manual resolution to the operator"
metrics:
  duration: "~15 minutes"
  completed: 2026-07-09
---

# Quick Task 260709-aeh: Fix double-billing / silent-provisioning-collision gap Summary

Closed two independent gaps in the Stripe checkout/webhook flow: (1) a logged-in admin of an already-active firm could accidentally purchase a second subscription, and (2) a `createUser` collision (email already registered) during webhook provisioning failed completely silently with only a `console.warn`.

## What Was Built

**Task 1 — `app/api/checkout/route.ts` (Layer 1, active-firm short-circuit):**
Added an auth/firm-status check between seat parsing and Stripe session creation. If the caller is authenticated and their `app_metadata.firm_id` maps to a firm with `status === 'active'`, the route returns `{ url: '/api/portal' }` instead of creating a new Stripe Checkout Session. The client's existing `window.location.href = url` handling redirects the admin to the billing portal automatically — no client-side changes needed. The entire check is wrapped in try/catch; any failure (auth lookup, DB error) falls through silently to the normal anonymous checkout path, since that path is the primary revenue path and must never be blocked.

**Task 2 — `app/api/webhooks/stripe/route.ts` (Layer 2, operator alert on provisioning collision):**
In `handleCheckoutCompleted`, the `createUserError` branch (email already registered) now sends a best-effort operator alert email in addition to the existing `console.warn`. The alert goes to `process.env.OPERATOR_ALERT_EMAIL` (falls back to `info@aistaffcompliance.com`) and includes the customer email, Stripe customer ID, Stripe subscription ID, checkout session ID, and the underlying error message. The `sendEmail()` call is wrapped in its own try/catch — a mail failure is logged via `console.error` and never thrown. The handler still returns without provisioning (no auto-cancel, no auto-refund), so the outer `POST` still returns 200 to Stripe and the event is not retried.

## Deviations from Plan

None - plan executed exactly as written. Both tasks were implemented per the plan's `<action>` specs with no architectural changes, no new dependencies, and no touches to any of the three held dashboard files (`app/dashboard/layout.tsx`, `app/dashboard/_components/account-menu.tsx`, `app/dashboard/quizzes/_components/quizzes-client.tsx`).

## Verification

```
$ npx tsc --noEmit
(no output — clean)

$ npx eslint app/api/checkout/route.ts
(no output — clean)

$ npx eslint app/api/webhooks/stripe/route.ts
(no output — clean)
```

Final combined check after both commits:
```
$ npx tsc --noEmit && echo "TSC_CLEAN" && npx eslint app/api/checkout/route.ts app/api/webhooks/stripe/route.ts && echo "ESLINT_CLEAN"
TSC_CLEAN
ESLINT_CLEAN
```

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `52d0a98` | `fix(checkout): block second checkout for firms with an active subscription` |
| 2 | `52cf9f5` | `fix(webhooks): alert operator on silent Stripe provisioning collision` |

## Known Stubs

None.

## Threat Flags

None — both changes are defensive/resilience fixes to existing surfaces (checkout route, webhook handler), not new attack surface. No new endpoints, no new auth paths, no schema changes.

## Self-Check: PASSED

- FOUND: app/api/checkout/route.ts (modified, active-firm short-circuit present)
- FOUND: app/api/webhooks/stripe/route.ts (modified, operator alert present)
- FOUND commit 52d0a98 in `git log --oneline --all`
- FOUND commit 52cf9f5 in `git log --oneline --all`
