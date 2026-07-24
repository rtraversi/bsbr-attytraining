# Session — 2026-07-24 (Max, **DESKTOP Claude**)

> ## ⚠️ READ THIS BEFORE ANYTHING ELSE — SCOPE WARNING
>
> **This was a desktop Claude session, not a terminal/coding session in this repo.**
> **No code in `bsbr-attytraining` was changed.** The working tree was clean at start and end.
>
> This session spanned **four separate projects**. It is filed here because this is where
> session summaries live — *not* because all of it belongs to this codebase.
>
> **Only Section 1 applies to this repository (Aegix / bsbr-attytraining).**
> Sections 2–4 belong to entirely different projects. Do **not** action them against this
> codebase, and do not treat their findings as facts about this code.
>
> | Section | Project | Applies to this repo? |
> |---|---|---|
> | 1 | **Aegix / bsbr-attytraining** (AI compliance training platform) | ✅ **YES** |
> | 2 | IurisIQ portal (`rtraversi/iurisiq-portal-template`) | ❌ different repo |
> | 3 | AI ethics case-law research (Katy deliverable) | ❌ no repo |
> | 4 | Katy Chavez email signature (branding asset) | ❌ no repo |
>
> **Naming note:** Katy refers to this project as **"Aegix."** Aegix = bsbr-attytraining.
> This is confirmed, not a guess.

---

# SECTION 1 — AEGIX / bsbr-attytraining ✅ *(the only part relevant to this repo)*

No code written. This was a verification and triage pass: the 2026-07-17 punch list was
re-checked against the actual codebase rather than trusted from session notes.

## Items closed

- **Deploy** — Max ran `pnpm run deploy`. Everything since `61b152d` is now live.
- **Team-status "not showing in progress" bug — CLOSED, no bug.** Re-tested after the deploy;
  Max confirmed it works. The fallback logic in `app/dashboard/page.tsx` was correct all along —
  the live failure was purely the stale pre-deploy build. No further investigation needed.
- **Cloudflare Error 1102 ("Worker exceeded resource limits") — DROPPED from tracking.**
  Re-flagged as open across 5+ sessions since 2026-07-10 with zero new diagnosis each time.
  Max's call: almost certainly a one-off server issue; it has never recurred on any subsequent
  run. **Stop carrying it forward.** Revisit only if it actually happens again.
- **Cert-worker — NOT dead code.** Max suspected it might be an unnecessary Claude-invented
  complication. It isn't. `workers/cert-worker/src/index.ts` is ~500 lines of real, implemented
  logic running two things nothing else does: the 5-minute `cert_generation_queue` drain and the
  daily 9am expiry / inactivity / renewal reminder crons. It was already built and deployed
  (`bsbr-cert-worker.aistaffcompliance.workers.dev`). Only action: confirm it's still healthy
  post-deploy. **Do not propose removing it.**

## Items still open

- **Auth performance (~5s per dashboard route) — STILL NEEDS MAX'S GO-AHEAD, not yet given.**
  Verified: **zero** `getClaims()` usage anywhere in the repo. `getUser()` is called three times
  per navigation (`middleware.ts:36` → `app/dashboard/layout.tsx:11` → the page), each a network
  round-trip to Supabase Auth, plus a per-member `admin.auth.admin.getUserById` fan-out at
  `app/dashboard/page.tsx:56`. CLAUDE.md mandates `getClaims()` and the codebase ignores it
  everywhere. Fix touches ~7 files across auth — needs an explicit yes before starting.
- **Onboarding stub — CONFIRMED A REAL GAP, newly added to the to-do list.**
  `app/api/onboarding/complete/route.ts:82` hardcodes
  `cloudflare_stream_video_id: 'stub-not-yet-uploaded'` when auto-creating a firm's course row on
  first admin onboarding. Max confirmed this was **never actually built**. Needs real design:
  where does a new firm's course/content reference come from at signup? Not yet scoped.
- **Cert PDF logo** (`lib/cert-pdf.ts:18`) — stays a placeholder deliberately. Max has a new
  draft, but it's intended as a *better placeholder*, not final. Swap in when he sends the file.
