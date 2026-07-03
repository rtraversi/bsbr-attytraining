---
phase: quick-260703-g7x
plan: 01
subsystem: ui
tags: [nextjs, react, tailwind, stripe-checkout, mockup]

# Dependency graph
requires: []
provides:
  - "New self-contained /mockup route rendering Rob's v0 homepage concept in a forced light palette"
  - "Volume-band pricing card wired to the real /api/checkout contract"
affects: [marketing-homepage, pricing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route-scoped theme override via inline CSS custom properties on a wrapper div (no dark-mode media query, no edits to globals.css)"
    - "Self-contained route component copies under app/<route>/_components/ to avoid touching shared app/_components or components/ui"

key-files:
  created:
    - app/mockup/page.tsx
    - app/mockup/_components/reveal.tsx
    - app/mockup/_components/site-header.tsx
    - app/mockup/_components/hero.tsx
    - app/mockup/_components/trust-bar.tsx
    - app/mockup/_components/features.tsx
    - app/mockup/_components/why-section.tsx
    - app/mockup/_components/site-footer.tsx
    - app/mockup/_components/pricing.tsx
  modified: []

key-decisions:
  - "Typed the /api/checkout JSON response as { url?: string; error?: string } in pricing.tsx to satisfy strict tsc (data was `unknown` under the project's TS config) — behavior unchanged from v0 source"
  - "Ran `corepack pnpm install` before the verification gates because node_modules was absent in the working tree; no lockfile or package.json changes resulted"

requirements-completed: [QUICK-260703-g7x]

# Metrics
duration: ~20min
completed: 2026-07-03
---

# Quick Task 260703-g7x: Mock up v0 homepage concept as /mockup Summary

**Ported Rob's v0 homepage concept into a new, fully self-contained `/mockup` route with a forced light palette and pricing wired to the real $35/$32/$28 volume bands and `/api/checkout`.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-03
- **Tasks:** 3 completed
- **Files modified:** 9 created, 0 modified

## Accomplishments
- New route `app/mockup/page.tsx` renders the full v0 concept (header, hero, trust bar, 6 curriculum cards, why/steps, pricing, footer) in a light palette forced via inline CSS custom properties + `colorScheme: "light"` — no dark-mode media query, `app/globals.css` untouched.
- All 8 v0 components ported into `app/mockup/_components/` as self-contained copies; the 3 `Button render={<a/>}` usages (2 in hero, 1 in site-header) converted to the project's `asChild` pattern.
- Pricing card now computes a live per-seat rate from the locked volume bands (`perSeatRate`: 1–9 → $35, 10–24 → $32, 25+ → $28) and a live total, capped at 500 seats, POSTing `{ seats }` to the existing `/api/checkout` route and redirecting to `data.url`.
- Zero edits to `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/_components/*`, or `components/ui/*`.
- Both verification gates pass clean: `npx tsc --noEmit` and `npm run lint`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold /mockup route with light palette, scoped reveal CSS, and the Reveal util** - `94a095c` (feat)
2. **Task 2: Port the six presentational sections, converting render props to asChild** - `76ce7ce` (feat)
3. **Task 3: Port pricing with real volume bands wired to /api/checkout, then typecheck + lint** - `2ac2575` (feat)

**Plan metadata:** committed by orchestrator (docs commit not made by this executor per constraints)

## Files Created/Modified
- `app/mockup/page.tsx` - Server Component wrapper: light-palette CSS vars, scoped `.reveal` styles, route metadata, section assembly in v0 order
- `app/mockup/_components/reveal.tsx` - Self-contained IntersectionObserver reveal util (verbatim port)
- `app/mockup/_components/site-header.tsx` - Sticky nav header, scroll-aware backdrop, "Train your team" CTA (render→asChild)
- `app/mockup/_components/hero.tsx` - Hero section with animated compliance-checklist panel (render→asChild ×2)
- `app/mockup/_components/trust-bar.tsx` - Trust-point strip
- `app/mockup/_components/features.tsx` - 6 curriculum feature cards
- `app/mockup/_components/why-section.tsx` - Stats + 3-step "why it matters" section
- `app/mockup/_components/site-footer.tsx` - Footer
- `app/mockup/_components/pricing.tsx` - Volume-band pricing card wired to `/api/checkout`, stepper capped at 500

## Decisions Made
- Typed the checkout fetch response (`{ url?: string; error?: string }`) instead of leaving it `unknown`, to satisfy the project's strict `tsc --noEmit` gate — no behavior change from the v0 source, purely a type annotation.
- Installed dependencies via `corepack pnpm install` (node_modules was missing from the working tree) so the `tsc`/`lint` gates could run; this did not modify `pnpm-lock.yaml` or `package.json`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Typed the /api/checkout response in pricing.tsx**
- **Found during:** Task 3 (pricing.tsx typecheck gate)
- **Issue:** `const data = await res.json()` typed as `unknown` under this project's TS config, causing 3 `TS18046` errors on `data.url` / `data.error` access — the verbatim v0 code assumed implicit `any`.
- **Fix:** Added an inline cast `(await res.json()) as { url?: string; error?: string }`, matching the pattern already used elsewhere in the repo (`app/_components/checkout-form.tsx`).
- **Files modified:** `app/mockup/_components/pricing.tsx`
- **Verification:** `npx tsc --noEmit` passes clean.
- **Committed in:** `2ac2575` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/typecheck fix)
**Impact on plan:** Necessary to satisfy the plan's own verification gate (`npx tsc --noEmit` must pass). No scope creep — no shared files touched.

## Issues Encountered
- `node_modules` was absent from the working tree at task-3 time, so `npx tsc` initially failed by fetching an unrelated `tsc` npm package instead of resolving the project's local TypeScript. Resolved by running `corepack pnpm install` (project's declared package manager per lockfile), which brought in the local `typescript` devDependency and let `npx tsc --noEmit` resolve correctly. No lockfile/package.json changes resulted from the install.

## User Setup Required
None - no external service configuration required. `/mockup` is reachable at `http://localhost:3000/mockup` (or the deployed preview URL) once `next dev` / the Worker preview is running — no new env vars.

## Next Phase Readiness
- `/mockup` is a live, reviewable light-concept homepage for Rob, fully isolated from the production Athena homepage at `/`.
- Pricing on `/mockup` reflects the locked $35/$32/$28 volume bands and drives the real Stripe checkout flow, so it can be used for an end-to-end visual/functional review without any backend changes.
- No blockers. If Rob approves the concept, a follow-up task would replace `/` with this content (out of scope here).

---
*Quick task: 260703-g7x*
*Completed: 2026-07-03*

## Self-Check: PASSED

All 9 created files verified present on disk. All 3 task commits (`94a095c`, `76ce7ce`, `2ac2575`) verified present in `git log --oneline --all`. No missing items.
