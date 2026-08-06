# Where to test, and where not to

**Established 2026-08-06.** Applies to Max, terminal-Claude, Codex and any future session.

## The rule

**Test at `localhost:3000`. Do not test on `iurixaccreditation.com`.**

Once the PROD cutover lands, the live site writes to the production database. There is no
"staging site" and there never was — one Worker, one domain, pointed at whichever Supabase project
the last deployment was built with.

## How it works

| File | Points at | Used by |
|---|---|---|
| `.env.local` | **IURIX STAGING** (`ndmzvtuywcufvkxtkjhg`) | `next dev`, `pnpm test`, any script run without naming an env file |
| `.env.prod` | **IURIX PROD** (`ttqthtzdjacrhjtrcmmy`) | only commands that explicitly name it |

Day to day:

```bash
pnpm dev            # localhost:3000, writes to staging, click freely
```

When something genuinely must touch production:

```bash
npx dotenv -e .env.prod -- node scripts/verify-cutover.mjs
```

Naming `.env.prod` is the safety mechanism. Targeting production should always be a deliberate
act, never a default.

Both files are gitignored. `.gitignore` covers `.env*` rather than listing names — it previously
listed `.env.local` alone, which would have allowed `.env.prod`, holding the **PROD service-role
key**, to be committed.

## Why this exists

`.planning/PROD-CUTOVER.md` originally said to point `.env.local` at PROD so local dev "represents
production." Following that would have left **zero** safe environments:

- The live site writes to PROD after the cutover.
- **Preview deploys are not an escape.** `.github/workflows/deploy.yml` builds preview and
  production from the same `secrets.NEXT_PUBLIC_SUPABASE_*`, so preview URLs point at PROD too.
- `.env.local` was the last one.

That would have rebuilt the exact problem the clean-PROD path was chosen to avoid: test data in
the production database, making the daily reconciliation report untrustworthy on the day of the
first real sale. Cleanup is also genuinely painful — `RESTRICT` foreign keys force deletion in the
order `training_events` → `firms` → `auth.users`.

The original rationale does not survive the fact that both projects carry an **identical schema**.
Staging already represents production structurally. The only difference is the data, which is
exactly what should differ.

## A third file exists

`.env.production` (51 bytes) sits alongside these two. It contains only `NEXT_PUBLIC_APP_URL` and
**no credentials**, and it is gitignored. Next loads it during production builds, so it can
influence a build even though nothing in this document points at it. Found by terminal-Claude
2026-08-06. Left alone rather than deleted on a wrap-up — decide deliberately whether it should
exist at all, given GitHub Actions also supplies `NEXT_PUBLIC_APP_URL` at build time and two
sources for one value is how a wrong one goes unnoticed.

## Checks

Confirm the two files disagree, which is the point:

```bash
grep NEXT_PUBLIC_SUPABASE_URL .env.local .env.prod
```

`.env.local` must show `ndmzvtuywcufvkxtkjhg`, `.env.prod` must show `ttqthtzdjacrhjtrcmmy`. If
they match, the sandbox is gone and testing is hitting production.

To confirm `pnpm dev` is really on staging: sign in with an existing test account. Those exist
only on staging — PROD has zero users, so a successful login is proof.

## The one deliberate exception

Tier 1's Phase 4 proof (real invite, real quiz pass, certificate PDF in the PROD bucket) writes
real rows to PROD on purpose, because nothing else proves the Database Webhooks are wired. See
`ix-prodseed`: decide before running it whether those rows are cleaned out afterwards or recorded
as a known exception. Do not leave it undecided.
