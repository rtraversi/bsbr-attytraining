# Session Handoff

**Date:** 2026-07-01 (Wednesday)
**Who:** Max

---

## What Was Done This Session (animation content — no code changes)

Work happened outside this repo, in `../storyline-animations/`, but logging here since it's
the Phase 6 design track and Rob should know status.

- **Episode 1 (Mystery Client / Confidentiality):** Already done — no changes this session.
- **Episode 2 (Perfect Brief / Hallucinations):** ✅ Script finalized. Final beat: Carlos
  claims he "verified" the fake case by asking the same AI tool to confirm it — Jackson
  points out that's not verification, it's the tool agreeing with itself. Ends on a screen
  recording of Carlos's actual AI chat log next to a Westlaw zero-results search. Structured
  as Scene / Visual / Teaching Point (see this file's prior session for the full script, or
  ask next session to regenerate — not yet saved to a script file in the repo).
- **Episode 3 (Filing Deadline / Filing Rules):** 🔄 In progress, not yet built.
  - Confirmed direction: paralegal (Amanda) asks AI to draft a Motion to Reopen, gets the
    substance right, but copy-pastes the raw AI output into the filing without cleanup —
    leftover chat preamble, unrendered markdown, and critically, no certificate of service
    (the AI even offered to add one in its closing line; Amanda skipped it).
  - Mock document asset created: `storyline-animations/ep3-mock-motion-wonky-format.txt` —
    fake Motion to Reopen written as raw AI-chat-pasted output, with production notes for
    the animator on what to keep visually messy.
  - Drafted fake portal copy for a fictional "National Immigration Filing Portal" (NOT real
    EOIR branding — Max is editing a real EOIR screenshot to swap in this fake copy) — nav,
    submission form fields, and a REJECTED banner citing formatting + missing certificate of
    service. Not yet saved to a file — only in chat, regenerate next session if needed.
  - Still open: countdown-clock copy / case-status confirmation screen text (offered, not
    yet drafted).
- **Episode 4 (Automation Builder):** Already embedded in Rise Lesson 4 (confirmed via
  decoding `content/runtime-data.js` in the Rise export zip — Storyline embed titled
  "animations 1 chatbox"). No changes this session.

## Rise 360 Lesson Mapping (confirmed this session)

Decoded the actual Rise export
(`../june 30th 2026 version ai-staff-compliance-certificate-raw-QQuJdBsc.zip`) to get real
lesson titles and embed status — do not rely on guesses here, re-decode if the export changes.

| Lesson | Title | Animation mapped |
|---|---|---|
| 1 | Introduction to AI in Legal Practice | Ep 5 (Magic Robot Myth) — not built |
| 2 | Protecting Client Confidentiality with AI Tools | Ep 1 ✅ (native Rise, not a Storyline embed) |
| 3 | Ensuring Accuracy: Verification and Supervision of AI Outputs | Ep 2 (script done, not built) — Ep 3 could also go here or in Lesson 5, undecided |
| 4 | Compliant AI Workflows: Automations vs. Chatbox Use | Ep 4 ✅ (Storyline embed, confirmed) + Ep 6 (Two Summaries, not built) |
| 5 | Applying Ethical Rules and Firm Policy to Everyday AI Use | Ep 7 (Ethics Escape Room, not built) + maybe Ep 3 |

**Important distinction found:** Ep1 and Ep4 are embedded two different ways — Ep1 appears to
be built natively inside Rise (no separate Storyline package found), Ep4 is a full Storyline
360 export embedded as an interactive block. Decide which approach Ep2/3/5/6/7 should follow
before building — affects whether Max needs the Windows Storyline machine or can build directly
in Rise.

---

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
