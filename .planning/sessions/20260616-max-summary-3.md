# Session 7 — 2026-06-16 (Max)

## What was done

### Tasks 4–7 fully built and TypeScript-clean

**Task 4 — Onboarding page**
- `app/onboarding/page.tsx` — server component, reads `?session_id=`, redirects to `/` if missing
- `app/onboarding/_components/onboarding-client.tsx` — polls `/api/onboarding/status` every 1.5s (up to 10 attempts) waiting for webhook to provision firm; shows firm name input once ready; submits to `/api/onboarding/complete`
- `app/api/onboarding/status/route.ts` — checks Stripe session + queries `firms` by `stripe_customer_id`
- `app/api/onboarding/complete/route.ts` — updates firm name, marks admin `firm_members.status = active`, generates magic link. Fixed: redirectTo now goes through `/auth/callback?next=/dashboard` (PKCE code exchange) instead of directly to `/dashboard`

**Task 5 — Auth flows**
- `app/auth/callback/route.ts` — PKCE code exchange (`?code=`)
- `app/auth/confirm/route.ts` — token hash exchange (`?token_hash=&type=`) for magic links and password resets
- `app/login/` — email + password form, shows error on bad credentials, detects `?error=invalid-link`
- `app/forgot-password/` — calls `resetPasswordForEmail`, redirects reset link through `/auth/confirm?type=recovery&next=/update-password`
- `app/update-password/` — new + confirm password, `supabase.auth.updateUser()`, redirects to `/dashboard`
- `app/api/auth/logout/route.ts` — POST, signs out server-side, redirects to `/`
- `middleware.ts` updated — protects `/dashboard/*` and `/update-password`; bounces authed users away from `/login` and `/forgot-password`

**Task 6 — Employee invite flow**
- `app/api/invite/route.ts` — verifies admin session, checks seat availability, creates auth user, stamps `app_metadata`, inserts `firm_members`, increments `used_seats`, generates magic link → `/auth/callback?next=/update-password`. Rolls back auth user if `firm_members` insert fails.
- `app/dashboard/layout.tsx` — nav with "Sign out" button (form POSTs to `/api/auth/logout`)
- `app/dashboard/page.tsx` — server component; admin sees seat count + invite form + member table (emails fetched via `getUserById`); employee sees "Go to training" link
- `app/dashboard/_components/invite-form.tsx` — email input, calls `/api/invite`, shows dev link in yellow box, calls `router.refresh()` on success

**Task 7 — Mark pass stub**
- `app/api/training/mark-pass/route.ts` — idempotent; gets or creates stub course + enrollment; inserts `quiz_attempts (passed=true, score=100)`; marks enrollment complete; inserts into `cert_generation_queue (status=pending)`
- `app/dashboard/training/page.tsx` — server component; reads pipeline state: not_started → cert_pending → certified; hands state to client component
- `app/dashboard/training/_components/training-client.tsx` — renders video placeholder + state-appropriate UI; "Mark as complete (stub)" button in not_started state

## Architecture update (from Rob, 2026-06-16)
- **Confirmed:** `aistaffcompliance.com` (Netlify) stays as the main marketing site
- **Confirmed:** Training app lives at `training.aistaffcompliance.com` on Cloudflare Workers
- The Netlify site will link into the CF training app — it does NOT move to CF
- The landing page currently in `app/page.tsx` is inside the training subdomain app — may be simplified to a redirect or kept as a secondary entry point

## Seat accounting decision
- Admin does NOT count against `used_seats` (attorneys buy seats for their staff, not themselves)
- Open question for Rob: should the attorney-admin count as a seat?

## What's still TODO before full end-to-end works
1. `STRIPE_WEBHOOK_SECRET` — already added to `.env.local` (confirmed by Max)
2. **Resend wiring** — magic links + invite links only print to console in dev; need Resend API key + email-send calls in the three TODO spots: `onboarding/complete`, `invite`, and eventually cert delivery
3. **Cert generation Worker** — processes `cert_generation_queue`, generates PDF via `pdf-lib`, uploads to Supabase Storage `certificates/`, inserts into `certificates` table
4. **Real CF Stream video** — update `courses.cloudflare_stream_video_id` from `'stub-not-yet-uploaded'` to the real video ID once uploaded
5. **Stripe Tax** — Rob needs to add BSBR Holdings LLC address to unlock live-mode Stripe objects

## Dev notes
- All 7 tasks TypeScript-clean (`pnpm tsc --noEmit` → zero errors)
- Landing page, login, forgot-password, onboarding redirect, dashboard auth-gate all verified in browser
- Dev magic links appear in browser UI in a yellow box (no Resend needed to test the flow)
