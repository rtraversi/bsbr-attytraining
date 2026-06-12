<!-- GSD:project-start source:PROJECT.md -->

## Project

**AI Compliance Training Platform**

A self-serve web platform where solo and small-firm attorneys (1–15 staff) pay a one-time annual fee to certify their staff on proper AI usage under ABA Model Rule 5.3 (Vendor Supervision / attorney ethics compliance). Staff complete a 20–30 minute video course with embedded quizzes, pass with a score-gate (unlimited retakes), and receive a downloadable PDF certificate. Attorneys get a dashboard to audit staff completion, scores, and certificate status, and to issue reminders or reprints. The product is published under the **Built Smart by Rob** brand.

**Core Value:** An attorney can pay, invite their staff, see them complete the training, and produce certificates that demonstrate Rule 5.3 supervision compliance — without operator intervention.

### Constraints

- **Tech stack — frontend/hosting:** Next.js 15.5 (App Router, Edge Runtime throughout) on Cloudflare Pages via `@cloudflare/next-on-pages` — CF, not Netlify
- **Tech stack — backend:** Supabase (Auth + Postgres + Storage) — single integrated provider for auth, DB, and certificate PDF storage
- **Tech stack — video:** Cloudflare Stream (paid add-on required) — for signed-URL streaming and bandwidth economics
- **Tech stack — payments:** Stripe — standard for self-serve SaaS checkout; supports tiered pricing + webhooks
- **Tech stack — API/automation:** Cloudflare Workers for all serverless functions, cert generation, email, and scheduled jobs; no n8n, no VPS
- **Tech stack — interactive video/quiz:** Custom React quiz component (~150–200 lines) over the Cloudflare Stream native player — no H5P, no Articulate Rise
- **Pricing constraint:** $199 / 5 seats, $349 / 6–15 seats, $499 / 16+ seats — annual; renewal ~60% of original
- **Target market constraint:** Solo and small firms (1–15 staff) — UX, marketing, and pricing tiers reflect this; product is self-serve only
- **Compliance framing:** ABA Model Rule 5.3 — generic national framing; no state-specific accreditation claims in v1
- **Operator burden:** Self-run platform — operator (Rob) should not be in the loop for normal customer flows (purchase, invite, certify, renew); all of that is automated end-to-end

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | **15.5.x** (App Router) | Frontend, SSR, API routes (marketing site + firm dashboard + employee training UI) | Current LTS on Cloudflare Pages. v16 ships major breaks (sync APIs removed, Turbopack default, React Compiler stable) — for a greenfield tiny SaaS, lock to 15.5 LTS until 16.x has 2–3 patch releases; revisit at first phase boundary. App Router is mandatory: Server Components let the dashboard fetch firm/employee data without an extra API layer, and route handlers replace the old `pages/api` for Stripe webhooks. **Edge Runtime throughout** — `@cloudflare/next-on-pages` requires `export const runtime = 'edge'` on all dynamic routes. |
| **React** | **18.3.x** | UI runtime | Pairs with Next.js 15.5; React 19 features (use(), Actions) are available but optional — don't adopt until needed. |
| **TypeScript** | **5.6.x** | Type safety | Non-negotiable for a billing/compliance product. Stripe + Supabase both ship first-class types. |
| **Tailwind CSS** | **4.1.x** | Styling | Fastest path to applying Built Smart by Rob brand colors to a marketing-plus-dashboard product. v4 ships CSS-first config (`@theme` directive) and is dramatically faster — use it. |
| **Cloudflare Pages + Workers** | Pages + `@cloudflare/next-on-pages` | Hosting + serverless via `@cloudflare/next-on-pages`; CF Workers for all automation (cert gen, email, scheduled jobs) | No 26-second timeout concern — Workers have a generous CPU budget (50 ms free, 30 s paid). Cert PDF generation fits in a Worker because `pdf-lib` needs no headless browser. CF Pages preview deployments give staging-vs-prod environments (preview env vars → dev Supabase + Stripe test mode; production env vars → prod Supabase + Stripe live). **⚠️ Verify before scaffold:** Cloudflare now recommends `@opennextjs/cloudflare` (Workers-based) for new Next.js apps; `@cloudflare/next-on-pages` is in maintenance mode and Edge-Runtime-only. Verify the adapter choice against current CF docs before Max scaffolds — switching is free now (no code yet), costly later. This does NOT change the locked decision; it is a one-time pre-scaffold verification flag. |
| **Supabase** | **JS client `supabase-js` v2.49+** with **`@supabase/ssr` v0.6+** | Auth + Postgres + Storage | Single integrated provider. RLS handles firm-vs-employee tenancy at DB level. Storage signs cert URLs natively. Stay on free tier during dev; **upgrade to Pro ($25/mo) before launch** — free-tier 500MB RAM + project-pause-after-7-days is incompatible with paid customers. |
| **Postgres** | **15** (Supabase managed) | Source of truth | Schema: `firms`, `firm_members`, `seats`, `enrollments`, `quiz_attempts`, `certificates`. JWT custom claims (`firm_id`, `role`) drive RLS. |
| **Cloudflare Stream** | (current) | Video hosting, signed URLs, HLS delivery | Paid add-on. Pricing: $5 per 1,000 min stored, $1 per 1,000 min delivered. Ingress + encoding free. Pro/Business CF plan includes 100 min storage + 10,000 min delivery monthly. For one 30-min course × thousands of plays: delivery cost dominates. At 30 min × 100 employees × 5 firms/mo = 15,000 min/mo = ~$15/mo — well within tolerance. |
| **Stripe** | **Node SDK `stripe` v17.x**, API version `2025-09-30.acacia` (latest) | Checkout, subscriptions, webhooks, customer portal | Standard SaaS billing. Three tiered Prices, one Product per tier or one Product with three Prices. Customer Portal handles renewals — no custom UI needed. |
| **Cloudflare Workers** (automation) | Workers runtime | All automation: cert PDF generation, email (Resend REST API), renewal reminders, reprint links | Triggered by Supabase Database Webhooks (authenticated POST to a Worker endpoint), app-initiated `fetch()` POST from route handlers (fire-and-forget), or CF Workers Cron Triggers (scheduled jobs). No VPS, no n8n. Secrets managed via `wrangler secret put` or the CF dashboard. |
| **Custom React quiz** | ~150–200 LOC React component | Interactive quiz layer over the Cloudflare Stream native player | postMessage events from the CF Stream player gate quiz reveal at ~95% watched. Score submit → Server Action / Route Handler → `quiz_attempts` insert. No H5P. No Articulate Rise. H5P Path A (CF iframe + H5P Question Set below) is the documented fallback ONLY if the custom quiz exceeds ~5 days of work. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | `^2.49.0` | Supabase JS client | Always — browser, server, CF Workers. |
| `@supabase/ssr` | `^0.6.0` | Cookie-based SSR auth for Next.js App Router | Required for App Router. Replaces deprecated `@supabase/auth-helpers-nextjs` — do not use auth-helpers. |
| `stripe` (Node) | `^17.0.0` | Stripe API SDK | Webhook signature verification, Checkout Session creation, Customer Portal session creation. |
| `@stripe/stripe-js` | `^5.0.0` | Stripe browser SDK | Loads Stripe.js on the client when redirecting to Checkout. |
| `jose` | `^5.0.0` | Edge-compatible JWT signing and verification | Use for Cloudflare Stream signed-URL JWTs. **Do NOT use `jsonwebtoken`** — it depends on Node.js `crypto` which is unavailable on the CF Workers edge runtime. `jose` works everywhere (browser, Workers, Node). |
| `hls.js` | `^1.5.0` | HLS playback in browsers that don't support it natively (Chrome, Firefox, Edge) | Only needed if a custom player replaces the CF Stream native `<iframe>`. Not needed when using the CF Stream iframe embed. |
| `zod` | `^3.23.0` | Runtime schema validation | Validate Stripe webhook payloads, user-submitted firm metadata. (No H5P xAPI events — there is no H5P layer.) |
| `react-email` + `@react-email/render` | `^3.0.0` / `^1.0.0` | Type-safe transactional email templates | Render to HTML server-side; the resulting HTML string is passed to a CF Worker that calls the Resend REST API directly. |
| `pdf-lib` | `^1.17.0` | PDF generation for compliance certificates | **PRIMARY cert-PDF library.** Pure JS — no headless browser, no native deps — runs inside a CF Worker. Triggered by Supabase Database Webhook → authenticated POST to the cert Worker. |
| `date-fns` | `^4.1.0` | Date math for 12-month cert validity, renewal reminders | Lightweight alternative to Moment/Day.js. Already de facto standard. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `pnpm` | Package manager | Faster than npm, deterministic, lower disk. Configure `engines.pnpm` in `package.json`. |
| `eslint` + `eslint-config-next` | Linting | Next.js 15.5 still ships `next lint`; v16 deprecates it in favor of running eslint directly — start with eslint directly to avoid migration later. |
| `prettier` | Formatting | Standard. Single config at repo root. |
| **Supabase CLI** | Local DB, migrations, type generation | `supabase gen types typescript --linked > types/supabase.ts`. Run on every schema change. Crucial — never hand-write types for the DB. |
| **Wrangler CLI** | Local dev + deploy for CF Pages/Workers | `wrangler pages dev` for local Next.js dev; `wrangler deploy` to push Workers; secrets set via `wrangler secret put <KEY>` or the CF dashboard. Never commit secrets to source. |
| `dotenv-cli` | Env management | `.env.local` for Next.js local dev. `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDFLARE_STREAM_SIGNING_KEY_ID`, `CLOUDFLARE_STREAM_SIGNING_KEY_PEM` are stored as CF Pages/Workers environment variables (encrypted) — not exposed to the client. |
| **Stripe CLI** | Local webhook testing | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — non-negotiable for webhook dev. |
| Playwright | E2E tests | Test the critical revenue path: Stripe Checkout → firm provisioning → invite → quiz pass → cert email. One smoke test for this is more valuable than 100 unit tests. |

