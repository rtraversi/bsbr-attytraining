---
phase: quick-260709-aeh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/checkout/route.ts
  - app/api/webhooks/stripe/route.ts
autonomous: true
requirements: [PAY-DOUBLE-BILL, PAY-SILENT-PROVISION]

must_haves:
  truths:
    - "A logged-in firm admin whose firm is 'active' is redirected to /api/portal instead of a second Stripe checkout"
    - "Anonymous buyers reach Stripe checkout exactly as before (revenue path unchanged)"
    - "Any error during the auth/firm lookup falls through to normal checkout — never blocks a legitimate buyer"
    - "When webhook createUser fails on an already-registered email, an operator alert email is sent before returning"
    - "A failed alert email is logged but never throws the webhook handler; Stripe still receives 200"
  artifacts:
    - path: "app/api/checkout/route.ts"
      provides: "Active-firm short-circuit before Stripe session creation"
      contains: "createClient"
    - path: "app/api/webhooks/stripe/route.ts"
      provides: "Operator alert on provisioning collision"
      contains: "OPERATOR_ALERT_EMAIL"
  key_links:
    - from: "app/api/checkout/route.ts"
      to: "firms.status"
      via: "createAdminClient firm lookup by app_metadata.firm_id"
      pattern: "app_metadata"
    - from: "app/api/webhooks/stripe/route.ts"
      to: "sendEmail"
      via: "try/catch operator alert in handleCheckoutCompleted"
      pattern: "sendEmail"
---

<objective>
Close the double-billing / silent-provisioning-failure gap in Stripe checkout. Two independent code layers, no DB migration and no schema change.

Purpose: Stop an already-subscribed firm admin from accidentally paying twice, and make the webhook's "email already registered" collision loud (operator alert) instead of a silent `return`.

Output: Modified `app/api/checkout/route.ts` (Layer 1) and `app/api/webhooks/stripe/route.ts` (Layer 2), each shipped as one atomic commit.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Contracts the executor needs. Extracted from the codebase — no exploration required. -->

From lib/supabase/server.ts:
  export async function createClient(): Promise<SupabaseClient>  // cookie-based, reads caller's auth session

From lib/supabase/admin.ts:
  export function createAdminClient(): SupabaseClient  // service-role, bypasses RLS

From lib/resend.ts:
  export async function sendEmail(args: { to: string; subject: string; html: string }): Promise<void>
  // throws on missing RESEND_API_KEY or non-2xx Resend response — MUST be wrapped in try/catch here

app/api/checkout/route.ts today:
  - Fully anonymous/stateless POST. Reads { seats }, calls getStripe().checkout.sessions.create(...),
    returns NextResponse.json({ url: session.url }). Uses a lazy getStripe() singleton.
  - Client callers do `window.location.href = url` — returning { url: "/api/portal" } redirects the admin.

app/api/webhooks/stripe/route.ts today:
  - Already imports createAdminClient and sendEmail. Uses a lazy getStripe() singleton.
  - handleCheckoutCompleted(session): on createUserError it currently does
    `console.warn(...)` then bare `return` (lines ~112-116). session.customer / session.subscription
    are Stripe IDs (typed as string | Stripe.Customer | null — cast to string as done elsewhere in the file).
</interfaces>

Do NOT touch (uncommitted work held by another dev): app/dashboard/layout.tsx, app/dashboard/_components/account-menu.tsx, app/dashboard/quizzes/_components/quizzes-client.tsx.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Block a second checkout for firms with an active subscription (Layer 1)</name>
  <files>app/api/checkout/route.ts</files>
  <action>
Add `import { createClient } from '@/lib/supabase/server'` and `import { createAdminClient } from '@/lib/supabase/admin'` at the top of the file.

Inside the POST handler, AFTER the seats are parsed and validated but BEFORE `getStripe().checkout.sessions.create(...)` is called, insert an "active firm" short-circuit wrapped in its own try/catch:

