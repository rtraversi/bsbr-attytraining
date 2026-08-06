# `ix-termsaccept`

**Owner:** Terminal · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **907 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🔴 Blocks the legal pages shipping. There is no acceptance mechanism anywhere; grep returns zero hits. Terms §1 as drafted is therefore currently false. Max's decision: acceptance before checkout for admins, at password-set for staff. ⚠ Store WHEN and WHICH VERSION, not a boolean, so you can say which version each firm agreed to once Katy revises. Do not reorder provisioning.

---

## Full text, captured 2026-08-06

🔴 BLOCKS THE LEGAL PAGES SHIPPING — THERE IS NO ACCEPTANCE MECHANISM ANYWHERE. Verified 2026-08-04: grepping the pricing page, checkout form, onboarding and update-password for any “I agree to the Terms” step returns ZERO hits. Nobody has ever accepted anything, so Terms §1 as drafted is currently FALSE. MAX'S DECISION: acceptance happens BEFORE checkout — admins on the pricing page before the Stripe redirect, staff at password-set. ⚠ The account is created AFTER payment (createUser runs in the webhook), so this is acceptance before PAYMENT, not account creation before payment; do not reorder provisioning. 🔴 STORE WHEN AND WHICH VERSION, not a boolean — when Katy revises these documents you must be able to say which version each firm agreed to. Terms, Privacy and DPA accepted together; DPA incorporated by reference, signable copy on request. Task 10 of ~/.claude/plans/iurix-prelaunch-batch.md