## Installation

# Core

# Email templating

# Styling

# Dev tooling

# Optional fallback

# Global CLIs (one-time)

## Integration Patterns (the load-bearing details)

### 1. Next.js 15 on Cloudflare Pages — routing & rendering split

- **App Router only.** No Pages Router. The Stripe webhook handler is a Route Handler at `app/api/webhooks/stripe/route.ts`.
- **Rendering strategy by surface:**
- **Next.js 15 caching gotcha:** `fetch` is no longer cached by default. Don't rely on the old default. Set explicit `cache: 'force-cache'` only for static marketing content; everything authenticated stays uncached.
- **Edge Runtime throughout:** `@cloudflare/next-on-pages` requires `export const runtime = 'edge'` on dynamic routes. Cert PDF generation runs in a separate CF Worker (using `pdf-lib`, pure JS, no headless browser) — the Route Handler fires and forgets a POST to that Worker after Stripe webhook processing.
- **CF Pages adapter advisory:** Stay on `@cloudflare/next-on-pages` per the locked decision, but verify against current CF docs before scaffolding — `@opennextjs/cloudflare` (Workers-based) is now the CF-recommended adapter; `@cloudflare/next-on-pages` is maintenance mode / Edge-Runtime-only. Switching is free now, costly once code exists.
- **Preview deployments:** CF Pages preview deployments replace branch deploys. Preview environment (its own env vars) → dev Supabase + Stripe test mode; production environment → prod Supabase + Stripe live.

