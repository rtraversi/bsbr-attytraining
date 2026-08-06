# `ix-testfirmfuse`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,175 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

⏳ Not a problem today, dated to become one. Staging's 17 test firms are invisible to the daily reconciliation job because it filters on livemode. The first real subscription older than 15 minutes flips that, and all 17 report as ‘access without payment’ on the day of the first real sale. Only bites if the clean-PROD decision is reopened.

---

## Full text, captured 2026-08-06

⏳ A FUSE WITH A DATE ON IT, NOT A PROBLEM TODAY. STAGING holds 17 firms (all status=active, all carrying a stripe_subscription_id), 55 members, 58 auth users, 12 certificates, 13 quiz attempts, newest 2026-07-30. They are sandbox records: the price they were bought with is livemode:false. ⚠ CONFIRM THAT RATHER THAN ASSUME IT. WHY IT IS QUIET RIGHT NOW: the daily reconciliation job filters s.livemode === true, so subs.length === 0, canCompareFirmsToStripe is false, and the firm-to-Stripe comparison is skipped entirely. THE MOMENT STRIPE GOES LIVE and the first real subscription is more than 15 minutes old, that flips true and ALL 17 FIRMS REPORT AS ‘access without payment’: an operator alert claiming 17 discrepancies on the day of the first real sale. cert-worker’s own comment says that report must ‘be believed on the day it finally says something’, and stale test data on a production database would destroy exactly that. This is the strongest single argument for the clean-PROD path Rob chose, and the reason promoting staging in place would have required purging it first. Nothing to do while PROD is the target; it becomes real if anyone reopens that decision.
