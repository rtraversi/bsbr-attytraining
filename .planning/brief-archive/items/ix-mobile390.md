# `ix-mobile390`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **904 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

⚠ Nobody has ever viewed the live site at 390px, on either machine. No longer a gate (the redesign promoted without it), so this is live-site quality now. The header is the likely failure: enlarged lockup plus four nav links. One DevTools device-toolbar pass, checking every section for horizontal scroll.

---

## Full text, captured 2026-08-06

⚠ PREMISE UPDATED 2026-08-06: this NO LONGER GATES ANYTHING. The redesign was promoted to production on 2026-08-05 without this check ever being done, so it is now a live-site quality item rather than a pre-promotion gate. Still true that nobody has ever viewed the site at 390px, on either machine. ⟨ORIGINAL ENTRY⟩ ⚠ 390px MOBILE HAS NEVER BEEN CHECKED BY ANYONE, and it gates promoting the redesign. Rob's own status note says the browser extension would not actually change the viewport, so it was verified statically only. The risk he names is the header: enlarged lockup plus four nav links on one line. Check for horizontal scroll on every section. One DevTools device-toolbar pass on the CI preview, before production. Every grid is mobile-first and every width is max-w-*, the only min-w being the legal table inside an overflow-x-auto wrapper — so likely fine, which is not the same as checked.