1. `const supabase = await createClient()` then `const { data: { user } } = await supabase.auth.getUser()`.
2. If there is a `user` AND `user.app_metadata?.firm_id` (typed `as string | undefined`) is truthy: create an admin client `const admin = createAdminClient()` and select the firm's status: `admin.from('firms').select('status').eq('id', firmId).single()`.
3. If `firm?.status === 'active'`, return `NextResponse.json({ url: '/api/portal' })` — this makes the client's `window.location.href = url` send the admin to the portal instead of buying a second subscription.
4. Otherwise (no user, no firm_id, firm not found, or firm not active) do NOTHING and let control fall through to the existing Stripe checkout code unchanged.

Wrap this ENTIRE block in `try { ... } catch (err) { console.error('checkout active-firm check failed, falling through:', err) }` so ANY failure (auth lookup, DB error) falls through to normal anonymous checkout. Being defensive here is mandatory — the anonymous purchase path is the primary revenue path and must never be blocked by this check.

Do NOT modify the seats parsing, the Stripe session creation options, or the anonymous return path. Do NOT change any client component.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <automated>npx eslint app/api/checkout/route.ts</automated>
  </verify>
  <done>tsc and eslint pass clean. A logged-in admin of an 'active' firm receives `{ url: '/api/portal' }`; anonymous callers and non-active-firm users still reach Stripe checkout; any thrown error in the new block is caught and falls through. Commit: `fix(checkout): block second checkout for firms with an active subscription`</done>
</task>

<task type="auto">
  <name>Task 2: Alert operator on silent Stripe provisioning collision (Layer 2)</name>
  <files>app/api/webhooks/stripe/route.ts</files>
  <action>
In `handleCheckoutCompleted`, replace the current silent collision handling (the `if (createUserError) { console.warn(...); return }` block around lines 112-116). Keep the existing imports — `createAdminClient` and `sendEmail` are already imported at the top of the file.

New behavior inside `if (createUserError) { ... }`:

1. Keep the existing `console.warn(...)` line for local visibility.
2. Determine the recipient: `const operatorEmail = process.env.OPERATOR_ALERT_EMAIL ?? 'info@aistaffcompliance.com'`.
3. Build the alert email. Subject: something like `⚠️ Stripe provisioning collision — manual action needed`. The HTML body MUST include all of: the customer `email`, `session.customer` (Stripe customer ID, cast `as string`), `session.subscription` (subscription ID, cast `as string`), `session.id`, and `createUserError.message`. Use a plain inline-styled HTML block consistent with the existing email markup in this file. Optional (only if trivially available): note that this email already owns a registered auth user — do NOT add extra DB round-trips or new queries to determine active-firm ownership; skip the enrichment if it is not already in hand.
4. Send it best-effort, wrapped in try/catch:
   `try { await sendEmail({ to: operatorEmail, subject, html }) } catch (mailErr) { console.error('[stripe-webhook] operator alert email failed:', mailErr) }`.
5. After the alert attempt, keep the existing `return` — do NOT provision, do NOT auto-cancel the subscription, do NOT auto-refund. The handler still returns without throwing, so the outer POST returns 200 to Stripe and the event is not retried.

Do NOT change any other handler, the idempotency logic, or the successful provisioning path.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <automated>npx eslint app/api/webhooks/stripe/route.ts</automated>
  </verify>
  <done>tsc and eslint pass clean. On createUser collision the handler sends an operator alert containing customer email, Stripe customer ID, subscription ID, session id, and the error message; a mail failure is caught and logged (never thrown); the handler still returns without provisioning and the webhook returns 200. Commit: `fix(webhooks): alert operator on silent Stripe provisioning collision`</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` is clean across the repo after both tasks.
- `npx eslint app/api/checkout/route.ts app/api/webhooks/stripe/route.ts` is clean.
- No client components changed. None of the three held dashboard files touched.
- No new DB table, migration, or type regeneration.
</verification>

<success_criteria>
- Active-firm admin is redirected to /api/portal instead of a second checkout; anonymous revenue path unchanged and never blocked by the new check.
- Webhook provisioning collision now emits a best-effort operator alert with full Stripe context, still returns 200, and never auto-cancels or refunds.
- Two atomic commits with the specified messages.
</success_criteria>

<output>
Create `.planning/quick/260709-aeh-fix-double-billing-silent-provisioning-f/260709-aeh-SUMMARY.md` when done.
</output>
