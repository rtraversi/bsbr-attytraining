# `ix-maybesingle`

**Owner:** Terminal · **State:** In progress · **Section:** Iurix

> Captured 2026-08-12, when the board moved to a one-sentence-per-row schema. The board now
> carries the action only (`t`), with the problem, the fix and any blocker in `p` / `x` / `n`.
> Everything below is the record: the full text as it stood, verbatim, losing nothing.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-12

✅ BUILT 2026-08-07 in 10de458, PUSHED, NOT DEPLOYED. The yes/no below was overtaken by events: it got built. Closes on the cutover deploy. ORIGINAL FOLLOWS, kept verbatim. ⚠ ON TODAY'S LIST BUT STILL NEEDS MAX'S YES OR NO — it is the one focus item that is a decision, not a build. OPEN AND UNANSWERED — Claude recommended fixing it, Max has not said yes or no. app/api/firm/enroll-self/route.ts:85 and app/api/onboarding/complete/route.ts:105 test enrollment existence with .maybeSingle(), which ERRORS on multiple matches rather than returning one. Post-renewal that error surfaces as existing = null, so the guard concludes “no enrollment” and inserts another. It MANUFACTURES the duplicates that caused the dashboard bug fixed in 95c040e, so every occurrence degrades that fix. Terminal correctly kept it out of a commit about ordering, and it is deliberately NOT on merge-attempt so Max's review diff stays clean. ✅ FIXED 2026-08-07 in 10de458, committed and PUSHED, not deployed. Max said yes. Terminal found the query lived in THREE places, one of which was already correct, and extracted the whole thing to lib/enrollments.ts rather than patching two of three and leaving the divergence that caused this. 🔴 Stays open until deployed.
