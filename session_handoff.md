# Session Handoff

**Date:** 2026-07-07 (Tuesday)
**Who:** Max (continued across the day)

---

## ⚠️ Read this first

1. **Everything is committed and pushed** — working tree is clean, `main` is in sync with
   `origin/main`. The Overview/Quizzes/theme build (previously flagged uncommitted) is now
   committed (`141afed`), and the Rise 360 Training wiring is committed (`e54eeea`). Migrations
   `0009` + `0010` are applied to the linked DB and `types/supabase.ts` is regenerated.
   **Not yet deployed to production** — `pnpm run deploy` is Max's next step to ship it.
2. **Workflow pivot, must carry forward:** after the Quizzes tab build kept producing generic
   "AI-pattern" centered-card layouts despite detailed text specs, the decision is: **Max designs
   app UI/screens in Figma** (free tier) and hands Claude locked, concrete designs (exported
   specs/screenshots, same as the sign-in SVG handoff) to implement precisely — rather than
   iterating on layout/feel via text. Affinity stays for illustration-heavy work (logos, patterns,
   certificate art), not screens. **Do not go back to text-described layout iteration for new UI —
   wait for a Figma handoff.**

---

## What's DONE and committed

| Area | Commit | Notes |
|------|--------|-------|
| Auth-adjacent pages redesign (login/forgot/update-password/onboarding) | `a02c9b0` | Yesterday |
| All 4 email templates → shared Athena shell, light/dark, real logo, no "Built Smart by Rob" | `02f337f` | Verified light/dark via headless Chrome |
| Profile/account dropdown in dashboard nav | `bb9d382` | Later moved LEFT + theme toggle (see below) |
| Employee restructure → Overview / Training / Quizzes + bottom tab bar; gating engine; theme system | `141afed` | Gating verified by 53-case test harness; migration `0009` |
| Rise 360 → "Launch Training" card (new tab, not iframe) | `e54eeea` | Migration `0010`; `riseUrl` prop only, never hardcoded |

**Theme system:** light-by-default with a **manual** dark toggle (not prefers-color-scheme) —
`.dark` class on `<html>`, persisted, no-FOUC script. Layout **branches by role**: admins keep the
unchanged dark shell (zero regression); employees get the light+dark themed shell (profile menu on
the LEFT, theme toggle + legal links in the dropdown, persistent footer removed from
Overview/Training/Quizzes). Homepage/marketing footer is untouched.

**Rise 360:** Quick Share link `https://share.articulate.com/g5IsRaevWCyhu8oIoRM-m` now lives in
`courses.rise_embed_url` (migration 0010, backfilled) and drives the Launch Training card. Opens in
a new tab because Quick Share sends `frame-ancestors 'self'` + `X-Frame-Options: sameorigin`.

---

## Known issues / risks (NOT fixed)

1. **Overview page low-contrast on light theme** — Overview still uses old dark-styled content
   (`text-white`, `bg-zinc-900`) which reads poorly on the new light employee shell. Intentionally
   left for its own (Figma) redesign; its buttons/logic still work.
2. **Double-billing webhook gap (real launch risk)** — `app/api/webhooks/stripe/route.ts`
   `handleCheckoutCompleted` silently drops provisioning if a checkout's email already has an active
   firm → someone could be charged twice with no recourse. Agreed fix: block re-checkout pre-payment
   if a logged-in buyer already owns an active firm; for anonymous-checkout collisions,
   auto-cancel+refund the duplicate and notify — but **Rob approves/handles refunds manually, never
   automated.** Designed, not built.

---

## The knowledge-check / star / gating system — full spec (built + verified)

Real lesson structure (decoded from the actual Rise export):
1. Introduction to AI in Legal Practice
2. Protecting Client Confidentiality with AI Tools
3. Ensuring Accuracy: Verification and Supervision of AI Outputs
4. Compliant AI Workflows: Automations vs. Chatbox Use
5. Applying Ethical Rules and Firm Policy to Everyday AI Use

Rise has its own native ungraded mid-lesson checks (2/1/3/3/2) — separate from ours; ours is what
gates progress and produces trackable data (Rise reports nothing to the app, by design).

- Lessons 1–4: check just needs **completion** to earn credit/unlock the next — no score threshold;
  low score shows a soft "consider reviewing" flag (non-blocking).
