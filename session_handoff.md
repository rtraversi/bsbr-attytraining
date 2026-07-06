# Session Handoff

**Date:** 2026-07-06
**Who:** Max

---

## What was done — Auth-adjacent pages redesigned to the Athena design system

Rebuilt the four auth-adjacent pages to the new **Athena** design system (the same language
as the `/login` sign-in page: Stack Sans Headline, `#32C7FF` primary button, `#0094FF` links,
static drone-poster background + dark overlay, the `athena.` logo lockup). Removed the old
"Built Smart by Rob" eyebrow + Gyrotrope font from all of them.

1. **`/login`** — hard 65/35 split: left = full-page drone footage (`sign-in-bg.mp4`, plays once
   & freezes, poster fallback on mobile/reduced-motion) with the centered `athena.` wordmark;
   right = white form panel. Password eye-toggle, remember-me **pill checkbox** with liquid-blue
   fill (only the pill is clickable), 30-day-vs-session cookie persistence. Translucent
   `#00B9FF/50` footer bar confined to the right column (over the footage, so `#FFE5E5` reads).
2. **`/update-password`** — centered card: dark rounded-top band (logo) + white body. Read-only
   account email, dual independent eye toggles, and a **strength-reactive bot** (huh→hey at 8+
   chars; "Strong enough." turns `#0094FF`). Button "Set & continue".
3. **`/forgot-password`** — same centered-card shell. Editable email, "Send reset link" button,
   `#0094FF` "Back to sign in" link, re-skinned done-state (check badge + confirmation).
4. **`/onboarding`** — same shell; all five state-machine phases (polling / timeout / form /
   error / done) re-skinned. **No underlying fetch/poll/submit logic changed.**

Supporting: `AtcLogo` is now font-size-driven so it scales fluidly with the viewport (homepage
nav unchanged). `lib/supabase/client.ts` `createClient(rememberMe?)` sets cookie `maxAge`.
New assets added to `public/`: `sign-in-bg.mp4` (1080p, 12.6 MiB — under the CF 25 MiB asset
cap), `sign-in-bg-poster.jpg`, bot + password-eye SVGs.

## Bug fixes this session

1. **Test-user deletion blocked by a DB constraint** — fixed (DB-side; no code artifact in the
   repo working tree).
2. **Admin password-setup redirect** — `app/api/onboarding/complete/route.ts` sent admins straight
   to `/dashboard`, so they never set a password and couldn't use the email+password login. Both
   magic-link targets (`redirectTo` + `actionLink` fallback) now point to `/update-password`,
   matching the employee invite flow exactly.
3. **Forgot-password link routing** — reset email now routes through
   `/auth/callback?next=/update-password` (the correct endpoint).

## Status

**Deployed & working** (verified via `pnpm run deploy`). tsc + eslint clean across all changes.

---

## Next steps

1. **Training page rebuild** (the big one):
   - Lesson progress checklist
   - Duolingo / Kahoot-style quiz redesign
   - Celebration state on passing
   - Real `video_started` event logging
   - Test real **Rise 360** content via an Articulate-hosted iframe link
2. **Shared profile/account icon** in the dashboard nav.
3. **Double-billing fix** — on a duplicate-email checkout, auto-refund + notify. Refunds handled
   **manually by Rob** (not automated).
4. **Admin dashboard redesign** — saved for last.

## Open questions (need Max's answer before building)

- **Homepage direction still undecided** — the Athena build vs. Rob's two `/mockup` concepts
  ("Warm Counsel" and "Statute & Signal").
- **Certificate page** — does "sign your name and signature" mean literal e-signature capture,
  or just displaying the name? And should it become its own route vs. staying part of the
  training page's certified state?

---

## Key references

| Item | Value |
|------|-------|
| Main app URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| Design system source | `/login` (Athena) — Stack Sans, `#32C7FF`/`#0094FF`/`#00B9FF`/`#FFE5E5` |
| Session detail | `.planning/sessions/20260706-max-summary.md` |
| GitHub repo | `rtraversi/bsbr-attytraining` |
