# `ix-smtp`

**Owner:** Max · **State:** To do · **Section:** Iurix

> Captured 2026-08-12, when the board moved to a one-sentence-per-row schema. The board now
> carries the action only (`t`), with the problem, the fix and any blocker in `p` / `x` / `n`.
> Everything below is the record: the full text as it stood, verbatim, losing nothing.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-12

⚠ RECONSIDER AFTER THE ZOHO CHANGE (2026-08-04) — the apex now has real inbound mail, which was the missing precondition. Custom SMTP may now be simpler than when this row was written, and Zoho itself may be the relay. Do not act before the Resend health question in ix-dnszoho is closed; stacking a second mail change on an unverified one is how 07-29 happened. ORIGINAL: Password-reset emails go through Supabase's default SMTP — unbranded and rate-limited to a few per hour. Custom SMTP fixes branding + limits and unlocks template editing. Pre-launch item
