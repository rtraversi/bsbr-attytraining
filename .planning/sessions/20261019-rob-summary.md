# 2026-10-19 — Rob, terminal-Claude (ran overnight unattended)

Security check after Katy's Facebook post drove a traffic spike, plus a third-party light
pen-test Rob shared. Built on branch `security-hardening-1019`, then **merged to `main` and deployed to production the
same evening** (run `39344824894`, `4c30b49`).

## What happened

1. **Live checks.** `/ops/metrics` 401, forged Stripe webhook 400, `/.env` 404 — fine. But the
   apex over plain `http://` served every page with 200 (no HTTPS redirect; `www` does redirect),
   and no security headers at all.
2. **Code audit (subagent) + pen-test review.** Full findings table:
   `.planning/quick/261019-sec-security-hardening/261019-sec-SUMMARY.md`.
3. **Fixed on the branch:** Next 15.5.28 / OpenNext 1.20.12 / wrangler 4.151 (CVE-2026-64641
   applies via our one Server Action); security headers (minimal CSP enforced, full CSP
   report-only); open redirect in `/auth/confirm` + `/auth/callback` + firm-name gate; generic
   checkout 409; webhook idempotency release on failure; support form requires a firm;
   constant-time secret compares; HTML-escaped names in emails; Workers Logs on; `account_id`
   pinned; `security.txt`; `/api/health` memo.
4. **Found a real billing bug: `/api/billing/add-seats` charged $0.** It created a pending invoice
   item and then `invoices.create`, which on this API version defaults to *excluding* pending
   items. So the invoice was empty, "paid", the seats were granted, and the charge sat pending
   until the firm's next renewal invoice. Fixed (invoice first, item attached by id, idempotency,
   guard that refuses to pay a short invoice). **Not exercised against live Stripe.**
5. **Preview** run `39342294644` succeeded (typecheck + OpenNext build on Linux). Preview URL
   `https://a573d2c9-bsbr-attytraining.aistaffcompliance.workers.dev`: `/`, `/pricing`, `/login`
   200, `/dashboard` 307, `/api/health` 200, `/ops/metrics` 401, `security.txt` 200, Rise launch
   page 200 with `X-Frame-Options: SAMEORIGIN`; all headers present, `x-powered-by` gone;
   `next=//example.com` no longer redirects off-site. No CSP report-only violations in Chrome on
   `/`, `/pricing`, `/login`. **Signed-in pages (dashboard, training iframe, billing) were not
   clicked through.**

6. **Mid-year seats re-modelled (Rob, evening).** Proration from the day added to the renewal
   date at the current rate; everyone re-rates at renewal. add-seats now also raises the
   subscription quantity (proration off) — previously it never did, so renewal would have billed
   the old count and the webhook would have reset `max_seats` down to it. CLAUDE.md + #18 updated.
7. **Dashboard guidance corrected:** no Bot Fight Mode (can block Stripe / Supabase webhooks), no
   Supabase captcha until the login forms send a Turnstile token (would lock everyone out).
8. **`.env.local` points at PROD** (`ttqthtzdjacrhjtrcmmy`), contradicting the 09-xx handoff table
   that says staging.

9. **Dashboard settings done by Rob, verified from outside:** Always Use HTTPS (301), HSTS (took a
   second pass: the main HSTS toggle was off at first), WAF rate rule (429 after 10 req/10 s),
   Supabase `disable_signup: true` (also a second pass), Stripe descriptor.
10. **Merged + deployed.** Live check after deploy: pages 200, `/ops/metrics` 401, all headers
    present, `x-powered-by` gone, open redirect closed, Rise launch page OK. Signed-in pages not
    clicked through by Claude.

## Still open

- Uptime monitor (UptimeRobot on `/api/health`) — Rob.
- One live add-seats test on an internal firm; check Stripe for past $0 seat invoices.
- Redeploy `workers/cert-worker` (constant-time secret check).
- Turnstile on login/forgot forms, then Supabase captcha.
- Point `.env.local` back at staging.
- Promote CSP report-only → enforced after ~a week of clean reports.

## Not done / blocked (at the time)

- Dashboard settings (Cloudflare HTTPS/HSTS/WAF/alerts, Supabase signups + captcha, Stripe
  descriptor) — no access from here. Listed in the quick-task summary, Next steps #1.
- Claude's Supabase and Cloudflare MCP tools have no access to the prod projects, and a read-only
  prod query for recent signups was blocked by the permission classifier, so **abuse signups
  since the post were not checked**. Look at Supabase → Authentication → Users.
- 8 DB-backed test suites not run: **`.env.local` points at PROD Supabase**, so `pnpm test` writes
  test rows to production. 468 pure unit tests pass.
