# Session Handoff

**Date:** 2026-06-29 (Sunday)
**Who:** Rob

---

## Rob's Context — Read Before Anything Else

- **Launch timeline:** Jul 20 go-live; Jul 1 code-complete; Jul 10 content-complete; Jul 13 testing week (≥6 testers)
- **Stripe live mode on hold:** LLC applied 10 days ago (15–20 day window) — expected ~5–10 more days. Do NOT create live Stripe objects until LLC + EIN + brand name confirmed.
- **BetterStack confirmed:** Rob has a BetterStack account — use it instead of UptimeRobot. Wire to `https://bsbr-attytraining.aistaffcompliance.workers.dev/api/health`, 30-sec check interval, SMS on failure.
- **Rob action required (AUTO-06):** Save all Worker secrets to password manager; confirm Supabase PITR enabled on prod before launch.
- **Rob action required:** Deploy cert-worker with renewal reminders: `cd workers/cert-worker && wrangler deploy --config wrangler.toml`

---

## What Was Done This Session

### Legal Documents Created (for attorney review)

Three files added to `C:\Sites\attytraining\` (repo root):

- **`Privacy-Policy-DRAFT.docx`** — Full Privacy Policy draft. 11 sections. All attorney action items in bold red `[ATTORNEY TO COMPLETE: ...]`. Pre-filled: sub-processors (Stripe, Supabase, Resend, Cloudflare), 7-year cert retention, security measures, product description.
- **`Terms-of-Service-DRAFT.docx`** — Full Terms of Service draft. 18 sections. Pre-filled: pricing tiers ($35/$32/$28), 14-day refund policy, 80% pass threshold, 7-year cert retention, WCAG 2.1 AA accessibility commitment, limitation-of-scope language (not legal advice, not ABA accreditation).
- **`LEGAL-DOCS-ATTORNEY-CHECKLIST.txt`** — Consolidated checklist of every open item across both documents, organized by section. Rob sends this + both Word docs to the attorney.

### Key Decisions Made This Session

- **Accessibility standard:** WCAG 2.1 AA (not Section 508 — that's federal gov only). Already embedded in ToS.
- **BetterStack:** Confirmed as good as or better than UptimeRobot. Stick with it.
- **LLC timing:** 10 days into a 15–20 day window — on track, won't block July 20 launch.
- **Training content:** Max is building in Articulate Rise 360 now (previously listed as Rob's task).

---

## Current Status

| Item | Status |
|------|--------|
| Phase 1–5 (all features) | ✅ Complete + deployed |
| Phase 6 — 6B-PRE (12 polish tasks) | ✅ Complete + deployed |
| Phase 6 — 6A design (Max, Stitch) | 🟡 Max working on Rise 360 content; design proposals pending |
| Phase 6 — 6B design implementation | ⏸ Blocked on design approval from Rob |
| Phase 6 — 6C QA scripts | ⏸ Write July 10–12 |
| Privacy Policy draft | ✅ Created — awaiting attorney review |
| Terms of Service draft | ✅ Created — awaiting attorney review |
| Attorney checklist | ✅ Created |

---

## Next Session — Pick Up Here

1. **Send legal docs to attorney:** `Privacy-Policy-DRAFT.docx` + `Terms-of-Service-DRAFT.docx` + `LEGAL-DOCS-ATTORNEY-CHECKLIST.txt` — attorney needs lead time before July 20
2. **Quiz question pool:** Rob/Katy need to deliver 24–32 questions before July 10 testing week — this is on the critical path
3. **BetterStack:** Wire health monitoring endpoint when you get a moment
4. **Max:** Present Rise 360 export + design proposals to Rob for approval → triggers 6B implementation
5. **LLC:** Expect confirmation in ~5–10 days → immediately create Stripe live-mode objects

---

## Blocked / Pending

| Item | Owner | Unblocks |
|------|-------|---------|
| Attorney review of Privacy Policy + ToS | Rob → attorney | Legal pages going live |
| Quiz question pool (24–32 Qs) | Rob + Katy | Testing week realism |
| LLC + EIN confirmed | Rob (in progress) | Stripe live mode |
| Stripe Tax on live account | Rob | PAY-06 |
| BetterStack health monitoring | Rob | AUTO-04 |
| AUTO-06: secrets + Supabase PITR | Rob | Pre-launch ops |
| Design proposals | Max | 6B design implementation |
| Rise 360 export | Max (in progress) | iframe placeholder in training-client.tsx |

---

## Key References

| Item | Value |
|------|-------|
| Main app URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| Cert-worker URL | `https://bsbr-cert-worker.aistaffcompliance.workers.dev` |
| Health endpoint | `https://bsbr-attytraining.aistaffcompliance.workers.dev/api/health` |
| Phase 6 plan | `.planning/PHASE-6.md` |
| Stripe sandbox account | AI Staff Compliance & Training (`acct_1ThDpr6ZCSojEKRr`) |
| Stripe Product ID | `prod_UgzKT3NrGNAvDA` |
| Stripe Price ID | `price_1TjNHc6ZCSojEKRrKs79ToJ0` (lookup: `per_seat_annual`) |
| GitHub repo | `rtraversi/bsbr-attytraining` |
