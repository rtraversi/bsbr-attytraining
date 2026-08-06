# `ix-authperf`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **967 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

⚠ NOT done, despite the app feeling faster. Checked 07-31: getClaims usage repo-wide is still ZERO and getUser() is still called three times per dashboard navigation (middleware, layout, page). Nothing in the auth path has changed, so any perceived speedup is Supabase free-tier variability, not code. The getUserById fan-out was already batched back in Phase 3 and was never the cause.

---

## Full text, captured 2026-08-06

⚠ NOT DONE — Max thought it might have been. LOGGED 2026-07-31 13:30 MST (Max): “right i believe that was ran already. it still is a bit slow but not as slow as it was. lets first run a check on this and then decide if we plan. however we will pin this for planning till monday morning.” CHECK RUN 2026-07-31 13:30 MST, RESULT: the fix has NEVER been applied. getClaims usage repo-wide is still ZERO. getUser() is still called three times per dashboard navigation — middleware.ts:36, dashboard/layout.tsx:11, then the page itself (dashboard/page.tsx:21, and every sibling page has its own). The getUserById fan-out at dashboard/page.tsx:57 has been Promise.all-batched since PHASE 3 (commit f3c611b), so it was never a regression and is not the reason anything feels faster. NOTHING IN THE AUTH PATH HAS CHANGED. Any perceived speed difference is not from code — most likely Supabase free-tier variability or warm caches. 📌 PINNED FOR MONDAY MORNING PLANNING per Max
