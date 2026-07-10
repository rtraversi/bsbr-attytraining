# Session Handoff

**Date:** 2026-07-10 (Friday) — Max (desktop chat + terminal, parallel, earlier) **then** Rob
(terminal, evening) with Claude. Max's parallel session did investigation/design/verification and
the quick-wins build; **Rob's evening session committed + deployed that work and hit a new blocker.**
Detail: `.planning/sessions/20260710-rob-summary.md` and `20260710-max-summary.md`.
Real-user findings: `.planning/INTERFACE-CORRECTIONS.md`.

---

## 🔴 READ FIRST — NEW BLOCKER: admin dashboard 1102 on login

Logging in **as admin** → Cloudflare **Error 1102 "Worker exceeded resource limits"**
(Ray a19242c6…, 20:19 UTC) on `bsbr-attytraining.aistaffcompliance.workers.dev`. **Ruled out:**
worker is up (public routes 200/307, fast); the **employee** dashboard renders fine on the same
worker; **member volume** (max 12 active/firm → the O(N) `admin.auth.admin.getUserById` fan-out in
`app/dashboard/page.tsx` is trivial); **the SCORM changes** (employee-training only). Cause is
specific to the **admin dashboard render** — code untouched this session — and is genuinely unknown.
The tested build was deployed from a **messy working tree** (uncommitted Kapakana edits to root
`app/layout.tsx`, which wraps every page).

**Fix sequence tomorrow:** (1) hard-refresh retry — may be a transient cold-start spike;
(2) `pnpm run deploy` from clean committed `main` — removes the messy-tree variable;
(3) if still broken, `npx wrangler tail bsbr-attytraining --format pretty`, reproduce admin login,
read the stack trace. **Don't keep guessing without the log.** Blocks all admin usage.

---

## Committed + deployed this session (Rob's evening pass)

