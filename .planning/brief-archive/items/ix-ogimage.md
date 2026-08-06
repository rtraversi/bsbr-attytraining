# `ix-ogimage`

**Owner:** Max · **State:** In progress · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,376 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🟡 Metadata shipped 08-04 (c8ea4c6): og and twitter tags plus a canonical URL on app/layout.tsx. ⚠ The image itself is still missing and it is Max's: export a 1200x630 from Affinity, since no rasteriser exists on this machine. Until then a shared link shows a title and description but no image.

---

## Full text, captured 2026-08-06

🟡 METADATA SHIPPED 2026-08-04 — commit c8ea4c6 adds og:title, og:description, og:type, og:url, twitter:card and a canonical URL to app/layout.tsx, referencing an image at a stable path. ⚠ THE IMAGE ITSELF IS STILL MISSING AND IT IS MAX'S — no SVG rasteriser on this machine, so he exports a 1200x630 from Affinity and dropping it in completes it. Until then a shared link shows a title and description but no image, which is still far better than the bare URL it was. ⚠ TERMINAL FLAG WORTH KEEPING: it nearly added a title.template and caught itself — all 14 pages already end in “— IURIX”, so a template would have produced “X — IURIX — IURIX” everywhere. Fixing that properly means editing /privacy, /terms and /dpa, which are Max's files. WAS: 🔴 MARKETING BLOCKER FOUND 2026-08-03 — THE SITE HAS NO LINK PREVIEW AT ALL. curl of the live homepage returns ZERO og: or twitter: meta tags. Every time Katy or Rob shares iurixaccreditation.com in a text, on LinkedIn or in an email, it renders as a naked URL with no title, no description and no image. On a compliance product sold to attorneys that reads as unfinished. Needs: og:title, og:description, og:image (1200x630), twitter:card, and a canonical URL — all in app/layout.tsx metadata. The image can be rendered from the new mark, so it is not blocked on Rob. Cheapest credibility win available before marketing starts.
