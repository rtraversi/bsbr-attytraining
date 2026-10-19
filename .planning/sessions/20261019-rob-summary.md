# 2026-10-19 — Rob, terminal-Claude (ran overnight unattended)

Security check after Katy's Facebook post drove a traffic spike, plus a third-party light
pen-test Rob shared. Everything is on branch **`security-hardening-1019`**, previewed, **not merged
and not on production**.

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

## Not done / blocked

- Dashboard settings (Cloudflare HTTPS/HSTS/WAF/alerts, Supabase signups + captcha, Stripe
  descriptor) — no access from here. Listed in the quick-task summary, Next steps #1.
- Claude's Supabase and Cloudflare MCP tools have no access to the prod projects, and a read-only
  prod query for recent signups was blocked by the permission classifier, so **abuse signups
  since the post were not checked**. Look at Supabase → Authentication → Users.
- 8 DB-backed test suites not run: **`.env.local` points at PROD Supabase**, so `pnpm test` writes
  test rows to production. 468 pure unit tests pass.