- **Question pools — content checklist started for Katy + Rob.** Two placeholder pools:
  `supabase/migrations/0003_quiz_questions.sql` (8 questions, the *certifying* quiz — pool size
  equals attempt size, so every attempt shows the same 8; no randomization) and
  `lib/training/questions.ts` (15 ungraded knowledge-checks, 3 per lesson; content quality is
  actually decent, labeled placeholder but not lorem-ipsum). Split: **Katy** = legal-accuracy
  pass on both; **Rob** = commit to a pool size (the ~24–32 target has been unresolved since
  2026-06-12). Not blocking — Katy is actively working on content.
- **Rise 360 "completed-incomplete" gating** — narrower than the 07-17 notes implied.
  `contentViewed` *can* fire via the SCORM `video_completed` event; only the deliberately
  ungraded knowledge-checks never set it. **Max's call: Rise content works fine, no action
  unless something actually breaks.**

## Correction to repo docs

**`.planning/STATE.md` is badly stale** — it still reports "Phase 0, 0% complete" as of
2026-06-12. Phases 1–5 are done and deployed. Ignore STATE.md; `session_handoff.md` plus the
files in `.planning/sessions/` are the real source of truth.

---

# SECTION 2 — IurisIQ PORTAL ❌ *(different repo — `rtraversi/iurisiq-portal-template`)*

**Do not action any of this against bsbr-attytraining.** Separate product, separate client,
separate codebase. Local clone: `/Users/maxlugo/sites/iurisiq-portal-template`.

## Delivered: all six of Katy's USCIS forms

Roughly **1,887 field decisions** across five PRs, all open and **unreviewed**.

| Form | PR | Fields | Mapped |
|---|---|---|---|
| N-400 | pre-existing | — | — |
| I-751 | **#2** | 318 | 62 |
| I-864 | **#3** | 207 | 52 |
| I-485 | **#4** | 736 | 68 |
| I-130 | **#5** | 438 | 77 |
| I-130A | **#6** | 188 | 45 |