### 2. Supabase — Auth, RLS, Storage

- **Firm admin (purchaser):** email/password set during post-Stripe-checkout onboarding. Magic link as a "forgot password" fallback.
- **Employees:** invite link → set password on first visit. Magic link offered as a secondary login. Do NOT require employees to "sign up" — they are provisioned by the firm admin's seat purchase.
- `lib/supabase/client.ts` exports `createBrowserClient()` — used in Client Components only.
- `lib/supabase/server.ts` exports `createServerClient()` — used in Server Components, Route Handlers, Server Actions. Reads cookies via `cookies()` from `next/headers`.
- `middleware.ts` at repo root refreshes the auth token on every request. **This is mandatory** — without it, sessions expire mid-flow.
- Use `supabase.auth.getClaims()` (not `getSession()`) for authorization decisions in server code. `getSession()` returns un-verified data; `getClaims()` validates the JWT.
- **Do NOT use `@supabase/auth-helpers-nextjs`** — deprecated. Anyone copy-pasting older tutorials will hit this.
- `firm_id` and `role` are stamped into `app_metadata` (NOT `user_metadata`, which the user can edit) via an Auth Hook or a server-side `auth.admin.updateUserById()` call during invite acceptance.
- Index every `firm_id` column. RLS without indexes is the #1 Supabase performance pitfall.
- Bucket: `certificates`, **private** (not public).
- Path convention: `firms/{firm_id}/employees/{user_id}/{enrollment_id}.pdf`.
- Generate signed download URLs server-side: `supabase.storage.from('certificates').createSignedUrl(path, 60 * 60 * 24 * 7)` — 7-day URL, regenerated when the dashboard renders.
- RLS-equivalent storage policy: only firm members can list/read their firm's prefix.
- Two active projects max — staging + prod = at the limit. **No room for a third (e.g., a sandbox).**
- Free projects pause after 7 days inactivity. Fine for dev, fatal for prod.
- **Action:** upgrade to Pro ($25/mo) before going live. Budget item.

