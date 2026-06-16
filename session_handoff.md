# Session Handoff

**Date:** 2026-06-16 (Session 4)
**Who:** Rob

---

## What Was Done

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

### Domain / hosting architecture clarified

- `aistaffcompliance.com` and `www` currently point to **Netlify** (`aistaffcompliance.netlify.app`) — the marketing site lives there and stays there
- The training app (this repo) will be deployed to **Cloudflare Workers** on a **subdomain** (e.g. `app.aistaffcompliance.com`) — not the root domain
- During development and testing, use the `*.workers.dev` URL — no DNS changes needed until launch
- At launch: add a CF Workers route for the chosen subdomain in Cloudflare; Netlify/root domain is untouched

### Other status updates

- **GitHub access** — Max confirmed as collaborator on `rtraversi/bsbr-attytraining` ✅ (was listed as in-progress)
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

1. **Confirm Workers Builds** is connected to `rtraversi/bsbr-attytraining` (not old repo); get `*.workers.dev` URL and share with Rob
2. **Deploy cert Worker** — `cd workers/cert-worker && wrangler deploy`; confirm secrets survived deploy
3. **Wire Supabase Database Webhook** on `quiz_attempts` INSERT → POST to cert Worker URL with `X-Webhook-Secret` header
4. **Run smoke test** (Step 10) — work through all 7 checks; Rob will do checks 6 (curl cert Worker) and 7 (stripe listen) on his machine
5. Once smoke test passes — **`/gsd:plan-phase 0`** to kick off Phase 0 planning

## Next Steps for Rob (pending)

- Add BSBR Holdings LLC address in Stripe dashboard → Settings → Tax (unblocks live-mode objects)
- CPA consult on SaaS sales tax (~$300–$500)
- Decide on training app subdomain (e.g. `app.aistaffcompliance.com` or `training.aistaffcompliance.com`) — needed before launch DNS cutover

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
