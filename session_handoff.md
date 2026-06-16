# Session Handoff

**Dates:** 2026-06-15 (Sessions 1–4, Max) · 2026-06-16 (Session 4, Rob)
**Who:** Max + Rob

---

## How to Get Fully Caught Up (for Claude or Rob)

Session summaries live in `.planning/sessions/`. Read them in order:

| File | What it covers |
|------|---------------|
| `20260615-max-summary.md` | Session 1 — initial scaffold, CF Workers setup, env vars |
| `20260615-max-summary-2.md` | Session 2 — auth wiring, migration 0002, RLS isolation test, CF 500 fix |
| `20260615-max-summary-3.md` | Session 3 — codebase walkthrough, verification pass, package.json fix |

If you only have time for one: read **Session 3** for project state, **Session 2** for the deepest technical context.

---

## What Was Done

### Project work (Max, Sessions 1–3, 2026-06-15)
- Scaffolded the full Next.js + Cloudflare Workers + Supabase project
- Implemented auth wiring: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Applied migrations 0001 (8 tables, RLS, triggers) and 0002 (audit log + cert queue)
- Fixed a CF Workers 500 error caused by Supabase realtime WebSocket detection
- Built and ran a 10/10 cross-tenant RLS isolation test
- Verified Worker secrets (`WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) are set in CF dashboard
- Fixed `package.json` name from `"aistaffcompliance"` to `"bsbr-attytraining"`
- Walked through all core files to build a mental model before Phase 1 UI work

### Email / DNS setup (Rob, 2026-06-16)

- **Zoho Workspace** — upgraded and configured; `aistaffcompliance.com` added as a second domain
- **`info@aistaffcompliance.com`** — created as an alias on Rob's existing Zoho account (no extra license needed); delivers to Rob's inbox
- **DNS records fully configured in Cloudflare** for `aistaffcompliance.com`:
  - Zoho MX records (3) ✅
  - Zoho DKIM + verification TXT ✅
  - Resend DKIM (`resend._domainkey`) ✅
  - Resend domain verification TXT ✅
  - Resend bounce MX on `send` subdomain ✅
  - SPF (root domain): `v=spf1 include:zoho.com include:amazonses.com ~all` ✅
  - SPF (`send` subdomain): `v=spf1 include:amazonses.com ~all` ✅
  - DMARC: `p=none` monitor mode ✅
- **Resend sending domain** — verified ✅ (was listed as open question — now closed)

### Domain / hosting architecture clarified (Rob, 2026-06-16)

- `aistaffcompliance.com` and `www` currently point to **Netlify** (`aistaffcompliance.netlify.app`) — the marketing site lives there and stays there
- The training app (this repo) will be deployed to **Cloudflare Workers** on a **subdomain** — not the root domain
- During development and testing, use the `*.workers.dev` URL — no DNS changes needed until launch
- At launch: add a CF Workers route for `training.aistaffcompliance.com` in Cloudflare; Netlify/root domain is untouched

### Other status updates (Rob, 2026-06-16)

- **GitHub access** — Max confirmed as collaborator on `rtraversi/bsbr-attytraining` ✅
- **Reviewing attorney** — Katy is handling this; no outside engagement needed
- **Stripe Tax** — Rob to add BSBR Holdings LLC address in Stripe dashboard (still pending)

---

## Current Step Status (NEXT-10-STEPS.md)

| Step | Status |
|------|--------|
| 1 Accounts | ✅ Done |
| 2 Dev tools | ✅ Done |
| 3 OpenNext scaffold | ✅ Done |
| 4 Env vars | ✅ Done (Max's machine) |
| 5 DB schema | ✅ Done — 0001 + 0002 applied, RLS isolation test 10/10 |
| 6 Auth wiring | ✅ Done — client.ts, server.ts, middleware.ts implemented |
| 7 First deploy | ⬜ Unverified — confirm Workers Builds is on `rtraversi/bsbr-attytraining`; get `*.workers.dev` URL |
| 8 Stripe objects | ✅ Test mode done; live mode blocked on Rob adding BSBR Holdings LLC address in Stripe Tax |
| 9 Cert Worker stub | ✅ Code done + secrets set; deploy + webhook wiring unverified |
| 10 Smoke test | ⬜ Not started |

---

## Next Steps for Max (next session)

1. **Install Stripe CLI + get Stripe access** — Rob is inviting Max as a team member (Developer role) in the Stripe dashboard; once accepted, run `winget install Stripe.StripeCli` then `stripe login`. Required for smoke test check 7.
2. **Confirm Workers Builds** is connected to `rtraversi/bsbr-attytraining` (not old repo); get `*.workers.dev` URL and share with Rob
3. **Deploy cert Worker** — `cd workers/cert-worker && wrangler deploy`; confirm secrets survived deploy
4. **Wire Supabase Database Webhook** on `quiz_attempts` INSERT → POST to cert Worker URL with `X-Webhook-Secret` header
5. **Run full smoke test** (Step 10) — Max can now run all 7 checks solo:
   - Checks 1–5: `pnpm dev`, `pnpm run preview`, Supabase auth, DB queries, `*.workers.dev` URL
   - Check 6: `curl` cert Worker with/without `X-Webhook-Secret` → 200 / 401
   - Check 7: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` then `stripe trigger payment_intent.created` — expect a 404 back (route doesn't exist yet); that's the passing result
6. Once smoke test passes — begin **Phase 1 UI** starting with `app/page.tsx` (landing/pricing page)

## Next Steps for Rob (pending)

- Add BSBR Holdings LLC address in Stripe dashboard → Settings → Tax (unblocks live-mode objects)
- CPA consult on SaaS sales tax (~$300–$500)

---

## Open Questions

- Should Supabase prod project live under Rob's account or Max's?
- Stripe Tax: state registrations + CPA consult still open (Rob)
- `RESEND_API_KEY` needs to be set on cert Worker before email delivery is implemented
- ~~What subdomain will the training app live on?~~ — **`training.aistaffcompliance.com`** ✅ (locked 2026-06-16, Rob)
- ~~Reviewing attorney~~ — Katy handling this ✅
- ~~Resend sending domain~~ — fully verified ✅
- ~~GitHub collaborator access for Max~~ — done ✅

---

## Key Reference IDs

- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (under Max's account)
- **Stripe test-mode Price ID:** `price_1ThbLNCzT2268ei9nkadS8kD` (lookup key: `per_seat_annual`)
- **Stripe test-mode Product ID:** `prod_UgzKT3NrGNAvDA`
- **GitHub repo:** `rtraversi/bsbr-attytraining`
- **Marketing site:** `aistaffcompliance.com` → Netlify (`aistaffcompliance.netlify.app`) — stays on Netlify
- **Training app (dev/test):** `*.workers.dev` URL (TBD — Max to provide after Step 7)
- **Training app (launch):** `training.aistaffcompliance.com` → Cloudflare Workers