### 3. Cloudflare Stream — signed URLs & embedding

- **Path A (chosen):** Don't use H5P Interactive Video. Instead, embed the Cloudflare Stream iframe in the page, and place H5P **Question Set** / **Single Choice Set** content blocks below or alongside it. Use the Stream player's `postMessage` events to drive UI logic (e.g., reveal the quiz when video reaches 95%). Simpler, no custom H5P plugin, full Cloudflare Stream features (DRM-lite via signed URLs, analytics).
- **Path B:** Use H5P with a direct MP4 URL from the Cloudflare Stream Downloads API. This gives you timestamp-locked interactions in-video but: (a) signed MP4 URLs are awkward (one URL per download enable, separate API), (b) you lose adaptive bitrate streaming, (c) bandwidth costs may go up. **Avoid.**

### 4. Stripe — tiered seat pricing, webhooks, portal

- `prod_basic`: "Compliance Training — Up to 5 Seats" → Prices: `price_basic_first_$199`, `price_basic_renewal_$119`
- `prod_standard`: "Compliance Training — 6–15 Seats" → Prices: `price_standard_first_$349`, `price_standard_renewal_$209`
- `prod_pro`: "Compliance Training — 16+ Seats" → Prices: `price_pro_first_$499`, `price_pro_renewal_$299`
- Use **Stripe Checkout (hosted)**, mode `subscription`. Don't build a card form.
- After payment, Stripe redirects to `/onboarding?session_id={CHECKOUT_SESSION_ID}` where the app waits for the webhook to provision the firm.
- Route: `app/api/webhooks/stripe/route.ts` (Edge Runtime — `export const runtime = 'edge'`).
- **Must read the raw request body** for signature verification: use `await req.text()` (not `req.json()`).
- **Use `stripe.webhooks.constructEventAsync`** (Web Crypto API — edge-compatible), NOT the sync `stripe.webhooks.constructEvent` which requires Node.js `crypto`. The async variant works on CF Workers/Pages Edge Runtime.
- **Idempotency:** insert into `processed_stripe_events(event_id PK)` before processing; skip duplicate events.
- Critical events to subscribe to:
- Configure once in the Stripe Dashboard: enable subscription cancellation, payment method updates, invoice history. Disable plan upgrades unless you want to handle mid-cycle proration logic (recommend: disable, link to a "contact us" page for upgrades initially).
- Server route `app/api/portal/route.ts` creates a portal session: `stripe.billingPortal.sessions.create({ customer, return_url })`.

### 5. Cloudflare Workers — automation runtime

| Event source | Trigger method | When to use |
|--------------|---------------|-------------|
| Supabase row insert/update | **Database Webhook** (Supabase → authenticated POST to a CF Worker endpoint) | Reactive: when `quiz_attempts.status` flips to 'passed', kick off cert PDF generation. Validate `X-Webhook-Secret` header; return 401 on mismatch. |
| Next.js route handler | `fetch()` POST from a Route Handler (fire-and-forget) | Initiated from app code: after Stripe webhook processing, POST to a CF Worker to send welcome email via Resend REST API. |
| Scheduled / cron | **CF Workers Cron Trigger** | Expiry reminders at 90/30/7 days before cert expiry; 5-min drain of a `cert_generation_queue` dead-letter queue. |
| Reprint link click | CF Worker HTTP endpoint (public URL, secret-validated) | "Send me a reprint" link → Worker re-signs the Supabase Storage URL and emails the signed URL via Resend. |

- Secrets managed via `wrangler secret put <KEY>` or the CF dashboard — no credential database to back up.
- Shared-secret header (`X-Webhook-Secret`) validated in each Worker inbound from Supabase; rotate via `wrangler secret put`.
- Workers are stateless — no persistent process, no SQLite, no n8n workflow database.

