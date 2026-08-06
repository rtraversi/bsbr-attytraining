# `ix-inactivityredesign`

**Owner:** Terminal · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,116 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

Spec is SETTLED. Employee gets one nudge, admin gets a roughly-weekly digest naming who is outstanding, trigger at 5 days, hard stop once certified, toggle on by default with Settings as its home. ⚠ It is a rewrite, not a tweak: it changes the recipient (employee only today) and the trigger (firms.reminder_days 3/7/14 becomes a fixed 5, leaving reminder_days as dead config). Build the Settings toggle now; ix-onboarding must surface it later.

---

## Full text, captured 2026-08-06

INACTIVITY REDESIGN — spec now SETTLED. Both parties notified: employee gets one nudge, admin gets a digest naming who is outstanding. Trigger 5 days. HARD STOP once certified. Toggle ON by default, admin can turn it off, admin can still nudge manually. CADENCE AGREED LOGGED 2026-07-31 10:10 MST (Max): “okay very good pushback actually. i agree w the weekly scope.” — one nudge PER EMPLOYEE, admin digest capped at roughly weekly, so later stragglers are still caught without spamming. TOGGLE HOME CLARIFIED, same message: “i dont want it on onboarding, i want us to remember to add that to onboarding so at the introduction to the interface they are faced with the toggle. settings is the real home.” → build the Settings toggle NOW, independent of ix-onboarding; when onboarding is built it must SURFACE this toggle during the intro tour. Cross-reference from ix-onboarding so it is not forgotten. ⚠ STILL A REWRITE, NOT A TWEAK: changes the recipient (currently EMPLOYEE only) and the trigger (currently firms.reminder_days 3/7/14 → fixed 5 days, leaving reminder_days as dead config Max agreed needs resolving)
