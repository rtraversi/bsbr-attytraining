# `ix-cookiespage`

**Owner:** Max · **State:** In progress · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,533 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

✅ Copy drafted 08-04, 7/7 sections, no placeholders. Unblocked by Max checking the browser storage panel: exactly one cookie, ours, and nothing from Articulate. So ‘strictly necessary only, no consent banner’ holds and becomes a marketing point. 🔴 Still not written into the page file, and the route is still 404-guarded in production. Two links queue behind it: the sign-in footer and the landing footer.

---

## Full text, captured 2026-08-06

✅ COPY DRAFTED 2026-08-04, 7/7 sections, no placeholders. UNBLOCKED by Max checking the browser storage panel on the training page: exactly ONE cookie, the Supabase auth token on our own domain, and NOTHING from articulate.com. Cache Storage, IndexedDB, Local and Session Storage all empty. So “strictly necessary only, no consent banner” holds and becomes a marketing point. ⚠ Worded to stay true regardless — the check was in Firefox, which partitions third-party cookies by default, so the Articulate frame is described as governed by their practices rather than asserted to set nothing. §6 carries a real commitment: if analytics is ever added, the page changes and consent is asked FIRST. That sentence protects the claim from being quietly undone later. Two security findings fell out of the same screenshot — see ix-cookiesecure. STILL NOT WRITTEN INTO THE PAGE FILE. WAS: ROUTE BUILT (8e1e6cc), COPY IS THE BLOCKER AND IT IS MAX'S. LOGGED 2026-07-31 11:25 MST (Max): “cookies should be in the landing page btw. lets add it on the footer. cookies page must be built.” app/cookies/page.tsx exists with 7 headings, zero legal language, loud do-not-deploy markers. TWO LINKS NOW QUEUED behind the copy, not one: the sign-in footer (restore note already in app/login/page.tsx) AND the landing-page footer (app/_components/footer.tsx). Both are one-liners once copy is approved. NOTHING ELSE MOVES UNTIL MAX DRAFTS IT — then Katy or Rob approves. This is now the single highest-leverage thing on Max's own plate for the legal group
