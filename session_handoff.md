# Session Handoff

**Date:** 2026-06-12
**Who:** Rob

---

## What Was Done

- Installed Stripe CLI (v1.42.11 via winget), logged in to Built Smart by Rob Stripe account; CLI session valid to 2026-09-10
- Discovered and fixed **repo mix-up incident**: Max had pushed the Next.js app code to `rtraversi/aistaffcompliance` (the marketing site repo), which also caused `.open-next/cloudflare/next-env.mjs` (snapshots `.env.local`) to leak the Supabase dev service-role key to a public repo. Resolution: made aistaffcompliance repo private, Max rotated the leaked key, clean squash-migrated app code to correct repo `rtraversi/bsbr-attytraining` as commit efc3214, force-pushed aistaffcompliance back to marketing-site-only history
- **Verified Max's code post-migration:**
  - Step 3 (OpenNext adapter config — `wrangler.jsonc`, `open-next.config.ts`): ✅ VERIFIED correct spec shape
  - Step 4 (env vars): ✅ Done on Max's machine; `.gitignore` verified; leak incident noted
  - Step 5 (DB schema): ✅ Substantially verified — `0001_initial_schema.sql` (296 lines, 8 tables, RLS, 12 indexes), types generated against live dev DB `ndmzvtuywcufvkxtkjhg`; **⚠️ MISSING** `training_events` and `cert_generation_queue` tables → need migration 0002
  - Step 6 (Supabase Auth wiring): ❌ **NOT DONE** — `middleware.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts` are all 0-byte stubs
  - Step 7 (first deploy): ❓ Unverified — predates repo fix
  - Step 9 (cert Worker stub): ✅ Code verified — correct X-Webhook-Secret validation, proper error handling
- **Pricing model finalized (per-seat volume):** $35/user/yr (1–9), $32/user/yr (10–24), $28/user/yr (25+); flat on renewal, no discount. Source: `aistaffcompliance.com` marketing site HTML. All docs updated (CLAUDE.md, REQUIREMENTS.md, ROADMAP.md, PROJECT.md, STATE.md)
- **Created Stripe test-mode objects:** ONE product `prod_UgzKT3NrGNAvDA` + ONE volume-tiered Price `price_1ThbLNCzT2268ei9nkadS8kD` (`per_seat_annual`, `billing_scheme=tiered`, `tiers_mode=volume`, `tax_behavior=exclusive`, `tax_code=txcd_20060058`). Old 3-product objects archived. Live-mode creation deferred pending Stripe Tax activation.
- **Updated `.planning/NEXT-10-STEPS.md`:** recorded verified statuses for Steps 3–9, added Monday Smoke-Test Runbook (7 checks)
- **Updated `.planning/STATE.md`:** all pricing/Stripe/repo-incident context locked

---

## Status

**Working:**
- All infrastructure accounts provisioned (Cloudflare, Supabase, Stripe, Resend, GitHub)
- Correct repo `rtraversi/bsbr-attytraining` has clean app code (no leaked secrets)
- DB schema migration `0001` is solid with RLS and indexes
- Cert worker stub is properly secured
- Stripe test-mode per-seat volume pricing is live in test mode

**Needs work before Monday smoke test:**
- Max must reset local clone: `git remote set-url origin https://github.com/rtraversi/bsbr-attytraining.git && git fetch origin && git checkout main && git reset --hard origin/main && pnpm install` ← **must use reset --hard**, not git pull
- Max: implement Step 6 auth wiring (all three 0-byte stubs — see Next Steps below)
- Max: update `.dev.vars` and `.env.local` with the ROTATED Supabase service-role key
- Max: add migration `0002` for `training_events` and `cert_generation_queue` tables
- Rob: send Max collaborator invite to `rtraversi/bsbr-attytraining`
- Rob: add BSBR Holdings LLC head-office address in Stripe Tax to activate Stripe Tax

---

## Next Steps

**Rob (before Monday):**
1. Send Max collaborator invite to `rtraversi/bsbr-attytraining` on GitHub
2. Add BSBR Holdings LLC head-office address in Stripe Dashboard → Settings → Tax (required to activate Stripe Tax; blocked creating live-mode prices)
3. Once Stripe Tax active: recreate the per-seat volume Price in **live mode** and share the live Price ID with Max

**Max (TOP PRIORITY before smoke test):**
1. Reset local clone to clean state (use `git reset --hard origin/main`, not git pull)
2. Update `.dev.vars` and `.env.local` with the **rotated** Supabase dev service-role key
3. **Implement `lib/supabase/client.ts`** — export `createBrowserClient()` using `@supabase/ssr`
4. **Implement `lib/supabase/server.ts`** — export `createServerClient()` using `cookies()` from `next/headers`
5. **Implement `middleware.ts`** — token refresh on every request (mandatory; sessions expire without it). Use `getClaims()` not `getSession()` for auth decisions
6. **Add migration `0002`** with `training_events` table (audit log) and `cert_generation_queue` (cert dead-letter queue); push + regenerate `types/supabase.ts`
7. Verify Workers Builds is connected to `rtraversi/bsbr-attytraining` (not the old aistaffcompliance repo)
8. Rename `package.json` `"name"` from `"aistaffcompliance"` to `"bsbr-attytraining"` (cosmetic)

**Monday (Rob + Max together):**
- Run the 7-check smoke test per runbook in `.planning/NEXT-10-STEPS.md` Step 10

---

## Open Questions

- Should the Supabase **prod** project live under Rob's account or Max's? Currently only the dev project is confirmed (under Max's account). Pro tier ($25/mo) required before launch.
- Reconcile marketing pricing bands (extends to 25+ users) vs. target-market framing in docs (describes 1–15 staff) — positioning vs. pricing-band mismatch
- Stripe Tax: state registrations + CPA consult (~$300–$500) still open
- Articulate 360 trial outcome — Rob validating Rise hybrid course format (30-day trial); if disappointing, fall back to custom React interactive blocks or H5P
- Resend sending domain config (`noreply@aistaffcompliance.com` — SPF/DKIM/DMARC) not yet verified
- Reviewing attorney (~$500–$1,500) for cert + landing + TOS review not yet engaged

---

## Key Reference IDs

- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (under Max's account)
- **Stripe test-mode Price ID:** `price_1ThbLNCzT2268ei9nkadS8kD` (lookup key: `per_seat_annual`)
- **Stripe test-mode Product ID:** `prod_UgzKT3NrGNAvDA`
- **GitHub repo:** `rtraversi/bsbr-attytraining`
