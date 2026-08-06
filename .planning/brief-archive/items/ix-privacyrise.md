# `ix-privacyrise`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,226 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🔴 Must not ship. The privacy draft says we self-host the Rise course and that Articulate observes nothing. Both false: rise_embed_url is share.articulate.com, serving 200 with no auth. Not published, so it is a drafting blocker rather than a live one. Either self-host properly (private R2 plus a session-gated route) or name Articulate as a sub-processor. Feeds ix-legalv2, tied to ix-risehosting.

---

## Full text, captured 2026-08-06

🔴 MUST NOT SHIP: THE PRIVACY-POLICY DRAFT ASSERTS SOMETHING FALSE ABOUT WHERE THE COURSE IS HOSTED. .planning/legal/privacy-policy.md says the Rise course is ‘a self-contained package that we host ourselves’ and that ‘Articulate does not receive, process, or observe staff member activity.’ BOTH ARE FALSE TODAY: courses.rise_embed_url is share.articulate.com, verified serving HTTP 200 with no authentication. Learners load the course from Articulate’s domain, so Articulate IS a sub-processor observing staff activity, and our own accessibility statement contradicts the privacy policy by describing the course as third-party content. ✅ NOT PUBLISHED: the claim is in the draft only, app/privacy/page.tsx does not carry it. So this is a must-not-ship, not a live problem. RESOLVE ONE OF TWO WAYS BEFORE IT DOES: self-host the export properly (private R2 bucket PLUS a route validating session and hasTrainingAccess before streaming, since static files on R2 are as public as Articulate unless gated), or name Articulate as a sub-processor in the Privacy Policy and the DPA. Directly tied to ix-risehosting (tabled) and ix-legalv2. This finding existed only on the abandoned merge-attempt branch and was nearly lost with it.
