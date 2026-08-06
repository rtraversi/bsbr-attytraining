# `ix-monogram`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **2,098 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

The retired atc monogram still ships on five signed-out surfaces: site header, /login, /onboarding, /forgot-password, /update-password. app/_components/atc-logo.tsx still inlines the old geometry. 🔴 Blocked on Max, not Rob: it is a LOCKUP and no wordmark exists, so swapping the mark alone leaves a hole. Needs a typeface decision. The four legal pages deliberately have no header for the same reason; both fixes land together.

---

## Full text, captured 2026-08-06

🟡 STATUS 2026-08-04 — the clean mark now ships as the FAVICON (app/icon.svg, turquoise #5CC6C3) but the retired atc monogram is STILL on the five signed-out surfaces: site header, /login, /onboarding, /forgot-password, /update-password. app/_components/atc-logo.tsx still inlines the old geometry. 🔴 THE REMAINING BLOCKER IS MAX'S, NOT ROB'S: atc-logo.tsx is a LOCKUP (mark + wordmark) and no wordmark exists, so swapping the mark alone leaves a hole. Needs a typeface decision. ⚠ RELATED CONSTRAINT found while drafting the legal pages: the four legal pages have NO header at all and no way back — terminal deliberately did not add SiteHeader, because SiteHeader renders AtcLogo and that would spread retired branding to four more customer-facing pages. Those two fixes belong together. ORIGINAL: ✅ UNBLOCKED 2026-08-03 — MAX HAND-TRACED A CLEAN MARK. 7 paths, 2.2KB after cleanup (Rob's auto-trace was 28 paths and 3.4MB, ~1500x heavier). Claude baked in the two stacked transforms, removed a 1.1px black stroke that was silently fattening every shape at small sizes, and set fill=currentColor so one file serves turquoise in the nav, white on dark and black on the certificate. Verified NOT clipped — an earlier claim that it overflowed the canvas was measured off Bézier control points and was wrong. STILL NEEDS: a wordmark typeface decision from Max, since atc-logo.tsx is a lockup (mark + wordmark), not a mark alone. THE RETIRED MARK IS STILL SHIPPING, and it is not where the old notes said. app/_components/atc-logo.tsx inlines path geometry BYTE-IDENTICAL to public/atc-athena-logo.svg (verified 2026-07-31: 3 of 3 paths shared verbatim) — the old atc monogram. AtcLogo renders on five signed-out surfaces: site header, /login, /onboarding, /forgot-password, /update-password. This is DELIBERATE (Max, 2026-07-29: the Iurix mark isn’t final, so swapping it now would be churn) so it is a held decision, not a bug — but it is the last user-visible piece of retired branding, and it unblocks the moment Rob’s mark lands. The certificate and favicon are genuinely fixed; the web UI is not
