# `ix-cookiesecure`

**Owner:** Terminal · **State:** In progress · **Section:** Iurix

> Captured 2026-08-12, when the board moved to a one-sentence-per-row schema. The board now
> carries the action only (`t`), with the problem, the fix and any blocker in `p` / `x` / `n`.
> Everything below is the record: the full text as it stood, verbatim, losing nothing.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-12

✅ FIXED 2026-08-07 in 10de458, PUSHED, NOT DEPLOYED. Closes on the cutover deploy, with the unproven browser-restart check folded into its smoke test. ORIGINAL REPORT FOLLOWS, kept verbatim. The Supabase auth cookie has Secure:false — observed in the browser 2026-08-04. Nothing sets it; lib/supabase/client.ts:13 configures cookieOptions but only maxAge. Narrow but real: any plain-HTTP request to the domain carries the session token in the clear before the redirect fires. ⚠ HttpOnly:false is NOT a bug and must NOT be “fixed” — @supabase/ssr needs the browser client to read that cookie. Separately the cookie expires 400 days out (the browser maximum) while client.ts:14 intends rememberMe ? 30 days : session, likely the middleware refresh overwriting cookieOptions — a hypothesis to trace, not a finding. Tasks 11 and 12. ✅ FIXED 2026-08-07 in 10de458, committed and PUSHED, not deployed. The hypothesis was CORRECT: middleware.ts built its own client with no cookieOptions and overwrote the browser client's intent on every request, so patching client.ts alone would not have held. Now one shared definition used by both, verified on the wire. 🔴 NOT VERIFIED and carried forward: nobody actually closed and reopened a browser in both rememberMe states. The attributes were checked on the wire and the resolution logic is unit-tested, but the real-world restart is unproven. Fold into the cutover smoke test.
