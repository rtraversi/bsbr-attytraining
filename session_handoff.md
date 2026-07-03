# Session Handoff

**Date:** 2026-07-02 — TWO parallel sessions (Rob + Max), merged 2026-07-03
**Who:** Rob (status check / DIY redesign prep) **and** Max (Athena dark-rebrand build)

> ⚠️ **Collision notice:** On the same day, Rob decided to take a DIY pass at the homepage
> redesign (bundling the old homepage code for external design tools) **and** Max built and
> committed a brand-new dark "Athena" homepage + `/pricing`. Max's version is now what's on
> `main` (not yet deployed). Rob + Max need to sync on which direction wins before deploy.

---

## Max's session — Athena landing page (dark rebrand) first build

Built the new **Athena** dark-rebrand marketing pages from
`landing page design resources/LANDING-PAGE-BRIEF.md`. Full detail in
`.planning/sessions/20260702-max-summary.md` — read that for the file-by-file rundown.

**Scope built (brief §3):** Homepage (Hero + "Under the ABA Model Rule 5.3" hook +
Footer) and a dedicated `/pricing` page. Everything else deferred (nav → `#`).

**Highlights:**
- Pure-black hero: real `atc` logo vector + "athena." wordmark; right-aligned
  "training / made *[word]*" with a typewriter that cycles easy→simple→**for you
  then stops**; contained animated 2D "Closed Spiro" canvas on the left.
- Self-hosted **Stack Sans Headline** (OFL variable font) + Instrument Serif (italic word).
- "Under the ABA Model Rule 5.3" hook with a scroll-scrubbed (noir.io) per-word reveal
  + drawn-in underline, dot-grid backdrop.
- Custom Cuberto-style cursor (from `custom-cursor.svg`), snappy spring follow.
- `/pricing`: cofounder-style seat slider → live total, wired to volume bands + existing
  `/api/checkout`.
- Nav pill / Sign In+Get started pills, dark footer with disclaimer.

**Deleted:** `scrabble-hero.tsx`, `shader-bg.tsx` (dead). **Assets added to `public/`:**
logo svg, cursor svg, Stack Sans font (the `landing page design resources/` source
folder is **gitignored** — public/ copies are what the app uses).

## Rob's session — status check + DIY redesign prep

- No code changes. Status-check + handoff session.
- Reviewed Track 6A status: Max's Stitch design proposals were marked 🔴 Not started
  (superseded same-day by Max's Athena build above).
- Rob decided to take a stab at the homepage redesign himself; bundled the (old)
  live homepage code into a single reference file for external design tools
  (written to scratchpad, not the repo).

**Notable findings from Rob's review of the OLD homepage** (some now moot after Max's rebuild):
- Double-footer bug (light footer in `features-section.tsx` + dark shared `footer.tsx`).
- Dead code `scrabble-hero.tsx` (Max has since deleted it).
- `checkout-form.tsx` uses generic Tailwind blue/gray, not brand palette.
- Old homepage used copper/cream (`#C8783A`/`#FAFAF8`) vs. dashboard zinc/teal — unification
  still an open design question.

---

## Status

| Item | Status |
|------|--------|
| Athena homepage + /pricing (Max's pass) | ✅ Built, tsc + eslint clean — on `main` |
| Browser review of final tweaks | 🟡 Do `pnpm dev` before deploy |
| Deploy of Athena pages | ⬜ Not deployed — after review |
| Rob's DIY redesign direction (v0 concept) | 🟡 In progress — needs reconciling with Athena |
| Phases 1–6 (app features) | ✅ Complete + deployed (unchanged) |
| Privacy Policy / ToS drafts | ✅ Created 2026-06-29 — awaiting attorney review |

---

## Next Steps

1. **Rob + Max sync on homepage direction** — Athena (dark, Max) vs. Rob's v0 concept
   (same idea, lighter background). Decide before deploying either.
2. `pnpm dev` → review `/` and `/pricing`; then `pnpm run deploy` once direction is settled.
3. Gridlines — reverted to v1 (hero bottom strip only); Max will specify treatment.
4. Send legal docs (Privacy Policy, ToS, attorney checklist) to attorney if not already done.
5. Quiz question pool (24–32 Qs) still needed from Rob/Katy before July 10–13 testing week.
6. LLC/EIN confirmation still pending → unblocks Stripe live mode.

## Notes / loose ends

- Tuning dials: spiro `scale`/`speed` + amplitude-osc in `app/_components/spiro-pattern.tsx`;
  cursor hotspot offset in `app/_components/custom-cursor.tsx`.
- **Untracked `scripts/`** (`extract_names_from_scan.py`, `requirements-scan.txt`) —
  unrelated to landing page, left uncommitted for Max to handle.
- Orphaned-but-harmless: `features-section.tsx` + `checkout-form.tsx` no longer imported.
- Bethany Elingston licensed webfont not supplied → italic cycling word ships on
  Instrument Serif Italic (brief-sanctioned fallback).

## Blocked (unchanged — Rob's items)

- Attorney review of Privacy Policy + ToS
- Quiz question pool (24–32 Qs) — Rob + Katy
- LLC + EIN → Stripe live mode
- BetterStack health monitoring wiring

---

## Key References

| Item | Value |
|------|-------|
| Main app URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| Brief (local, gitignored) | `landing page design resources/LANDING-PAGE-BRIEF.md` |
| Max's session detail | `.planning/sessions/20260702-max-summary.md` |
| GitHub repo | `rtraversi/bsbr-attytraining` |
