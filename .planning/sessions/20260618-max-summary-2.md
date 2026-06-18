# Session Summary — Max (2026-06-18, Session 2)
**Who:** Max (developer) + Claude (terminal/code mode)

---

## What Was Done This Session

### Phase 1 e2e test — COMPLETE ✅

Full 8-step end-to-end test passed on the live CF Workers deployment:
1. ✅ Stripe checkout → firm provisioned in Supabase
2. ✅ Webhook fired → firm + admin created
3. ✅ Onboarding page loaded + firm name saved
4. ✅ Admin magic link → dashboard
5. ✅ Employee invited → seat count incremented
6. ✅ Employee invite link → set password → training page
7. ✅ Mark as complete → cert generating
8. ✅ Cert PDF generated → download button appeared automatically

---

## Fixes Made This Session

### 1. devLink exposed in production (both routes)
`app/api/onboarding/complete/route.ts` and `app/api/invite/route.ts` were gating the devLink behind `NODE_ENV === 'development'`. On CF Workers (production), this is always `'production'`, so the magic link was sent to Resend (which failed with 403) and never shown on screen. Fixed: removed the NODE_ENV check so the magic link always appears in the response for testing.

**TODO before real customers:** remove `devLink` from both responses entirely.

### 2. Supabase webhook not firing — bypassed entirely
The Supabase DB webhook (`certqueuecloudflare`) never delivered to our CF Workers URL despite correct configuration. Root cause unclear (likely pg_net timeout or delivery issue). 

**Fix:** `app/api/training/mark-pass/route.ts` now uses Next.js `after()` to call `/api/certs/generate` directly after returning its response. This bypasses the Supabase webhook entirely and is more reliable.

```javascript
after(async () => {
  await fetch(`${appUrl}/api/certs/generate`, {
    method: 'POST',
    headers: { 'x-webhook-secret': secret, ... },
    body: JSON.stringify({ type: 'INSERT', table: 'cert_generation_queue', record: { ...queueRow } }),
  })
})
```

The Supabase webhook can stay as a fallback but is no longer the primary trigger.

### 3. Training page auto-polls after mark-pass
`training-client.tsx` was calling `router.refresh()` once immediately after mark-pass, but the cert wasn't ready yet. Fixed with two `useEffect` hooks:
- Syncs `phase` state when `initialPhase` prop changes (so server re-renders propagate to the client)
- Auto-polls `router.refresh()` every 3 seconds while `phase === 'cert_pending'`
- Stops polling automatically when the server returns `certified`

Result: page transitions from "certificate generating" → download button automatically, no manual refresh needed.

### 4. Diagnostic logs cleaned up
Removed `console.log` statements added to `app/api/certs/generate/route.ts` during debugging.

---

## Key Discoveries

- **Resend domain not verified:** All emails (magic links, invites, cert delivery) fail with `403: aistaffcompliance.com domain is not verified`. Non-fatal (code catches errors), but emails never arrive. Rob must verify the domain in Resend dashboard before launch.
- **Supabase webhook unreliable:** pg_net never delivered to CF Workers URL despite correct URL + secret. The `after()` fix in mark-pass is now the primary cert trigger.
- **cert-pdf.ts hangs in CF Workers if called without a real queue row:** The atomic claim `UPDATE WHERE status='pending'` returns empty if the queue row ID doesn't exist in the DB. Always insert a real row before calling the endpoint.

---

## Current Deployed State

| Route | Status |
|-------|--------|
| Landing page | ✅ Live |
| Stripe checkout | ✅ Live |
| Stripe webhook | ✅ Live |
| Onboarding | ✅ Live (devLink exposed — remove before launch) |
| Auth flows | ✅ Live |
| Employee invite | ✅ Live (devLink exposed — remove before launch) |
| Mark pass stub | ✅ Live (auto-triggers cert generation via `after()`) |
| Cert generation | ✅ Live |
| Cert download URL | ✅ Live |
| Training page auto-poll | ✅ Live |

**Deployed URL:** `https://bsbr-attytraining.aistaffcompliance.workers.dev`

---

## What's NOT Done (before Phase 2)

1. **Resend domain verification** — Rob's task. Go to resend.com/domains, add `aistaffcompliance.com`, add DNS records. Until this is done, zero emails deliver.
2. **Remove devLink from production** — `app/api/onboarding/complete/route.ts` and `app/api/invite/route.ts` both return `devLink: actionLink` unconditionally. Remove before real customers touch the app.
3. **Custom domain** — `training.aistaffcompliance.com` not set up yet. Fine for staging on `*.workers.dev`.
4. **cert-worker cron drain** — standalone Worker in `workers/cert-worker/` not deployed. The `after()` fix makes this less urgent.

---

## Phase 2 — What's Next

**Blocked on Rob:**
- Articulate Rise 360 course export (Rob + Katy authoring)
- Resend domain verification

**When Rise export is ready:**
1. Host Rise web package on CF R2 or Articulate hosting
2. Replace video placeholder with Rise iframe on training page
3. Add "I have completed the training" confirmation gate (no postMessage needed)
4. Build custom React certification quiz (~150–200 LOC):
   - Randomized question pool (≥3× per-attempt count)
   - One question at a time, no back button
   - Identity attestation checkbox required
   - Server-side scoring at `/api/quiz/attempt` against `courses.pass_threshold`
   - Unlimited retakes, fresh subset each attempt
5. Remove "Mark as complete (stub)" button

---

## Key References

- **Deployed URL:** `https://bsbr-attytraining.aistaffcompliance.workers.dev`
- **Supabase dev project:** `ndmzvtuywcufvkxtkjhg` (Max's account)
- **Stripe Price ID:** `price_1TjNHc6ZCSojEKRrKs79ToJ0`
- **Stripe sandbox account:** AI Staff Compliance & Training (`acct_1ThDpr6ZCSojEKRr`)
- **GitHub repo:** `rtraversi/bsbr-attytraining`
- **CERT_WEBHOOK_SECRET:** in `.env.local` and `.dev.vars`
- **NEXT_PUBLIC_APP_URL:** set as wrangler VAR (not secret) — do NOT `wrangler secret put` it
