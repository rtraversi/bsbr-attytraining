# `ix-invitetest`

**Owner:** Max · **State:** To do · **Section:** Iurix

> Captured 2026-08-12, when the board moved to a one-sentence-per-row schema. The board now
> carries the action only (`t`), with the problem, the fix and any blocker in `p` / `x` / `n`.
> Everything below is the record: the full text as it stood, verbatim, losing nothing.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-12

Live negative test for the invite-failure work — the feature shipped without ever being seen to fail. Break RESEND_API_KEY, send an invite, then confirm: the UI says the member was added but the email couldn't be sent, the “Invite not delivered” badge SURVIVES A RELOAD (it is a real column, not toast state), and a successful resend clears it