### 6. Custom React quiz — the decision

The quiz layer is a **custom React component (~150–200 lines)** rendered below the Cloudflare Stream native `<iframe>` player. No H5P. No Articulate Rise.

**How it works:**
- The CF Stream player emits `postMessage` events to the parent page (progress percentage, play/pause, ended).
- The quiz component listens for the progress event; quiz reveal is gated at ~95% watched.
- On submission, the score is sent to a Server Action or Route Handler, which inserts into `quiz_attempts`.
- Pass threshold (recommend 80%) is stored in `courses.pass_threshold`; unlimited retakes allowed.

**Fallback:** H5P Path A (CF Stream iframe + H5P Question Set block below it) is the documented fallback ONLY if the custom quiz implementation exceeds ~5 days of work. In that case, use the H5P standalone rendering library (MIT licensed) with the H5P Question Set content type; do NOT use H5P Interactive Video (no native CF Stream adapter).

**Why custom React over H5P for v1:** The quiz is ~5 multiple-choice questions — ~150 LOC of React beats an entire H5P toolchain. No xAPI LRS needed. Score reporting is direct to Supabase, not through an event dispatcher. Simpler product, fewer moving parts.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js on Cloudflare Pages (`@cloudflare/next-on-pages`) | Next.js on Vercel / `@opennextjs/cloudflare` | Vercel if Cloudflare Pages ships broken on a specific Next.js feature; `@opennextjs/cloudflare` (Workers-based) if CF officially deprecates `@cloudflare/next-on-pages` — see adapter advisory in the Core Technologies table. Verify before scaffolding. |
| Supabase | Auth0 + Neon + S3 | Multi-region compliance requirements, >100k users, or need for SOC2-certified auth provider. None apply at this scale. |
| Cloudflare Stream | Mux | Mux has superior analytics and slightly better API ergonomics, but at higher cost. Cloudflare is fine for this volume. |
| Cloudflare Stream | YouTube unlisted | Free, but: no DRM, no signed URLs, ads risk, brand dilution, no analytics. Unacceptable for paid product. |
| Stripe | Lemon Squeezy / Paddle | Merchant-of-record services that handle tax. Worth revisiting **post-launch** if VAT/sales tax across states becomes painful. Stripe + manual tax filing is fine at v1 scale. |
| CF Workers (automation) | n8n / Make / Zapier | All out of scope — no VPS, no external automation platform. CF Workers Cron Triggers replace n8n Schedule Triggers; authenticated Worker endpoints replace n8n webhook nodes. |
| Custom React quiz | H5P Path A (CF Stream iframe + H5P Question Set) | Fallback ONLY if custom quiz implementation exceeds ~5 days of work. H5P Path A is documented as the fallback in §6. |
| `pdf-lib` in a CF Worker | External PDF API (DocRaptor / Carbone / PDF Generator API) | If `pdf-lib` layout fidelity becomes painful for the certificate template. Both services have REST APIs callable from a Worker. Start with `pdf-lib`; switch only if needed. |
| Resend (email) | Postmark | When a single missed password-reset email would be a P0 incident. For onboarding + cert delivery + reminders at this scale, Resend is fine and cheaper. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-nextjs` | Deprecated. Bug fixes have stopped. Many copy-pasted tutorials still reference it. | `@supabase/ssr` v0.6+ |
| Supabase `getSession()` for authorization | Returns unverified data from cookies — can be spoofed in some scenarios | `supabase.auth.getClaims()` (validates JWT) for any "can this user do X" check |
| `user_metadata` for `firm_id` or `role` | The user can edit their own `user_metadata` via the client SDK — instant privilege escalation | `app_metadata` (read-only from the client; set by service-role admin calls) |
| Next.js Pages Router | App Router is the path forward; mixing both for a greenfield project creates support drag | App Router exclusively |
| Next.js 16.x on Cloudflare Pages (today) | Cloudflare's Next.js runtime trails Vercel on new releases; 16.x stability on CF Pages is unverified | Next.js 15.5 LTS until 16.x has been on CF Pages production for 2–3 patch cycles |
| `next lint` (legacy wrapper) | Deprecated in 15.5, removed in 16 | Run `eslint` directly with `eslint-config-next` |
| `fetch()` default caching in Next.js 15 | Changed behavior from Next.js 14 — was cached, now is not. Easy to assume old behavior. | Explicit `cache: 'force-cache'` or `next: { revalidate: N }` per request |
| `jsonwebtoken` for Cloudflare Stream signed URLs | Node.js-only — unavailable on CF Workers/Pages Edge Runtime | `jose` (edge-compatible, works on Workers, browsers, and Node) |
| PDF generation requiring a headless browser (Puppeteer/Chrome) on edge | No headless Chrome on CF Workers edge | `pdf-lib` (pure JS) in a CF Worker — no native deps, runs without a browser |
| Stripe per-seat `quantity` for tier pricing | Tiers here are bands (5, 15, 16+), not strict per-seat — using `quantity` invites accidental proration math | Three distinct Prices, seat cap as subscription metadata |
| Storing `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in client code | Total compromise — these keys can do anything on your account | CF Pages/Workers environment variables (encrypted at rest); set via `wrangler secret put` or CF dashboard; never in source code |
| Free-tier Supabase in production | Pauses after 7 days inactivity, 500 MB RAM, no point-in-time recovery | Pro tier ($25/mo) before launch |
| Old Supabase API keys for new projects | Will be retired end of 2026 | New `sb_publishable_*` + `sb_secret_*` key format |

