# 2026-09-28 — Rob, terminal-Claude

Put the site on Google Search and piped Search Console data into `/ops/metrics`.

## What happened

1. **robots.txt + sitemap (`f3bf477`).** The live site had neither (robots.txt 404'd).
   - `app/sitemap.ts`: `/`, `/pricing`, `/privacy`, `/terms`, `/dpa`, `/cookies`. Add new public
     marketing pages here.
   - `app/robots.ts`: allow all, disallow `/api/ /auth/ /dashboard /intake /onboarding /ops /mockup
     /training-content/`. `/verify` deliberately NOT disallowed: those pages carry `noindex`, and a
     robots block would stop Google reading it (URL-only listings).
2. **Search Console set up by Rob.** Domain property `sc-domain:iurixaccreditation.com`.
   Homepage indexed; sitemap read 2026-09-28, 6 pages discovered.
3. **Google search section on `/ops/metrics` (`c02cccd`).** `lib/analytics/search-console.ts`:
   service-account JWT signed with Web Crypto (no new dependency; `jose` is not installed despite
   CLAUDE.md), Search Analytics API, read-only scope. Shows impressions, clicks, CTR, avg position,
   top search terms and pages. Confirmed working live by Rob (zeros; data lags 2–3 days).
   - Google Cloud project `iurix-metrics`, Search Console API enabled, service account
     `iurix-metrics@iurix-metrics.iam.gserviceaccount.com` added to Search Console as Restricted.
   - Worker secrets `GSC_CLIENT_EMAIL`, `GSC_PRIVATE_KEY` set on prod. Optional `GSC_PROPERTY`
     overrides the property (defaults to the domain property).
4. **Deploys:** both production runs succeeded (`36497043866`, `36499182598`).

## Traps hit

- **The deploy workflow defaults to `target: preview`.** A push to main, or a bare
  `gh workflow run deploy.yml`, only uploads a preview version. Production needs
  `gh workflow run deploy.yml --ref main -f target=production`.
- **Wrangler account mix-up (again, cf. 09-24).** This PC's wrangler was logged into
  `bsbr.goldsberry@gmail.com` (account `6671543a…`). `wrangler secret put` silently created a
  stub Worker `bsbr-attytraining` there holding the GSC secrets. Rob re-logged in as
  `aistaffcompliance@gmail.com` (prod account `4b2a4023…`) and the secrets were then set correctly.
  Root `wrangler.jsonc` has no `account_id`, which is what lets this happen.

## Loose ends (Rob)

- Delete the stray `bsbr-attytraining` Worker in the **bsbr.goldsberry** Cloudflare account
  (NOT the aistaffcompliance one — same name, that's prod).
- Delete `iurix-metrics-19e25b9fd8c9.json` from Downloads.

## Next steps

- Add `"account_id": "4b2a402334decc9259d7317aaf9782f0"` to root `wrangler.jsonc` so wrangler can
  never target the wrong account again.
- `public/og-image.png` still missing (share cards have no image). Waiting on Max's export.
- Request indexing for `/pricing` in Search Console if it isn't indexed within a week.
