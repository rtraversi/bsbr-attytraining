# `ix-cancelemail`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,039 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

📌 Two things. (1) emails/auto-renew-cancelled.tsx has never been rendered by a human. The content carries all three required facts; how it LOOKS is unverified. (2) Verify the sandbox is clean: terminal claims all ten sandbox subscriptions were restored to cancel_at_period_end=False after its round-trip test, and that claim has never been independently checked. Feeds ix-stripeaudit.

---

## Full text, captured 2026-08-06

📌 MONDAY — two things, LOGGED 2026-07-31 13:51 MST (Max) verbatim: “cancellation email must be looked at. pending on monday. and verify what terminal did on stripe sandbox is alright.” (1) THE EMAIL HAS NEVER BEEN RENDERED. emails/auto-renew-cancelled.tsx typechecks and follows the existing EmailShell, but no human has seen it. Claude confirmed the CONTENT carries all three required facts — the end date, that earned certificates are permanent, and that staff cannot re-certify after — plus a line that it can be resumed before that date. What is unverified is how it LOOKS. (2) VERIFY THE SANDBOX IS CLEAN. Terminal exercised the cancel/resume round trip against a REAL sandbox subscription (sub_1TyvxQ… on acct_1ThDpr6ZCSojEKRr) to prove cancel_at_period_end=true leaves status=active with the period end unmoved. It reports all ten sandbox subscriptions restored to cancel_at_period_end=False. That restoration is terminal's own claim and has NOT been independently checked — confirm it directly against Stripe. Feeds ix-stripeaudit
