# `ix-prodcutover`

**Owner:** Rob · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **2,734 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🔴 P0. Production still runs on the STAGING database. IURIX PROD is schema-complete (0001–0022, bucket, courses row) but nothing points at it. Rob owns four steps: enable Database Webhooks, fix the Auth redirect allowlist, rotate the webhook secret, then the credential swap. ⚠ THE SWAP IS FOUR PLACES, NOT THREE: .env.local, App Worker, cert-worker, GitHub Actions. Miss cert-worker and the crons keep writing to staging with nothing erroring. Read .planning/PROD-CUTOVER.md first.

---

## Full text, captured 2026-08-06

🔴 P0, THE BIGGEST OPEN THING. PRODUCTION RUNS ON THE STAGING DATABASE. iurixaccreditation.com inlines ndmzvtuywcufvkxtkjhg (IURIX STAGING). This predates the redesign and the deploy did not cause it. Full detail in .planning/PROD-CUTOVER.md: read that before touching either database. ✅ DONE ALREADY (Rob, 08-05): IURIX PROD is schema-complete. Migrations 0001–0022 applied, migration history rewritten from the MCP tool’s timestamp version to the repo’s 0001–0022 strings (left alone, the next supabase db push would have replayed everything against a populated DB and failed on the first CREATE TABLE), and the un-versioned objects created. Verified identical to staging on tables, columns, policies, functions and indexes: 13 / 107 / 18 / 9 / 44. 🔴🔴 THE FINDING THAT MATTERS MOST, AND IT GENERALISES: MIGRATIONS ALONE DO NOT PRODUCE A WORKING DATABASE. Four objects were created by hand in the dashboard over June and July and exist in NO migration: the certificates storage bucket, the courses row, and TWO DATABASE WEBHOOKS THAT ARE THE ENTIRE CERTIFICATE PIPELINE. A project built only from migrations looks complete, serves the site, lets people sign in, and then silently never issues a certificate, with nothing in the logs pointing at the cause. They were found by diffing TRIGGERS (2 against 4); every other axis matched exactly. If we ever stand up another environment, start from that table, not from supabase db push. REMAINING, ALL ROB: (1) enable Database Webhooks on PROD, which has no supabase_functions schema and no pg_net, so the two triggers cannot be created until it is on; (2) Auth → Site URL and redirect allowlist must include https://iurixaccreditation.com, or every invite, password reset and seat reassignment breaks silently, since they all call redirectTo: ${appUrl}/auth/callback; (3) rotate the webhook shared secret (see ix-webhooksecret); (4) the credential swap. ⚠ THE SWAP IS FOUR PLACES, NOT THREE, AND EVERY EARLIER DOC UNDERCOUNTS IT: .env.local (local dev, breaks loudly, harmless), the App Worker secrets (server calls fail), workers/cert-worker SECRETS (the crons KEEP WRITING TO STAGING and nothing errors), and the GitHub Actions secrets (inlined into the browser bundle at build time, so SIGN-IN BREAKS SILENTLY AND CI STAYS GREEN). cert-worker is a separate Worker with its own SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. VERIFY BY, and do not skip these, every failure here is silent: grepping the LIVE browser bundle for ttqthtzdjacrhjtrcmmy rather than trusting deploy output; sending a real invite and watching it land on /auth/callback; and completing a quiz pass end to end until a CERTIFICATE PDF ACTUALLY APPEARS IN THE BUCKET, which is the only proof the webhooks are wired.