## Stack Patterns by Variant

- Use `prod_basic` ($199). Seat metadata `{ seat_count: 5 }`. Enforce at invite time.
- No special pattern — this is the default flow.
- Use `prod_standard` ($349). Same flow.
- Out of v1 scope. Customer Portal disables plan changes initially. Operator handles manually for v1. Add proration logic if it becomes a pattern.
- Stripe Smart Retries handles retries. After final failure, `invoice.payment_failed` webhook → mark firm as `payment_failed`, employees lose access to *new* enrollments but keep access to existing certs (immutable record). Email firm admin with payment recovery link.
- Cloudflare Stream cost scales linearly with delivered minutes. At ~$1 per 1,000 min delivered, a 60-min video × 1,000 plays = 60,000 min = $60/mo. Still fine.
- Custom React quiz pacing: if in-video timestamp-locked interactions are ever needed, the custom quiz component would need to hook into CF Stream `postMessage` seek events or switch to a custom `hls.js`-based player that exposes timeline control.
- Stripe handles multi-currency natively but tax compliance is on you. Switch to Lemon Squeezy or Paddle (merchant-of-record) before international launch.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@15.5` | `react@18.3`, `react-dom@18.3` | React 19 works with Next.js 15.5 but optional features only. Don't adopt until needed. |
| `next@15.5` | `eslint-config-next@15.5` | Pin to the same minor. |
| `@supabase/ssr@^0.6` | `@supabase/supabase-js@^2.49` | Always upgrade both together; the SSR package depends on supabase-js types. |
| `@supabase/ssr@^0.6` | `next@15.5` App Router | Requires `cookies()` from `next/headers` — App Router only. Will not work with Pages Router. |
| `stripe@17` (Node/Edge) | Stripe API version `2025-09-30.acacia` | SDK ships with a default API version pinned; pass `apiVersion` explicitly to lock it. On Edge Runtime, use `stripe.webhooks.constructEventAsync` (Web Crypto), NOT the sync `constructEvent` (Node crypto). |
| `@cloudflare/next-on-pages` | `next@15.5` | Requires Edge Runtime on all dynamic routes (`export const runtime = 'edge'`). Maintenance mode — verify adapter choice against current CF docs before scaffolding; `@opennextjs/cloudflare` is CF's current recommendation. |
| `jose` | CF Workers / Edge Runtime / Node | Edge-compatible JWT library; no native deps. Use in place of `jsonwebtoken` everywhere in this stack. |
| `pdf-lib@^1.17` | CF Workers / Edge Runtime | Pure JS, no native deps — runs in a CF Worker without headless Chrome. |
| `tailwindcss@^4` | PostCSS via `@tailwindcss/postcss` plugin | v4 dropped the v3 plugin format. Migration is real but small. |

## Confidence Assessment

| Component | Confidence | Reason |
|-----------|------------|--------|
| Next.js 15.5 on Cloudflare Pages | MEDIUM-HIGH | Well-established stack; `@cloudflare/next-on-pages` adapter advisory is the one open verification — confirm adapter choice against current CF docs before scaffolding. |
| Supabase Auth + RLS pattern | HIGH | Standard multi-tenant pattern documented by Supabase itself; pattern matches firm/employee model exactly. |
| Cloudflare Stream signed URLs | HIGH | Direct match to product needs (signed video access tied to enrollment); pricing verified for our volume. |
| Custom React quiz | HIGH | Small surface (~150–200 LOC), no vendor lock, direct Supabase score reporting via Server Action. Fallback (H5P Path A) is documented if needed. |
| Stripe pattern (three Prices + metadata) | HIGH | Standard tiered SaaS shape; Customer Portal handles renewal. |
| `pdf-lib` in CF Worker | MEDIUM-HIGH | Pure JS, no browser — runs cleanly on Workers. Layout fidelity for the cert template is the one risk; external PDF API is the documented fallback. |
| Resend over Postmark | MEDIUM | Functionally correct for this scale; Postmark is the safer pick for absolute deliverability. Decide before launch based on operator's risk tolerance on missed emails. |
| Tailwind v4 | MEDIUM-HIGH | v4 is stable but newer than v3; one-time migration cost for any v3-era components copy-pasted from elsewhere. |

## Sources

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15) — HIGH
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — HIGH (informs the "stay on 15.5" recommendation)
- [Cloudflare Pages — Next.js deployment guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/) — HIGH
- [`@cloudflare/next-on-pages` GitHub](https://github.com/cloudflare/next-on-pages) — HIGH (adapter docs + maintenance-mode status)
- [`@opennextjs/cloudflare` GitHub](https://github.com/opennextjs/opennextjs-cloudflare) — HIGH (CF-recommended Workers-based adapter — see adapter advisory)
- [Cloudflare Workers — Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) — HIGH
- [Supabase SSR for Next.js — official](https://supabase.com/docs/guides/auth/server-side/nextjs) — HIGH
- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — HIGH
- [Migrating to the SSR package from Auth Helpers](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers) — HIGH (confirms auth-helpers deprecation)
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) — MEDIUM-HIGH
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — MEDIUM-HIGH
- [Supabase Pricing](https://supabase.com/pricing) — HIGH
- [Cloudflare Stream — Securing your Stream](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/) — HIGH
- [Cloudflare Stream Pricing](https://developers.cloudflare.com/stream/pricing/) — HIGH
- [Cloudflare Stream — Use your own player](https://developers.cloudflare.com/stream/viewing-videos/using-own-player/) — HIGH
- [Stripe Webhooks — quickstart](https://docs.stripe.com/webhooks/quickstart?lang=node) — HIGH
- [Stripe `constructEventAsync` (edge-compatible)](https://docs.stripe.com/webhooks/signature-verification?lang=node#edge-runtimes) — HIGH (use this, not sync `constructEvent`, on CF Workers/Pages Edge)
- [Stripe Customer Portal — configure](https://docs.stripe.com/customer-management/configure-portal) — HIGH
- [Stripe pricing models — tiered/per-seat/flat](https://docs.stripe.com/products-prices/pricing-models) — HIGH
- [Resend vs Postmark 2026 comparison](https://www.pkgpulse.com/blog/resend-vs-nodemailer-vs-postmark-email-nodejs-2026) — MEDIUM

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

<!-- manual section — keep outside GSD markers so regeneration doesn't remove it -->

## Session handoff (SHARED — overrides any global memory-directory handoff instructions)

This project is built by two people (Rob and Max) on different machines, so the session handoff lives
**in the repo**, not in any machine's local Claude memory directory:

- **Save:** on wrap-up triggers ("wrap it up", "call it a day", "we're done", "i'll pick this up tomorrow",
  etc.), write the handoff to `session_handoff.md` at the repo root (overwrite each session). Include:
  **Date + who** (Rob or Max), **What was done** (features, files, decisions), **Status** (working vs.
  needs deploy/run/test), **Next steps**, **Open questions**. Commit it with the session's final commit
  so the other person can pull it.
- **Load:** at the start of every session, FIRST run `git pull` to fetch the other person's latest
  handoff/work (if the working tree has uncommitted changes, skip the pull, say so, and read the local
  copy instead). Then read `session_handoff.md` at the repo root and surface a 2–3 sentence recap:
  what was last worked on, by whom, and the next steps. Do this once per session, not every turn.
- This file is the cross-person sync point — it complements (does not replace) GSD's `.planning/` state.
