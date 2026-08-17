# Session summary — 2026-08-17 (Max, with terminal-Claude)

> **Read this first if you are looking for IURIX work: there is almost none.** This session was
> Pentagon (the AI-ethics vault, `~/sites/pentagon`). IURIX code was not touched. Every IURIX item
> open at the end of 2026-08-14 is still open and unchanged — they are restated at the bottom so
> nothing is lost by this session being about a different project.

## The one thing that touched this repo

`f3256c1` — **the brief archive moved out to its own repo.** `.planning/brief-archive/` is gone from
here and now lives at `~/sites/intel-brief` (github: `solarsaiko-code/intel-brief`, private). The
move used `git subtree split`, so all 18 commits of item history came across intact.

**Why it matters to whoever reads this:** the board tracks three projects by item-id prefix —
`ix-*` Iurix (65 items), `pt-*` Pentagon (4), `iq-*` IurisIQ (4). Two thirds of it had nothing to do
with this repo. **If you used to `grep` `.planning/brief-archive/` for an item's history, grep
`~/sites/intel-brief/` instead.** Item files still reference `.planning/POLICY-DECISIONS.md`,
`QUESTION-POOL.md` and `PROD-CUTOVER.md` in this repo — those references are correct and were left
alone. See `.planning/BRIEF-MOVED.md`.

---

## Pentagon — three of four items closed

Full detail is in `~/sites/pentagon/SESSION-LOG.md` (two entries dated today). Summary:

| Item | Was | Now |
|---|---|---|
| `pt-build001` | To do | ✅ **Done** — BUILD-001 published |
| `pt-cites` | To do (Katy) | ✅ **Done** — Max confirmed both corrections |
| `pt-opinions` | To do | ✅ **Done** — BUILD-002 built and published |
| `pt-verify` | To do | Still to do — 6 of 181, Max's reading time |

**BUILD-001 had been built, committed and correct since 2026-07-27 and never published.** The live
artifact was still serving the pre-redesign layout for three weeks while the log read "built."

**BUILD-002 is new** — an ethics-opinions block on the artifact: a duty matrix over 22 documents in
17 jurisdictions, then a card per document.

Artifact: `https://claude.ai/code/artifact/9ad617d2-7187-4973-91cc-bbc3c4e4c69a`

### 🔴 One Pentagon finding that is directly load-bearing for IURIX

**Florida Bar Ethics Opinion 24-1 cites Rule 4-5.3(a)** — Florida's supervision-of-nonlawyer-
assistants rule, the state analogue of the ABA Model Rule 5.3 this entire product is built on.
Pennsylvania Joint Formal Opinion 2024-200 cites Rules 5.1 and 5.3 and says AI must be overseen
"as they would human staff." Kentucky E-457 puts the supervision duty specifically on **partners and
managers**.

That is three named jurisdictions putting the AI-supervision duty exactly where IURIX sells it. If
marketing ever needs citations behind the Rule 5.3 framing, they now exist in one place —
`~/sites/pentagon/ethics-opinions/` (22 documents, tracked in git) and `cabinet/opinions.json`.

Also worth knowing for the compliance framing: **no jurisdiction has amended its Rules of
Professional Conduct for AI.** Every one concluded the existing rules already reach it. And exactly
one — **West Virginia L.E.O. 24-01** — requires the client's informed written consent before using
generative AI, where everyone else concluded disclosure is not required.

### Findings worth carrying (they generalise beyond Pentagon)

- **A local build is not a publish, and only the live URL proves it.** Three weeks of "done" that
  wasn't. Verification now fetches the live page and checks strings that must be present *and*
  strings that must be absent. This is the same lesson as the `ix-signinlogo` `viewBox` check on
  2026-08-14 — twice in one week, so it is a pattern rather than a one-off.
- **Try the Internet Archive first on bot-gated sites.** `floridabar.org` and `njcourts.gov` both
  403 automated fetchers, and floridabar.org blocks real browsers too — Max hit "Sorry, you have
  been blocked" himself. The Archive had clean snapshots of both. Faster than routing to a human,
  and it solved the one source that had beaten every other approach. **The Cloudflare gates were
  deliberately not worked around.**
- **Enforce trust rules in the validator rather than trusting them.** `build_opinions.py` checks
  that a summary claiming a provenance actually exists and one claiming none is actually empty. It
  caught two of terminal-Claude's own rows on the first run.
- **A curated reference list decays and does not announce it.** Oregon issued formal opinion
  2026-208 seven months after the list was compiled, in a state already on the list. Virginia LEO
  1901 landed November 2025. Both were missing. A one-time compile is not a reference.

---

## 📌 IURIX — everything below is UNCHANGED from 2026-08-14

Restated so this session does not bury them. **None of these were worked on today.**

### Next steps
- File `ix-authoverflow` and fix the 390 px horizontal overflow on `/login` and `/onboarding`
  (confirmed pre-existing, verified by stashing and re-shooting at `HEAD`)
- Decide `ix-lessongate` — new bug, or a PROD reproduction of `INTERFACE-CORRECTIONS.md` item 2
  (false-positive course completion). Evidence:
  `/Users/maxlugo/Attorney training/phase-b-evidence-2026-08-14/training-events-employee.json`
- **Re-link the Supabase CLI to staging.** `supabase/.temp/project-ref` is still
  `ttqthtzdjacrhjtrcmmy` — **verified still true today**. Any `supabase db push` from this repo hits
  PROD until it is re-linked.
- Set `lookup_key: per_seat_annual` on the **live** Stripe Price when it is created. Live mode
  refuses to charge without it.
- Plan the first-live-subscription verification of reconciliation direction 1 — the
  "paid but got nothing" detector has never run with a non-empty `subs`.

### Also carried
- `ix-certpage` — no completion screen, no durable certificate page; the only handle on a finished
  certificate is an expiring signed URL.
- `ix-questionpool` — pool (8) still equals `questions_per_attempt` (8), so retakes reshuffle rather
  than resubset.
- `ix-prodseed` residual — keep the PROD test-firm purge discipline. The first live subscription
  switches reconciliation directions 2 and 3 on for the first time.

### Proven on PROD (unchanged)
Checkout → firm → admin onboarding → employee invite → training → quiz fail then pass → real
certificate PDF in the private bucket → purged clean. See `20260814-max-summary.md`.

---

## Repo state at wrap

| Repo | Head | Pushed |
|---|---|---|
| `bsbr-attytraining` | this summary + `f3256c1` | yes |
| `~/sites/pentagon` | `82e35ff` | yes |
| `~/sites/intel-brief` | `64ab6a1` | yes |

## Open / next

1. **`pt-verify`** — Pentagon case verification, 6 of 181. Max's reading. Not a release gate:
   unverified-by-default is honest under the project's own trust rules.
2. **The Pentagon artifact's share pin is stale.** It is shared "anyone with the link," but viewers
   see a pinned pre-redesign version. Anyone sent that link today gets the old page. Fixing it is a
   UI action in the artifact's share menu — it cannot be done from the publishing tool.
3. **IURIX** — resume at `ix-authoverflow`, per the list above.