- Lesson 5 is the readiness gate: needs a passing score (80%). Passing clears the final assessment.
- **Shortcut:** jump straight to Lesson 5 without 1–4 (honor system). Pass → instant full credit,
  all 3 stars. Fail 3× without clearing 1–4 → shortcut locks, must do 1–4 sequentially (which then
  grants Lesson 5 a fresh 3 attempts).
- Attempts: 3 per check while not fully cleared; once fully cleared (either path), unlimited retakes
  forever (review).
- Stars: 1 = first check cleared; **2 = lessons 1–4 all cleared; 3 = lesson 5 cleared** (interpreted
  this way because "all of them" = all 5 collapses star 2 into star 3 — flagged for Max to confirm;
  one-line change in `deriveProgress` if he meant otherwise).
- 15 placeholder questions (3/lesson), clean per-lesson drop-in for Rob/Katy's real pool.

---

## Quizzes tab — design spec (current build pending Figma redesign)

Block-based, Duolingo/app-like: **Checkpoint** (collapsed summary, hover-expands to 5-lesson list;
done=check, current=clickable, locked=plain lock, Lesson 5=distinct **unlock** icon), **"Your Path"**
(Mario-style node progression toward the certificate flag), **"Ready for the final assessment?"**
(locked until all 5 cleared), **Certificate** (grayed/locked by default; gradient-border + glow when
unlocked). Content/logic is right; the **visual layout is the thing awaiting a Figma redesign** —
don't rebuild it via more text prompts.

**Final assessment** (separate future build, blocked on the real question pool): timed (~20 min
suggested, unconfirmed), no going back, unlimited retries with a fresh randomized set each attempt —
adapts existing `quiz-component.tsx` + `/api/quiz/attempt`, not a new system.

**Certificate/signing** (separate future build): NOT handwritten capture — learner types their name,
renders live in the **Kapakana** font (file delivered to `landing page design resources/Kapakana/`,
not yet wired into `public/fonts/`) as a calligraphy signature, confirm/re-sign, then
Download/Email/Print/View unlock. Confetti celebration on passing, before the signature step.

---

## Open items carried forward

- **Deploy** the current `main` (`pnpm run deploy`) to ship Rise wiring + Quizzes/theme to prod.
- **Homepage direction** — open 3-way decision (Athena dark rebrand vs. Rob's `/mockup` "Statute &
  Signal" and "Warm Counsel"). Untouched.
- **Double-billing webhook fix** — designed, not built (see Known issues #2).
- **Overview page visual redesign** — deferred to a Figma pass (logic is fine).
- **Admin dashboard redesign** — saved for last; still on the old dark shell.
- **Final assessment + certificate signing build** — spec'd, blocked on the real question pool +
  the Figma-driven Quizzes visual.
- **Kapakana font** — delivered, not yet added to `public/fonts/` or wired in.
- **Legal pages** (`/privacy`, `/terms`, `/dpa`) — placeholder content, low priority.
- **Certificate PDF / firm attestation PDF** — reportedly mostly done; not re-checked recently.
- **Star milestone interpretation** — confirm star 2 = "lessons 1–4 cleared" is what Max intended.

---

## Workflow / tooling notes

- **Figma for app UI/screens; Affinity for illustration/logo/pattern/cert-art.** Claude should
  suggest which fits a task. Delegation is case-by-case, not a fixed split.
- **New/undecided UI:** prototype fast in raw HTML/CSS + screenshot to lock the spec before writing
  component code. **Known fixes/patterns:** straight to code.
- **Claude should self-verify builds** against spec (browser automation / headless renders) before
  Max has to catch drift.
- **Testing:** Gmail plus-addressing (`solarsaiko+employee1@gmail.com` … `+employee10@`) — one inbox,
  the app treats each as a separate account. `+` passes the app's invite regex.
- **Git push:** `gh` is installed + authed (keychain); token expires ~30 days. A shell abbreviation
  rewrites `gh` → `ghostty`, so use `command gh …` when invoking gh directly. Commits land as
  `Max Lugo <maxlugo@Maxs-MacBook-Air.local>` (git auto-config) — set `user.email` when convenient.

---

## Key References

| Item | Value |
|------|-------|
| Main app URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| Rise 360 Quick Share link | `https://share.articulate.com/g5IsRaevWCyhu8oIoRM-m` |
| This session's detail | `.planning/sessions/20260707-max-summary.md` + `-2.md` |
| GitHub repo | `rtraversi/bsbr-attytraining` |
