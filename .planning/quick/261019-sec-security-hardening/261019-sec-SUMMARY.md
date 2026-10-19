# 261019-sec: Security hardening after the Facebook traffic spike

**Date:** 2026-10-19 (Rob, terminal-Claude, run overnight unattended)
**Branch:** `security-hardening-1019` (NOT merged, NOT on production)
**Trigger:** Katy's Facebook post drove a traffic spike; Rob asked for a security check and
shared a third-party light pen-test (logged-out, 48 requests, against `http://`).

## Findings, verified

| # | Finding | Source | Verdict |
|---|---|---|---|
| 1 | Apex `http://iurixaccreditation.com` serves pages (incl. `/login`) with 200, no HTTPS redirect. `www` redirects correctly. | pen-test, reproduced | **Real.** Cloudflare zone setting, not code. |
| 2 | Next.js 15.5.19: CVE-2026-64641 (Server Action CPU DoS) applies, we have one Server Action (`app/verify/actions.ts`). CVE-2026-64649 low risk (our action never redirects/forwards). CVE-2026-64645 / 27980 / 94543 do not apply (no rewrites, no disk image cache on Workers, App Router only). | pen-test | **Real.** Fixed by upgrade. |
| 3 | No security headers (CSP, HSTS, nosniff, Referrer-Policy, frame protection); `x-powered-by` exposed. | audit + pen-test | **Real.** Fixed. |
| 4 | Open redirect: `/auth/confirm` and `/auth/callback` passed `next=` to `new URL()` unchecked (`//evil.com` works). The firm-name gate's regex was bypassable with `/\t/evil.com`. | audit | **Real.** Fixed. |
| 5 | `/api/checkout` (public) told callers whether an email owned a firm vs. was staff elsewhere. | audit | Narrowed to one generic message. Still reveals "this email can't be used" (refusing pre-charge is the point); bulk probing needs the WAF rate rule (dashboard). |
| 6 | **`/api/billing/add-seats` charged $0.** It created a pending invoice item, then `invoices.create` — which on this API version defaults `pending_invoice_items_behavior` to `exclude` (confirmed in the stripe SDK typings). Result: empty invoice "paid", seats granted, real charge left pending until the next renewal invoice swept it up. Also no protection against a replayed request. | audit (while adding idempotency) | **Real billing bug.** Fixed. Untested against live Stripe; see Next steps. |
| 7 | Stripe webhook: on a handler throw, the idempotency row stayed, so Stripe's retry got 200 and the event was lost (checkout path already handled this; the others did not). | audit | Fixed. |
| 8 | `/api/support/contact` only required a login, not firm membership. | audit | Fixed. |
| 9 | Shared secrets compared with `!==` (cert generate/drain, metrics, `/ops` basic auth, cert Worker). | audit | Fixed (constant-time compare). |
| 10 | Customer-typed names / firm names interpolated raw into HTML emails (renewal email, operator alerts). | audit | Fixed (`lib/escape-html.ts`). |
| 11 | No Workers Logs, so no record of attack traffic. | audit | Fixed (`observability` in wrangler.jsonc). |
| 12 | `/api/health` hit the DB on every public request. | audit | 10 s per-isolate memo. |
| 13 | No `security.txt`. | pen-test | Added. |
| — | "Error message" on `/privacy`; robots.txt; email on page; OPTIONS 405; login page found. | pen-test | False positive / expected. No action. |

## Code changes (this branch)

- `package.json` / lockfile: `next` + `eslint-config-next` 15.5.19 → **15.5.28**, `@opennextjs/cloudflare`
  → **1.20.12** (requires next ≥15.5.28), `wrangler` → **4.151.1**.
- `next.config.ts`: `poweredByHeader: false`; `headers()` adds HSTS, nosniff, X-Frame-Options
  SAMEORIGIN, Referrer-Policy, Permissions-Policy, an **enforced** minimal CSP (frame-ancestors,
  base-uri, object-src, upgrade-insecure-requests) and the **full CSP in Report-Only**.
- `public/_headers`: same basics for static assets (incl. `/training-content/`).
- `lib/safe-redirect.ts` (+ test) used by `app/auth/confirm/route.ts`, `app/auth/callback/route.ts`,
  `app/onboarding/firm-name/page.tsx`.
- `app/api/checkout/route.ts`: one 409 (`email_unavailable`) for both refusals.
- `app/api/billing/add-seats/route.ts` + `billing-client.tsx`: invoice first, item attached by id,
  explicit `pending_invoice_items_behavior: 'exclude'`, idempotency keys from a per-attempt
  `requestId`, replay → 409 without charging/crediting, refuse to pay an invoice whose subtotal is
  short of the charge (voids it).
- `app/api/webhooks/stripe/route.ts`: release idempotency row on handler failure (non-checkout);
  escape names in alert/renewal HTML.
- `app/api/support/contact/route.ts`: require `firm_id`; shared `escapeHtml`.
- `lib/secret-compare.ts` (+ test) used by certs/generate, certs/drain, metrics, middleware `/ops`;
  inline copy in `workers/cert-worker/src/index.ts`.
- `lib/escape-html.ts`; `app/api/billing/cancel-refund/route.ts` alert escaped.
- `app/api/health/route.ts`: 10 s memo.
- `wrangler.jsonc`: `account_id` pinned (09-28 next step), `observability.enabled`.
- `public/.well-known/security.txt`.

## Verification done

- `tsc --noEmit` clean (app and `workers/cert-worker`), eslint 0 errors, `next build` clean.
- Unit tests: 22 files / 468 passed. **The 8 DB-backed suites were NOT run** — `.env.local` points
  at the PRODUCTION Supabase project (`ttqthtzdjacrhjtrcmmy`), and running them would write test
  rows to prod. (Worth fixing: point `.env.local` at staging.)
- Preview deploy of this branch: see session handoff for the run id and header check.

## Next steps (Rob / Max)

1. **Dashboard, no deploy (do first):** Cloudflare → SSL/TLS → Edge Certificates: *Always Use
   HTTPS* on, HSTS on, mode Full (strict). Security: Bot Fight Mode; rate-limit rule ~5/min/IP on
   `/api/checkout`, `/api/onboarding/*`, `/api/track`, `/ops/*`. Notifications: 5xx + security
   event alerts. Supabase → Auth: disable public signups, enable Turnstile captcha, review rate
   limits. Stripe: statement descriptor back to `IURIX ACCREDITATION`.
2. Click through the preview: login, dashboard, **training page (Rise iframe)**, pricing →
   Stripe Checkout redirect. Check the browser console for CSP report-only violations.
3. Merge to main and deploy to production (`gh workflow run deploy.yml --ref main -f target=production`).
4. **add-seats:** check Stripe for any past mid-year seat additions — $0 invoices plus a pending
   invoice item on the customer. Those pending items will be swept into that firm's renewal
   invoice. Decide whether to leave, charge, or delete them. Test the fixed flow once in live mode
   (1 seat on an internal firm) before relying on it.
5. The cert Worker (`workers/cert-worker`) deploys separately; the constant-time compare there
   only takes effect when it is redeployed.
6. After a week of clean CSP reports, promote the report-only policy to enforced.
7. Decisions: Cloudflare Access for `/ops/*`; whether `/training-content/` should stay public;
   invite-reminder cooldown.