Branch-per-form, each off `master` (never off another form's branch), one `.sql` file per PR.

## The three party-role patterns (getting this wrong is the silent killer)

1. **I-751, I-485** — the applicant *is* the client (client in Part 1)
2. **I-864, I-130** — inverted: petitioner/sponsor in Part 2, client/beneficiary in Part 3 or 4
3. **I-130A** — client only; `petitioner.*` used **zero** times

## Findings worth more than the maps themselves

- **A USCIS tooltip can itself be WRONG.** I-485 has an address block where
  `P6Line8_Unit/_Number/_State/_ZipCode` carry "Interpreter's Mailing Address" tooltips while
  physically sitting in the Part 6 spouse block. Resolution technique: **widget geometry**
  cross-referenced against positioned page text. `§4` of the process doc needs this documented.
- **I-130 naming traps.** One prefix spans two unrelated sections: `Pt2Line41_Yes/_No` = item 41,
  but `Pt2Line41_Street/_City/_State/...` = item **43** (Employer 1's address). Also items 61/62
  are name-inverted — `Pt4Line60*` is printed item 61, `Pt4Line61*` is printed item 62 — on the
  exact pair Katy says causes serious delays.
- **The I-864 does NOT use `joint_sponsor.*` and structurally cannot** (a joint sponsor files
  their own I-864 as the Part 2 subject). Rob's `§8` batch-order rationale rests on this wrong
  premise. Consequence: the 1604 plumbing is **orphaned and untested**, with no test path.

## Four cross-cutting escalations (Rob's side)

1. **`uppercase` transform** — firm convention is ALL CAPS names/countries. Highest leverage;
   affects all six forms. No case transform exists in `applyTransform`.
2. **"column is non-empty" transform** — employment-status checkboxes.
3. **equals-style transform** — status checkboxes (I-864, I-130).
4. **Per-case context at generate time** — four instances across two layers (which party an I-864
   is for; consular-vs-adjustment on I-130 items 61/62; whose marriage Part 2 asks about; whether
   I-130A belongs in the package at all).

`1600-g28-atty-fields.sql` is precedent for amending maps afterward via a jsonb merge — so
missing transforms are **not** blockers.

**Rob owes:** R2 template uploads, migrations to sandbox, and the §8 accuracy gate (generate a
filled PDF per form, read field-by-field). **Nothing is verified yet.**

---

# SECTION 3 — AI ETHICS CASE-LAW RESEARCH ❌ *(Katy deliverable, no repo)*

Cabinet artifact (private): https://claude.ai/code/artifact/9ad617d2-7187-4973-91cc-bbc3c4e4c69a
Working folder: `/Users/maxlugo/Attorney training/ai-ethics-research/`

- **1,228 US court decisions logged** from Damien Charlotin's database; **178 priority** cases
  (attorney-caused + real sanction) carry expandable summaries.
- **KEY FINDING — the database is an index of *candidates*, not confirmed AI cases.** Reading
  *Waggeh v. Utility Workers Union* end-to-end revealed the decision **never mentions AI**.
  Measured across the 178: **62 name a tool, 61 "found but unnamed", 55 are "implied only"** —
  i.e. ~31% where the court never said AI. Now surfaced as an **AI-basis badge** + filter so
  Katy can see which cases are safe to cite.
- **6 gap cases read from the actual decisions** and summarized (Waggeh, Dastou, Neusom,
  D'Angelo, Smith, Crabill). **Crabill is the standout for Katy's refused-to-correct question**:
  he realized his cites were fake the morning of the hearing, didn't withdraw, let the court raise
  it, then told the judge he'd "leaned too heavily on a legal intern" — which the stipulation
  states flatly "were not true." 1yr+1day suspension.
- **2 unreachable:** Costco (FindLaw is Cloudflare/JS-gated), and a New Hampshire row with no
  case name *and* no source document — a permanent dead end.
- **Deliverables for Max's review loop:** `review-ledger.xlsx` (sortable, filter dropdowns,
  colour-coded status, yellow input columns) + `review-ledger.csv` + `case-pdfs/` + `README.md`.
- **Workflow:** Max checks boxes / adds verdicts → hands the file back → Claude applies the edits
  and updates the cabinet. One editor at a time.

---

# SECTION 4 — KATY CHAVEZ EMAIL SIGNATURE ❌ *(branding asset, no repo)*

Final state: **exact original design, fluid (expands to container width), served via jsDelivr CDN.**

- Files: `signature.html` + `signature-INSTALL.html` in `/Users/maxlugo/Attorney training/`
- Assets repo: **`github.com/solarsaiko-code/kc-signature-assets`** (public, Max's personal GH)
- Live URL: `cdn.jsdelivr.net/gh/solarsaiko-code/kc-signature-assets@main/v2/banner-v3.jpg`

**Hard constraint learned: Montserrat cannot render as live text in Gmail.** Email clients
support only a few system fonts and Gmail strips `@font-face`. So the Montserrat look and
live/clickable text are **mutually exclusive** — keeping the design exact means the text stays
part of the image, and the whole banner is one link.

**Hosting lesson:** postimages put the uploads in a moderation queue and served "Under review"
placeholders — broke the signature. GitHub raw then proved slow because it sends
`cache-control: max-age=300` (5 min), so Gmail re-downloaded the banner constantly. jsDelivr
fixed it (7-day cache, half the file size).

**OPEN / NEXT SESSION:**
- Bottom portion still needs a reset to load — **Max wants to move hosting to their Cloudflare.**
  Explicitly deferred to a future session.
- Still needed from Max: **Facebook / LinkedIn / YouTube URLs** (currently unlinked).
- The assets repo is load-bearing — renaming/deleting files breaks the signature retroactively.

---

## Where to pick up (Aegix only)

Nothing in this repo is mid-flight. The two real Aegix to-dos are the **auth performance fix**
(needs Max's go-ahead) and **designing the onboarding course-reference** (unscoped). Everything
else above belongs to other projects.
