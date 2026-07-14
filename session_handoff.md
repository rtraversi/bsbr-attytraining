# Session Handoff

**Date:** 2026-07-14 (Tuesday) — Max (terminal) with Claude. Admin-dashboard design pass.
Full detail: `.planning/sessions/20260714-max-summary.md`.

---

## 🟢 What shipped this session (4 commits, `tsc`+`eslint` clean, NOT deployed)

Ported the locked sketch `../certified-status-chart-v1.html` into the real admin dashboard,
then three rounds of Max-driven layout/size iteration:

1. **`1e7550b`** — viewport-fill grid (lg+: `h-screen` shell + `minmax(0,fr)` rows, no page
   scroll), **Manage team + Team overview merged into one 6-col table** (TeamOverviewTable
   deleted, handlers untouched), extra-muted em-dashes, **Certified block restyle** (plain
   label, weight ramp, 100% = flat gold `#D9AE4E` + warm radial), **NEW
   `certification-forecast.tsx`** (projects completion date off last-7-days cert pace via
   exported `useTeam`; honest fallback, no divide-by-zero).
2. **`bc1e00e`** — full-bleed: dropped `max-w-[1600px]` + `xl:py-14` from the admin shell
   wrapper; row split → **19:26**; name-only team rows; centered Certificate column.
3. **`3215a2a`** — headings → `text-2xl md:text-3xl`; billing plan subtext hover-reveals
   BESIDE the heading; Invitations fills its row, bigger controls; CSV text centered.
4. **`4eab2f1`** — Certified number container-query sized (`@container` +
   `clamp(4rem,34cqw,14rem)`, extralight — "100%" can never overflow; `34cqw` = the dial);
   quick-action chips 48px/icons h-7/labels text-base (also in `resend-invite-modal.tsx`'s
   duplicated tile); Manage team body `text-base` (min-w 780); invite buttons `py-4
   text-base`; forecast texts up a step, avatars 36px.

**Forecast judgment calls:** fallback copy says "last 7 days" (matches the real calc window;
sketch mock said 30); bar's solid segment anchors on earliest `certIssuedAt` since
`MemberDetail` has no invite date — "First invite" label is approximate.

---

## 🔴 Do FIRST next session
- **`pnpm run deploy` + walk it as a real admin AND employee.** THREE sessions of work are
  now deploy-unverified (everything since `c4a3c84`). Admin-home checklist: viewport fill
  (also try a short window — rows compress, internal scrollers must engage), 19:26 split,
  Certified number size, merged-table density at `text-base`, forecast with real cert
  dates, billing hover, quick-action tile balance.
- **Admin 1102 blocker (from 07-10) STILL OPEN + untested.** If it recurs:
  `npx wrangler tail bsbr-attytraining --format pretty`, reproduce admin login, read the
  stack — don't guess.

## Still open (carried)
- **07-13 desktop items:** `overview-client.tsx` QuizProgressCard cleared-lesson should
  always say "Cleared" (opposite of Quizzes-tab rule — one-line ternary swap); site-wide
  body-text bump (~1 Tailwind step, ALL five pages — confirmed scope, prompt never written);
  "Up Next" interleaved lesson+quiz sequence (needs the combined state machine designed
  first — don't prompt blind); verify whether Final Assessment no-back/timer actually needs
  building (read `quiz-component.tsx`/`quiz-runner.tsx` first).
- Storyline completion-gate ("Paul" false-positive) decision — Rob/Katy; Exit-button dead
  end; real question pool; Stripe live mode; Resend domain verification.
- Machine note: `git config --global user.email` unset on Max's machine — commits land as
  `maxlugo@Maxs-MacBook-Air.local`.

## Key references
| Item | Value |
|------|-------|
| Main app URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| This session detail | `.planning/sessions/20260714-max-summary.md` |
| Sketch spec | `../certified-status-chart-v1.html` (parent folder, local-only) |
| Row-split dial | `admin-dashboard.tsx` grid `minmax(0,19fr)_minmax(0,26fr)` |
| Certified-size dial | `compliance-score.tsx` `34cqw` |

## Workflow (in force)
Verify via `pnpm run deploy` (Max runs pnpm/supabase/CLI; `pnpm run preview` for local
workerd checks). Git add/commit/push are Claude's, after explicit go-ahead. Secrets in
Worker env only. Authz via `getClaims()`; `firm_id`/`role` from `app_metadata`.
