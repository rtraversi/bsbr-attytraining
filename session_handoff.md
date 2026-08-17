# Session Handoff

**Date:** 2026-08-17
**Who:** Max, with terminal-Claude.

> ⚠️ **Rob — this session was Pentagon, not IURIX.** No IURIX code was touched. Every IURIX item
> open at the end of 2026-08-14 is still open, restated below so nothing is lost. If you are picking
> up IURIX work, skip to **"IURIX — unchanged"** and start at `ix-authoverflow`.

## In one paragraph

The day went to **Pentagon** (the AI-ethics vault at `~/sites/pentagon`), where three of four board
items closed. BUILD-001 — built, committed and correct since 2026-07-27 — turned out to have
**never been published**; the live artifact had been serving the pre-redesign layout for three
weeks. It is now live. BUILD-002 is new: an ethics-opinions block on the artifact, a duty matrix
over 22 documents in 17 jurisdictions plus a card each. The ethics-opinion collection was also
believed lost in the 2026-07-24 folder incident and **was not** — all 17 documents survived in a
stale copy and are now tracked in git, plus five more found by auditing coverage. The only change in
*this* repo is `f3256c1`, which moved the brief archive out to its own repo.

## 🔴 The bit that matters to IURIX

**Three named jurisdictions put the AI-supervision duty exactly where IURIX sells it.** Florida
Ethics Opinion 24-1 cites **Rule 4-5.3(a)**, Florida's supervision-of-nonlawyer-assistants rule.
Pennsylvania Joint Formal Opinion 2024-200 cites **Rules 5.1 and 5.3** and says AI must be overseen
"as they would human staff." Kentucky E-457 puts the duty specifically on **partners and managers**.

If the marketing or compliance framing ever needs citations behind Rule 5.3, they now exist in one
place: `~/sites/pentagon/ethics-opinions/` (22 documents, tracked) and `cabinet/opinions.json`.

Two more facts from that bucket worth having: **no jurisdiction has amended its Rules of
Professional Conduct for AI** — all concluded the existing rules already reach it. And exactly one,
**West Virginia L.E.O. 24-01**, requires the client's informed written consent before using
generative AI; everyone else concluded disclosure is not required.

## 📍 The brief archive moved — update your grep

`.planning/brief-archive/` is **gone from this repo**. It now lives at `~/sites/intel-brief`
(github: `solarsaiko-code/intel-brief`, private). `git subtree split` was used, so all 18 commits of
item history came across intact. The board tracked three projects by prefix — `ix-*` Iurix (65),
`pt-*` Pentagon (4), `iq-*` IurisIQ (4) — and two thirds of it did not belong here.

Item files still point at `.planning/POLICY-DECISIONS.md`, `QUESTION-POOL.md` and `PROD-CUTOVER.md`
in this repo. **Those references are correct and were left alone.** See `.planning/BRIEF-MOVED.md`.

## ✅ Pentagon — 3 of 4 closed

| Item | Result |
|---|---|
| `pt-build001` | ✅ BUILD-001 published; four open design questions answered |
| `pt-cites` | ✅ KY **E-457** (not E-471); **NYSBA** (NY *State* Bar, not NYC Bar) |
| `pt-opinions` | ✅ BUILD-002 live; collection complete at 22 held, 0 outstanding |
| `pt-verify` | ⬜ 6 of 181 cases verified — Max's reading, **not** a release gate |

Artifact: `https://claude.ai/code/artifact/9ad617d2-7187-4973-91cc-bbc3c4e4c69a`

## 🧠 Findings that generalise

- **A local build is not a publish, and only the live URL proves it.** Three weeks of "done" that
  wasn't. Verification now fetches the live page and checks strings that must be present *and*
  absent. **This is the second time in one week** — same lesson as the `ix-signinlogo` `viewBox`
  check on 2026-08-14. Treat it as a rule, not an anecdote.
- **Try the Internet Archive first on bot-gated sites.** `floridabar.org` and `njcourts.gov` both
  403 automated fetchers, and floridabar.org blocks real browsers too — Max was blocked himself. The
  Archive had clean snapshots of both. The Cloudflare gates were deliberately **not** worked around.
- **A curated reference list decays silently.** Oregon issued a new formal opinion seven months
  after the list was compiled, in a state already on it. Virginia's landed November 2025. Both were
  missing until audited.
- **"Re-downloadable" is not a backup.** That was the stated reason the ethics opinions were
  gitignored. They survived the folder loss by luck, and 2 of 19 could not be downloaded at all.

## 📌 IURIX — unchanged from 2026-08-14

**Nothing below was worked on today.** Full context in `.planning/sessions/20260814-max-summary.md`.

### Next steps
- **`ix-authoverflow`** — file it and fix the 390 px horizontal overflow on `/login` and
  `/onboarding`. Confirmed pre-existing (verified by stashing and re-shooting at `HEAD`).
- **`ix-lessongate`** — decide: new bug, or a PROD reproduction of `INTERFACE-CORRECTIONS.md`
  item 2 (false-positive completion). Evidence in
  `/Users/maxlugo/Attorney training/phase-b-evidence-2026-08-14/training-events-employee.json`.
- **Re-link the Supabase CLI to staging.** `supabase/.temp/project-ref` is still
  `ttqthtzdjacrhjtrcmmy` — **re-verified today, still true.** Any `supabase db push` hits PROD.
- **Set `lookup_key: per_seat_annual` on the live Stripe Price** when created, or live checkout
  refuses to charge.
- **Plan the first-live-subscription check of reconciliation direction 1** — the "paid but got
  nothing" detector has never run with a non-empty `subs`.

### Carried
- `ix-certpage` — no completion screen, no durable certificate page; only an expiring signed URL.
- `ix-questionpool` — pool (8) == `questions_per_attempt` (8), so retakes reshuffle, not resubset.
- `ix-prodseed` residual — keep the PROD test-firm purge discipline.

### Proven on PROD (unchanged)
Checkout → firm → admin onboarding → employee invite → training → quiz fail then pass → real
certificate PDF in the private bucket → purged clean.

## Repo state

| Repo | Head | Pushed |
|---|---|---|
| `bsbr-attytraining` | this handoff | yes |
| `~/sites/pentagon` | `82e35ff` | yes |
| `~/sites/intel-brief` | `64ab6a1` | yes |

## ❓ Open

1. **`pt-verify`** — Pentagon case verification, 6 of 181. Max's reading time.
2. **The Pentagon artifact's share pin is stale.** Shared "anyone with the link," but viewers see a
   pinned pre-redesign version — anyone sent that link today gets the old page. It is a UI action in
   the artifact's share menu; it cannot be done from the publishing tool.
3. **IURIX** — resume at `ix-authoverflow`.
