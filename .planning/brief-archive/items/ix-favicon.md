# `ix-favicon`

**Owner:** Max · **State:** In progress · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **839 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🟡 Half done 08-04. app/icon.svg is the clean 7-path mark in #5CC6C3 and modern browsers prefer it. ⚠ app/icon.png (512px) still holds the older, more detailed artwork as the fallback, so the two disagree. Max exports a 512px PNG of the same mark from Affinity, since no SVG rasteriser exists on this machine. Eyeball it at real tab size before closing.

---

## Full text, captured 2026-08-06

🟡 HALF DONE 2026-08-04 — app/icon.svg created from Max's cleaned trace, filled with the locked turquoise #5CC6C3, 2,250 bytes. Next.js serves it natively and modern browsers prefer it, so the detail problem is largely solved by the simpler 7-path artwork. ⚠ STILL PENDING, AND IT IS MAX'S: app/icon.png (512x512) still holds the OLDER, more detailed artwork as the fallback for browsers that do not take SVG favicons, so the two disagree. No SVG rasteriser exists on this machine (rsvg-convert, Inkscape, ImageMagick, cairosvg and sharp all absent, checked) — Max exports a 512px PNG of the same mark in #5CC6C3 from Affinity and both paths match. Also worth eyeballing at real tab size before calling it closed. WAS: Favicon is committed and live but the mark is too detailed to read at small size — still wants a simplified manual trace
