---
phase: quick-260612-kqe
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/NEXT-10-STEPS.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "NEXT-10-STEPS.md shows the Stripe CLI item as checked/done with install + auth details"
    - "Step 2's status line reads Done (all items complete)"
    - "The bottom 'Statuses refreshed' note no longer says Stripe CLI is Not started"
  artifacts:
    - path: ".planning/NEXT-10-STEPS.md"
      provides: "Updated onboarding checklist reflecting Stripe CLI completion"
      contains: "Stripe CLI"
  key_links: []
---

<objective>
Mark the Stripe CLI item in `.planning/NEXT-10-STEPS.md` as done, flip Step 2's
status to Done, and update the bottom "Statuses refreshed" note for consistency.

Purpose: Keep Max's onboarding checklist accurate now that Rob has installed and
authenticated the Stripe CLI on his machine (2026-06-12).
Output: Updated `.planning/NEXT-10-STEPS.md`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/NEXT-10-STEPS.md

<facts>
Verified facts driving this edit (from task context, 2026-06-12):
- Stripe CLI v1.42.11 installed via winget (`Stripe.StripeCli`) on Rob's machine (Lenovo-Travel).
- `stripe login` completed; CLI authenticated to the "Built Smart by Rob" Stripe account (acct_1TYqL3CzT2268ei9).
- Test-mode and live-mode keys valid until 2026-09-10 (90-day CLI session).
- The Stripe CLI item is the only unchecked bullet in Step 2; checking it makes all Step 2 items complete.
- The Node v22 pin note (Max) is a recommendation on an already-checked item, not an open blocker — Step 2 can flip to Done.
</facts>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Mark Stripe CLI done and refresh Step 2 + bottom status note</name>
  <files>.planning/NEXT-10-STEPS.md</files>
  <action>
Make three edits in `.planning/NEXT-10-STEPS.md`:

1. Step 2 Stripe CLI bullet (currently line ~33, the `- [ ] Stripe CLI — **Owner: Rob, Not started**` line and its three install/verify/auth sub-bullets):
   - Change the checkbox from `[ ]` to `[x]`.
   - Update the label to reflect completion, e.g. `- [x] Stripe CLI — **Done (Rob, 2026-06-12)** — v1.42.11 via winget; \`stripe login\` authenticated to the "Built Smart by Rob" account (acct_1TYqL3CzT2268ei9); CLI session keys valid until 2026-09-10`.
   - Keep the three sub-bullets (Install / Verify / Auth) but mark them as completed steps rather than to-dos (they are reference for what was done). Do not delete the `stripe listen` guidance — it is not present in Step 2, leave Step 10's Stripe CLI smoke item untouched.

2. Step 2 status line (line ~22, `**Owner:** Max (Stripe CLI: Rob) | **Status:** In Progress`):
   - Change `In Progress` to `Done`. All Step 2 items are now checked; the Node v22 pin is a recommendation on an already-installed tool, not an open item.
   - Update the Step 2 heading on line ~20 from `### Step 2: Local dev tools — In Progress` to `### Step 2: Local dev tools — Done`.

3. Bottom "Statuses refreshed from spreadsheet (2026-06-12)" list (line ~212-215): change the line `   - Stripe CLI remains **Not started** (Rob)` to `   - Stripe CLI → **Done** (Rob, 2026-06-12)`.

Do NOT touch Steps 3-10, the Parallelism Note, or the adapter-swap section. Only the Stripe CLI status, Step 2 heading/status, and the bottom status note change.
  </action>
  <verify>
    <automated>cd /c/Sites/attytraining && grep -q '\- \[x\] Stripe CLI' .planning/NEXT-10-STEPS.md && grep -q 'Step 2: Local dev tools — Done' .planning/NEXT-10-STEPS.md && ! grep -q 'Stripe CLI remains \*\*Not started\*\*' .planning/NEXT-10-STEPS.md && echo PASS</automated>
  </verify>
  <done>Stripe CLI bullet is checked with install/auth details; Step 2 heading and status both read Done; bottom status note shows Stripe CLI as Done. No other steps altered.</done>
</task>

</tasks>

<verification>
- `grep '\[x\] Stripe CLI' .planning/NEXT-10-STEPS.md` returns the completed bullet.
- `grep 'Step 2: Local dev tools — Done' .planning/NEXT-10-STEPS.md` matches the heading.
- `grep 'Stripe CLI remains' .planning/NEXT-10-STEPS.md` returns nothing (old "Not started" note gone).
- No diff lines outside Step 2 and the bottom status list.
</verification>

<success_criteria>
- The Stripe CLI item shows as done with accurate install/auth detail (v1.42.11, winget, `stripe login`, account, session expiry).
- Step 2 reads Done in both the heading and status line.
- The bottom "Statuses refreshed" note lists Stripe CLI as Done (Rob).
- No unrelated content changed.
</success_criteria>

<output>
Create `.planning/quick/260612-kqe-mark-stripe-cli-install-login-done-in-ne/260612-kqe-SUMMARY.md` when done.
</output>
