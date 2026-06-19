# Session Handoff

**Date:** 2026-06-18
**Who:** Max (dev, 3 sessions) + Rob (PM, planning/decisions)

---

## What Was Done Today

### Max (3 coding sessions)

**Session 1 — Phase 1 deploy to CF Workers**
- Fixed critical CF Workers bug: Stripe SDK was using Node's `https` polyfill which hangs silently; added `httpClient: Stripe.createFetchHttpClient()` to all 4 Stripe routes
- Set all Worker secrets via `wrangler secret put` (8 secrets confirmed)
- Deployed live: `https://bsbr-attytraining.aistaffcompliance.workers.dev`
- Built Task 10: cert download URL endpoint, cron drain for failed cert retries, cert-worker scheduled handler

**Session 2 — Phase 1 e2e on live URL: PASSED ✅**
- All 8 steps passed on the deployed CF Workers URL
- Bypassed unreliable Supabase pg_net webhook: `mark-pass` now uses Next.js `after()` to trigger cert generation directly (more reliable; Supabase webhook stays as fallback)
- Training page auto-polls every 3s after mark-pass and transitions automatically when cert is ready

**Session 3 — Phase 2 quiz loop: COMPLETE ✅**
- `quiz_questions` table + migration 0003 (8 placeholder seeds tagged `PLACEHOLDER:*`)
- `/api/quiz/attempt` — server-side scoring, training_events audit, cert trigger on pass
- `QuizComponent` (~175 LOC) — one question at a time, no back button, attestation gate, pass/fail result
- Training page rewritten: "Mark Pass" stub removed, replaced by Rise confirmation gate → quiz flow
- BSBR logo embedded in cert PDF; course title: "Responsible Use of AI within the Legal Industry"
- Fixed: quiz score was float (87.5%), DB schema is int — now uses `Math.round(score)`
- `devLink` now returns on Resend error so magic links show on screen during testing

### Rob (planning decisions)
- Locked Articulate Rise 360 as course content format — pushed updated CLAUDE.md, REQUIREMENTS.md, ROADMAP.md, STATE.md
- Decided: stay on Stripe
- Target: Phases 2–4 done by July 1; Phase 5 (public launch) ~July 7–10
- Katy (attorney) co-authoring training content; she covers attorney review sign-off
- Rob designing the logo; Max presenting 3–5 site designs for review
- Rob started Articulate 360 trial today
- **Created new Resend API key — stored in rmt portal for Max to update tomorrow**
- Confirmed: Resend domain `aistaffcompliance.com` is verified (was verified 3 days ago — the 403 is a bad API key, not a domain issue)

---

## Current Status

| Item | Status |
|------|--------|
| Phase 1 — Hello-cert e2e stub | ✅ Complete + deployed |
| Phase 2 — Quiz loop (server-side scoring, attestation) | ✅ Complete + deployed |
| Phase 2 — Rise iframe | ⬜ Blocked on Rob's Rise web export |
| Phase 2 — Real question pool | ⬜ Blocked on Rob seeding 24–32 questions |
| Resend emails | ❌ 403 — new API key in rmt portal, Max to update |
| Supabase migration 0003 | ⬜ Needs `supabase db push` |
| "Try Again" quiz reset bug | ⚠️ Known — fix described below |
| devLink in production | ⚠️ Must remove before real customers |
| Custom domain `training.aistaffcompliance.com` | ⬜ Not set up yet |
| cert-worker cron drain (standalone Worker) | ⬜ Not deployed (less urgent) |

---

## Launch Timeline (set 2026-06-19, Rob)

| Date | Milestone |
|------|-----------|
| Jun 20–22 | Katy develops course content |
| Jul 1 | Backend + frontend 100% complete; content partially complete |
| Jul 10 | Everything 100% complete |
| Week of Jul 13 | Full e2e testing with ≥6 testers; all bugs fixed |
| Jul 20 | **Go live** |

---

## Immediate Next Steps (Max, 2026-06-19 morning)

1. **Fix Resend API key** — get new key from rmt portal, run:
   ```
   wrangler secret put RESEND_API_KEY
   ```
   No redeploy needed. This unblocks all email flows (magic links, invites, cert delivery).

2. **Apply migration 0003** — from project root:
   ```
   supabase db push
   supabase gen types typescript --linked > types/supabase.ts
   ```

3. **Fix "Try Again" quiz reset bug** — `router.refresh()` doesn't reset QuizComponent client state. In `training-client.tsx` add an `attemptKey` counter and pass as `key` prop to force remount:
   ```tsx
   const [attemptKey, setAttemptKey] = useState(0)
   <QuizComponent
     key={attemptKey}
     questions={questions}
     courseId={courseId}
     onPass={() => setPhase('cert_pending')}
     onRetry={() => { setAttemptKey(k => k + 1); router.refresh() }}
   />
   ```
   In `quiz-component.tsx` replace the Try Again `router.refresh()` with `onRetry?.()` (add `onRetry?: () => void` to Props).

4. **Run a fresh e2e test** — confirm emails now deliver end-to-end.

5. **Remove `devLink` from production** — once emails confirmed working, remove from `app/api/onboarding/complete/route.ts` and `app/api/invite/route.ts`.

---

## Blocked on Rob (no action needed from Max yet)

- Articulate Rise 360 web export — replaces iframe placeholder in `training-client.tsx`
- Real question pool (24–32 questions) — replaces `PLACEHOLDER:*` seeds in DB
- Logo design
- Site design review — Max presenting 3–5 options

---

## Key References

| Item | Value |
|------|-------|
| Deployed URL | `https://bsbr-attytraining.aistaffcompliance.workers.dev` |
| Stripe sandbox account | AI Staff Compliance & Training (`acct_1ThDpr6ZCSojEKRr`) |
| Stripe Price ID | `price_1TjNHc6ZCSojEKRrKs79ToJ0` |
| Supabase dev project | `ndmzvtuywcufvkxtkjhg` (Max's account) |
| GitHub repo | `rtraversi/bsbr-attytraining` |
| NEXT_PUBLIC_APP_URL | Set as wrangler VAR (not secret) — do NOT `wrangler secret put` it (error 10053) |
| Resend domain | `aistaffcompliance.com` — verified ✅ (3 days ago) |
| Resend from address | `AI Staff Compliance <info@aistaffcompliance.com>` |
| New Resend API key | In rmt portal — Max to update via `wrangler secret put RESEND_API_KEY` |