- **Nav pill discoverability (item #5) — `eaf1acc`, PUSHED + DEPLOYED, verified good.** Tabs always
  visible (Katy's exact ask), no hover needed; firm name hides below `sm`, tab row scrolls
  internally. Rob confirmed live.
- **SCORM "quick wins" — `963f341`, PUSHED, migration applied, DEPLOYED.** The in-progress batch
  Max prompted (below) **landed and was verified** (`tsc`/`eslint` clean): migration `0011`
  (`lesson_location_changed` event, `enrollments.total_training_seconds` + `increment_training_seconds`
  RPC) **applied to the linked DB via `supabase db push`**; `types/supabase.ts` **regenerated**;
  per-lesson tracking, session-time counter, lesson-level `loadFromJSON` resume, and the honest
  lesson-based `progressPct` all live. Diagnostic harness replaced with real code (not reverted).
- **"Progress bar shows 50%" — RESOLVED, not a bug.** DB check: exactly one stale `video_completed`
  (16:01, pre-deploy) on the test account flips the content half fully to 50 — the item-#2 "Paul"
  artifact persisting. Partial per-lesson credit only applies when NO completion event exists. New
  tracking confirmed live (a `lesson_location_changed` row landed at 20:02 post-deploy).

## Also done + verified earlier (Max's parallel session)

1. **Kapakana font wired** — `public/fonts/Kapakana-VariableFont_wght.ttf`, registered in
   `app/layout.tsx` (`--font-kapakana`, weight `300 400`) + `.font-kapakana` in `app/globals.css`.
   Available, unused (no design target yet). **STILL UNCOMMITTED — Rob's to finish.**
2. **Quizzes tab width** — `max-w-6xl` → `max-w-[1600px]` in `quizzes-client.tsx`. **UNCOMMITTED.**
3. **Exit-course dead end (item #3) — RESOLVED, no code.** `runtime-data.js` `lmsOptions.enableExitCourse:
   true` is a Rise export checkbox. **Max will uncheck it and re-export** → button gone from the
   package. (Independently reconfirmed this session: iframe is same-origin and scorm-again's
   `LMSFinish` is hookable, so an in-app intercept is the fallback if re-export slips.)
4. **Progress-bar width math** — measured at exactly 50.0% fill for `progressPct=50`; no width bug.
   Superseded by the honest lesson-based %; kept a defensive `rounded-l-full` on the fill.
5. **SCORM/Rise investigation** — confirmed via a diagnostic harness + Max's real lesson 1→2→3 walk:
   `lesson_location` fires at boundaries with real UUIDs; `suspend_data` updates every 1–2s;
   `session_time` ticks ~20s; `loadFromJSON({core:{lesson_location}})` seeds resume; the export blocks
   skipping >1 lesson (so the signal is trustworthy). This is what the quick-wins batch is built on.

## Repo state
- `main`: `eaf1acc` + `963f341` + this handoff commit — **all pushed at wrap-up.**
- **Uncommitted, DO NOT LOSE (Rob's in-progress, for tomorrow):** Kapakana font
  (`app/layout.tsx`, `app/globals.css`, `public/fonts/Kapakana-VariableFont_wght.ttf`),
  `app/dashboard/quizzes/_components/quizzes-client.tsx`, `.planning/INTERFACE-CORRECTIONS.md`.

---

## Designed but NOT built — admin training access (item #1, the real fix)

Earlier framing ("data model can't support admin+employee") is **false, disproven this session.**
`app/api/onboarding/complete/route.ts` has an `enroll_self` flow; `app/api/quiz/attempt/route.ts`
lazily creates an enrollment on first pass. No data-model gap. Real blockers, all confirmed in code:

1. **Two blunt redirects:** `app/dashboard/overview/page.tsx` + `app/dashboard/quizzes/page.tsx` both
   `if (role !== 'employee') redirect('/dashboard')`. Let `'admin'` through too.
2. **Shell selection is role-based, not route-based.** `app/dashboard/layout.tsx` picks the whole
   shell off `isEmployee = role === 'employee'` — admins get the admin shell with **no bottom
   Overview/Training/Quizzes tab bar**. Fix: extract shell branching into a client component (same
   `usePathname()` pattern as `NavPill`/`EmployeeTabBar`) that shows the **training shell** for
   `/dashboard/overview|training|quizzes` **regardless of role**; only bare `/dashboard` stays
   admin-shell. Leave Settings/Support shells unchanged.
3. **Nav pill admin "Training" link skips Overview.** `nav-pill.tsx` `trainingHref`. Once Overview is
   unblocked for admins, point it to `/dashboard/overview` for everyone.

`EmployeeTabBar` needs no changes (already role-agnostic). **Max confirmed this plan matches intent.**
Turn it into a terminal prompt first thing next session — file paths + exact code already identified,
no re-investigation needed. (This is `task_59201337`, now fully designed.)

## Diagnosed — false-positive completion (item #2)

Completion is gated (declaratively, in `scormdriver/indexAPI.html` `__DRIVER_CONFIG__`) on a **single
embedded Storyline block**: `quizId:null, storylineId:"cmr0u5l7w007a2e78rd3axbg5"`. Clicking "Paul"
fires that block's own complete/passed trigger early, and because it IS the whole course's gate, one
click certifies everything (a real `video_completed` row from this exists — see the 50% resolution).
Max couldn't reproduce live; remaining work is **static analysis** — find "Paul" in `runtime-data.js`
and confirm its interaction sits inside/triggers that storylineId block. Fix (Rob/Katy decision):
fix the block's Storyline triggers, or re-export Rise tracking onto the real quiz.

---

## Still open (carried, unchanged)
- Homepage direction (3-way, Rob's call).
- Final-assessment timer (slot only); cert signing blocked on the real question pool.
- Kapakana font has no design target yet (wired, unused).
- Double-billing fix — verify on deploy.
- Supabase Pro upgrade → Step 3 monitoring runbook (Rob); BetterStack `/api/health` (Rob).
- Overview design pass: current-lesson + time-spent stat (data now available: `currentLessonNumber`
  + `enrollments.total_training_seconds`). Also deferred: full `suspend_data` slide-level resume,
  per-lesson quiz-pause overlay.
- Rise-authoring items #6 (mark clickable elements), #7 (native back/forward), #8 (confidentiality
  scenario rework) — Max/Katy's tasks in Rise, not code.
- Optional: delete the one stale `video_completed` row on the test account for a clean progress read.

## Next session — suggested order
1. **Fix the admin 1102** (retry → clean redeploy from `main` → `wrangler tail`). Blocks admin usage.
2. Write the terminal prompt for **admin-training-access** (item #1 — plan fully specified above).
3. **False-positive completion** (item #2) — static analysis of `runtime-data.js` (no repro needed).
4. Finish **Kapakana** + **quizzes-client** (uncommitted); commit them.
5. Everything in "still open," opportunistically.

## Key references
| Item | Value |
|------|-------|
| Main app URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| This session detail | `.planning/sessions/20260710-rob-summary.md` |
| SCORM completion gate | `__DRIVER_CONFIG__` in `public/training-content/scorm-v1/scormdriver/indexAPI.html` |
| Real user findings | `.planning/INTERFACE-CORRECTIONS.md` |

## Workflow (in force)
- Verify via `pnpm run deploy` (Rob/Max run pnpm/supabase/CLI). Git add/commit/push are Claude's,
  after go-ahead. Secrets in Worker env only. Authz via `getClaims()`; `firm_id`/`role` from
  `app_metadata`.
