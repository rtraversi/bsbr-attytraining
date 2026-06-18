<!-- GSD:project-start source:PROJECT.md -->

## Project

**AI Compliance Training Platform**

A self-serve web platform where solo and small-firm attorneys (1–15 staff) pay a one-time annual fee to certify their staff on proper AI usage under ABA Model Rule 5.3 (Vendor Supervision / attorney ethics compliance). Staff work through an interactive Articulate Rise 360 training module (flip cards, scenarios, click-to-reveal, knowledge checks — authored by Rob + Katy, an attorney), then pass a custom React certification quiz with a score-gate (unlimited retakes), and receive a downloadable PDF certificate. Attorneys get a dashboard to audit staff completion, scores, and certificate status, and to issue reminders or reprints. The product is published under the **Built Smart by Rob** brand.

**Core Value:** An attorney can pay, invite their staff, see them complete the training, and produce certificates that demonstrate Rule 5.3 supervision compliance — without operator intervention.

### Constraints

- **Tech stack — frontend/hosting:** Next.js 15.5 (App Router, Node.js runtime via `nodejs_compat`) on **Cloudflare Workers** via `@opennextjs/cloudflare` (OpenNext adapter) — CF, not Netlify
- **Tech stack — backend:** Supabase (Auth + Postgres + Storage) — single integrated provider for auth, DB, and certificate PDF storage
- **Tech stack — course content:** Articulate Rise 360 interactive web export (flip cards, scenarios, click-to-reveal, ungraded knowledge checks) authored by Rob + Katy; hosted as static assets (Cloudflare R2 or Articulate's hosting), embedded via iframe in the employee training page. Rise content is the **learning layer only** — it reports no scores to the app. Cloudflare Stream MAY be used for short video clips embedded within Rise, but is NOT the primary delivery mechanism and is NOT required at launch.
- **Tech stack — certification quiz:** Custom React component (~150–200 lines) rendered after the Rise content iframe. This is the **certifiable layer** — server-side scoring, identity attestation, results written to Supabase. No score reporting from Rise. No H5P. No SCORM LRS.
- **Tech stack — payments:** Stripe — standard for self-serve SaaS checkout; supports tiered pricing + webhooks
- **Tech stack — API/automation:** Cloudflare Workers for all serverless functions, cert generation, email, and scheduled jobs; no n8n, no VPS
- **Pricing constraint:** $35/user/yr for 1–9 users, $32/user/yr for 10–24 users, $28/user/yr for 25+ users — billed annually per enrolled user; volume bands (all seats billed at the band rate the firm's headcount lands in); FLAT on renewal — no renewal discount (course substantially updated each year).
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
| **Next.js** | **15.5.x** (App Router) | Frontend, SSR, API routes (marketing site + firm dashboard + employee training UI) | Current LTS on Cloudflare Workers. v16 ships major breaks (sync APIs removed, Turbopack default, React Compiler stable) — for a greenfield tiny SaaS, lock to 15.5 LTS until 16.x has 2–3 patch releases; revisit at first phase boundary. App Router is mandatory: Server Components let the dashboard fetch firm/employee data without an extra API layer, and route handlers replace the old `pages/api` for Stripe webhooks. Node.js runtime via `nodejs_compat` — do NOT add `export const runtime = 'edge'` anywhere. |
| **React** | **18.3.x** | UI runtime | Pairs with Next.js 15.5; React 19 features (use(), Actions) are available but optional — don't adopt until needed. |
| **TypeScript** | **5.6.x** | Type safety | Non-negotiable for a billing/compliance product. Stripe + Supabase both ship first-class types. |
| **Tailwind CSS** | **4.1.x** | Styling | Fastest path to applying Built Smart by Rob brand colors to a marketing-plus-dashboard product. v4 ships CSS-first config (`@theme` directive) and is dramatically faster — use it. |
| **Cloudflare Workers** | `@opennextjs/cloudflare` (OpenNext adapter) | Hosting + serverless via `@opennextjs/cloudflare`; CF Workers for all automation (cert gen, email, scheduled jobs) | No 26-second timeout concern — Workers have a generous CPU budget (50 ms free, 30 s paid). Cert PDF generation fits in a Worker because `pdf-lib` needs no headless browser. Workers Builds + preview URLs for staging-vs-prod environments. **Required config:** `wrangler.jsonc` with `main: ".open-next/worker.js"`, `assets: { directory: ".open-next/assets", binding: "ASSETS" }`, `compatibility_flags: ["nodejs_compat"]`, `compatibility_date` >= 2024-09-23, `preview_urls: true`; `open-next.config.ts` at project root: `import { defineCloudflareConfig } from "@opennextjs/cloudflare"; export default defineCloudflareConfig();`. **Scripts:** `"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"`, `"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`, `"cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"`. **Local dev:** `next dev` for daily work; `pnpm run preview` runs in workerd — use before deploys/integration tests. **Staging:** Workers Builds connects GitHub repo; enable non-production branch builds + `preview_urls` — each branch gets a stable `<branch>-<worker>.<subdomain>.workers.dev` alias. Unlike Pages, Workers does NOT natively support different bindings/env-vars per preview vs production build — use Wrangler Environments (`[env.staging]`) for env-specific bindings. Do NOT add `export const runtime = 'edge'` anywhere. |
| **Supabase** | **JS client `supabase-js` v2.49+** with **`@supabase/ssr` v0.6+** | Auth + Postgres + Storage | Single integrated provider. RLS handles firm-vs-employee tenancy at DB level. Storage signs cert URLs natively. Stay on free tier during dev; **upgrade to Pro ($25/mo) before launch** — free-tier 500MB RAM + project-pause-after-7-days is incompatible with paid customers. |
| **Postgres** | **15** (Supabase managed) | Source of truth | Schema: `firms`, `firm_members`, `seats`, `enrollments`, `quiz_attempts`, `certificates`. JWT custom claims (`firm_id`, `role`) drive RLS. |
| **Articulate Rise 360** | (current, via Articulate 360 subscription) | Interactive course content — the learning layer | **LOCKED 2026-06-18 (Rob).** Rise 360 replaced Cloudflare Stream as the primary content delivery. Rob authors interactive modules (flip cards, scenarios, click-to-reveal, ungraded knowledge checks) with Katy (attorney co-author). Export as a Rise web package → host on CF R2 or Articulate's hosting → embed via iframe on the training page. Rise reports no scores to the app; all certifiable events live in the custom React quiz. Cloudflare Stream is NOT required at launch — defer unless short video clips are needed within Rise content. |
| **Cloudflare Stream** | (current) | Optional: short video clips embedded within Rise content | NOT the primary delivery mechanism. Defer entirely unless Rob decides to embed video clips within the Rise course. If used, signed URLs still apply (same pattern as before). Do NOT build a CF Stream integration path unless explicitly decided. |
| **Stripe** | **Node SDK `stripe` v17.x**, API version `2025-09-30.acacia` (latest) | Checkout, subscriptions, webhooks, customer portal | Standard SaaS billing. ONE Product + ONE volume-tiered Price (`tiers_mode=volume`); Checkout `quantity` = seats; Stripe auto-computes the per-seat band rate. Customer Portal handles renewals — no custom UI needed. |
| **Cloudflare Workers** (automation) | Workers runtime | All automation: cert PDF generation, email (Resend REST API), renewal reminders, reprint links | Triggered by Supabase Database Webhooks (authenticated POST to a Worker endpoint), app-initiated `fetch()` POST from route handlers (fire-and-forget), or CF Workers Cron Triggers (scheduled jobs). No VPS, no n8n. Secrets managed via `wrangler secret put` or the CF dashboard. |
| **Custom React quiz** | ~150–200 LOC React component | Certification quiz — the certifiable layer, rendered after the Rise content iframe | Employee completes the Rise interactive content, then sees the quiz. Quiz reveal is gated by an explicit "I have completed the training" confirmation step (no postMessage dependency on CF Stream). Score submit → Server Action / Route Handler → `quiz_attempts` insert. Server-side scoring only — client score is never trusted. No H5P. No SCORM LRS. No xAPI. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | `^2.49.0` | Supabase JS client | Always — browser, server, CF Workers. |
| `@supabase/ssr` | `^0.6.0` | Cookie-based SSR auth for Next.js App Router | Required for App Router. Replaces deprecated `@supabase/auth-helpers-nextjs` — do not use auth-helpers. |
| `stripe` (Node) | `^17.0.0` | Stripe API SDK | Webhook signature verification, Checkout Session creation, Customer Portal session creation. |
| `@stripe/stripe-js` | `^5.0.0` | Stripe browser SDK | Loads Stripe.js on the client when redirecting to Checkout. |
| `jose` | `^5.0.0` | Web-standard JWT signing and verification | Use for Cloudflare Stream signed-URL JWTs. **Do NOT use `jsonwebtoken`** — heavier, Node-only assumptions, unnecessary even under nodejs_compat. `jose` works everywhere (browser, Workers, Node). |
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
| **Wrangler CLI** | Local workerd preview + deploy for CF Workers | `pnpm run preview` (via `opennextjs-cloudflare preview`) to run the app in workerd locally; `opennextjs-cloudflare deploy` to ship; secrets via `wrangler secret put <KEY>` or the Worker's Settings in the CF dashboard. Never commit secrets to source. |
| `dotenv-cli` | Env management | `.env.local` for `next dev`; `.dev.vars` for workerd preview. `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDFLARE_STREAM_SIGNING_KEY_ID`, `CLOUDFLARE_STREAM_SIGNING_KEY_PEM` are stored as the Worker's environment variables/secrets (encrypted at rest) — set via `wrangler secret put` or the Worker's Settings in the CF dashboard; never in source code. |
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

### 1. Next.js 15 on Cloudflare Workers (OpenNext adapter) — routing & rendering

- **App Router only.** No Pages Router. The Stripe webhook handler is a Route Handler at `app/api/webhooks/stripe/route.ts`.
- **Rendering strategy by surface:**
- **Next.js 15 caching gotcha:** `fetch` is no longer cached by default. Don't rely on the old default. Set explicit `cache: 'force-cache'` only for static marketing content; everything authenticated stays uncached.
- **Node.js runtime (not Edge):** `@opennextjs/cloudflare` uses Node.js runtime via `nodejs_compat`. Do NOT add `export const runtime = 'edge'` anywhere — it is unsupported and unnecessary with this adapter.
- **Required config files:**
  - `wrangler.jsonc`: `main: ".open-next/worker.js"`, `assets: { directory: ".open-next/assets", binding: "ASSETS" }`, `compatibility_flags: ["nodejs_compat"]`, `compatibility_date` >= 2024-09-23, `preview_urls: true`
  - `open-next.config.ts` at project root: `import { defineCloudflareConfig } from "@opennextjs/cloudflare"; export default defineCloudflareConfig();`
- **Scripts:** `"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"`, `"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`, `"cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"`.
- **Local dev:** Use `next dev` (Node-based, best DX) for daily work. Use `pnpm run preview` to run in workerd before deploys and integration tests — it matches production.
- **Staging + preview URLs:** Workers Builds connects the GitHub repo and builds/deploys on push. Enable non-production branch builds + `preview_urls: true` → each branch gets a stable `<branch>-<worker>.<subdomain>.workers.dev` alias plus per-commit preview URLs posted to PRs. Unlike Pages, Workers does NOT natively support different bindings/env-vars per preview vs production build — use Wrangler Environments (`[env.staging]`) with an appropriate Workers Build config for env-specific bindings/secrets.

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

### 3. Articulate Rise 360 — course content integration (LOCKED 2026-06-18)

The interactive learning content is built in **Articulate Rise 360** by Rob + Katy (attorney co-author). This is the learning layer only — it does NOT report scores to the app.

**How it integrates:**
1. Rob authors the Rise 360 course (flip cards, scenarios, click-to-reveal, knowledge checks — all ungraded)
2. Export from Rise as a **web package** (zip of HTML/JS/CSS)
3. Host the unpacked assets on **Cloudflare R2** as a public or signed static site, OR use Articulate's own hosting (`rise.articulate.com`) — decision deferred until Phase 2 planning
4. The employee training page embeds the Rise content in an `<iframe>` — access to the training page itself is gated by enrollment check (server-side)
5. After the Rise iframe, the **custom React certification quiz** is shown — gated by an explicit employee confirmation ("I have completed the training")
6. Rise reports nothing to the app. All certifiable events (quiz score, identity attestation, timestamp, IP, user-agent) live in the custom quiz layer only

**Do NOT build:**
- xAPI / SCORM / LRS integration — not needed; the custom quiz is the certifiable layer
- Any CF Stream video player integration — defer Cloudflare Stream entirely unless Rob decides to embed video clips within Rise
- H5P anything — not in scope

### 4. Stripe — per-seat volume pricing, webhooks, portal

- ONE Product: `prod_UgzKT3NrGNAvDA` — "AI Staff Compliance Training — Annual Certification" — metadata: `pricing_model=per_seat_volume`, `tax_code=txcd_20060058`
- ONE Price: `price_1ThbLNCzT2268ei9nkadS8kD` — lookup_key `per_seat_annual` — recurring yearly, `billing_scheme=tiered`, `tiers_mode=volume`, tiers: up_to 9 → $35/unit, up_to 24 → $32/unit, inf → $28/unit; `tax_behavior=exclusive`
- **Per-seat volume pricing, flat on renewal — locked 2026-06-12 (Rob).** ONE product, ONE price. Stripe Checkout `quantity` = number of seats purchased; `adjustable_quantity` enabled so the buyer picks seat count in Checkout; Stripe auto-computes the band rate automatically via `tiers_mode=volume`. Seat enforcement: seats owned = subscription `quantity` (no `seat_cap` metadata). Renewal reuses the same single Price ID at the same band rate — no separate renewal price.
- Old test-mode objects archived (active=false, lookup keys released): products `prod_UgyZjCbV9uJdzX` / `prod_UgyZ7rqNgXZYao` / `prod_UgyZ30zgvigsd6`; prices `price_1ThachCzT2268ei9HlR1YivD` / `price_1ThaciCzT2268ei9tooaKk8j` / `price_1ThaciCzT2268ei9MRI94R1i`. Live-mode object creation deferred pending Stripe Tax.
- Use **Stripe Checkout (hosted)**, mode `subscription`. Don't build a card form.
- After payment, Stripe redirects to `/onboarding?session_id={CHECKOUT_SESSION_ID}` where the app waits for the webhook to provision the firm.
- Route: `app/api/webhooks/stripe/route.ts` (runs in the Worker, Node runtime — do NOT add `export const runtime = 'edge'`).
- **Must read the raw request body** for signature verification: use `await req.text()` (not `req.json()`).
- **`constructEvent` works** (Node crypto is available under nodejs_compat); `constructEventAsync` also works and is a fine choice. Both are valid — either is acceptable.
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

### 6. Custom React quiz — the certifiable layer

The quiz is a **custom React component (~150–200 lines)** rendered on the training page **after** the Articulate Rise 360 iframe. It is the only certifiable layer — Rise content is ungraded and reports nothing to the app.

**How it works:**
- Employee completes the Rise interactive content (self-paced, ungraded)
- Employee clicks "I have completed the training" confirmation — this gates quiz reveal (no postMessage dependency)
- Quiz presents randomized multiple-choice questions one at a time, no back button, answers locked on advance
- On submit: identity attestation checkbox required; score computed server-side in `/api/quiz/attempt` against `courses.pass_threshold` (default 80%)
- Pass → `quiz_attempts` row inserted with `passed=true` → Supabase DB webhook → cert generation Worker
- Fail → unlimited retakes, fresh randomized question subset each time

**No fallback to H5P.** No xAPI. No SCORM. No CF Stream postMessage events. The quiz is already built (Phase 1 stub) — Phase 2 replaces the "Mark Pass" button with this real quiz component.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js on Cloudflare Workers (`@opennextjs/cloudflare`) | Next.js on Vercel | Vercel only if CF Workers ship broken on a specific Next.js feature you need. |
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
| `@cloudflare/next-on-pages` | Deprecated — CF officially deprecated this adapter; `@opennextjs/cloudflare` is the official Next.js-on-Cloudflare path | `@opennextjs/cloudflare` on Cloudflare Workers |
| `export const runtime = 'edge'` with `@opennextjs/cloudflare` | Unsupported and unnecessary — the OpenNext adapter uses the Node.js runtime via `nodejs_compat`; adding edge exports will break the build | Omit entirely; Node runtime is the default |
| Next.js 16.x on Cloudflare Workers (today) | Cloudflare Workers Next.js runtime support may trail on new releases; verify 16.x against current CF docs before adopting | Next.js 15.5 LTS until 16.x has been verified on CF Workers production for 2–3 patch cycles |
| `next lint` (legacy wrapper) | Deprecated in 15.5, removed in 16 | Run `eslint` directly with `eslint-config-next` |
| `fetch()` default caching in Next.js 15 | Changed behavior from Next.js 14 — was cached, now is not. Easy to assume old behavior. | Explicit `cache: 'force-cache'` or `next: { revalidate: N }` per request |
| `jsonwebtoken` for Cloudflare Stream signed URLs | Heavier, Node-only assumptions, unnecessary — may load under nodejs_compat but not needed | `jose` (web-standard, works in plain CF Workers and the Next.js Worker alike) |
| PDF generation requiring a headless browser (Puppeteer/Chrome) on edge | No headless Chrome on CF Workers edge | `pdf-lib` (pure JS) in a CF Worker — no native deps, runs without a browser |
| Multiple fixed-price Stripe Prices with `seat_cap` metadata (old 3-tier pattern) | Old pattern — three distinct fixed-price Products/Prices with `seat_cap` metadata. Replaced by per-seat volume pricing: a single volume-tiered Price where `quantity` = seats and Stripe computes the band rate automatically. | ONE Product `prod_UgzKT3NrGNAvDA` + ONE volume-tiered Price `price_1ThbLNCzT2268ei9nkadS8kD` (lookup_key `per_seat_annual`, `tiers_mode=volume`); Checkout `quantity` = seats; seat enforcement = subscription `quantity` |
| Storing `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in client code | Total compromise — these keys can do anything on your account | Worker environment variables/secrets (encrypted at rest); set via `wrangler secret put` or the Worker's CF dashboard Settings; never in source code |
| Free-tier Supabase in production | Pauses after 7 days inactivity, 500 MB RAM, no point-in-time recovery | Pro tier ($25/mo) before launch |
| Old Supabase API keys for new projects | Will be retired end of 2026 | New `sb_publishable_*` + `sb_secret_*` key format |

## Stack Patterns by Variant

- All variants use the single Price `per_seat_annual` (lookup_key) with Stripe Checkout `quantity` = the firm's seat count; Stripe computes the band rate automatically (`tiers_mode=volume`). No per-tier product selection.
- No special pattern — this is the default flow for all seat counts.
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
| `stripe@17` (Node) | Stripe API version `2025-09-30.acacia` | SDK ships with a default API version pinned; pass `apiVersion` explicitly to lock it. Both `constructEvent` (sync, Node crypto) and `constructEventAsync` (Web Crypto) work under nodejs_compat — either is acceptable. |
| `@opennextjs/cloudflare` | `next@15.5` | nodejs_compat; `compatibility_date` >= 2024-09-23; no `export const runtime = 'edge'` exports anywhere. `wrangler@4.21+` for preview URL aliases. |
| `jose` | CF Workers / Node | Web-standard JWT library; no native deps. Use in place of `jsonwebtoken` everywhere in this stack. |
| `pdf-lib@^1.17` | CF Workers (Node runtime) | Pure JS, no native deps — runs in a CF Worker without headless Chrome. |
| `tailwindcss@^4` | PostCSS via `@tailwindcss/postcss` plugin | v4 dropped the v3 plugin format. Migration is real but small. |

## Confidence Assessment

| Component | Confidence | Reason |
|-----------|------------|--------|
| Next.js 15.5 on Cloudflare Workers (OpenNext adapter) | HIGH | Cloudflare-official adapter, verified against current docs 2026-06-12. |
| Supabase Auth + RLS pattern | HIGH | Standard multi-tenant pattern documented by Supabase itself; pattern matches firm/employee model exactly. |
| Cloudflare Stream signed URLs | HIGH | Direct match to product needs (signed video access tied to enrollment); pricing verified for our volume. |
| Custom React quiz | HIGH | Small surface (~150–200 LOC), no vendor lock, direct Supabase score reporting via Server Action. Fallback (H5P Path A) is documented if needed. |
| Stripe pattern (single volume-tiered Price, `tiers_mode=volume`) | HIGH | Per-seat volume pricing with one Product + one Price; Checkout `quantity` = seats; Customer Portal handles renewal. |
| `pdf-lib` in CF Worker | MEDIUM-HIGH | Pure JS, no browser — runs cleanly on Workers. Layout fidelity for the cert template is the one risk; external PDF API is the documented fallback. |
| Resend over Postmark | MEDIUM | Functionally correct for this scale; Postmark is the safer pick for absolute deliverability. Decide before launch based on operator's risk tolerance on missed emails. |
| Tailwind v4 | MEDIUM-HIGH | v4 is stable but newer than v3; one-time migration cost for any v3-era components copy-pasted from elsewhere. |

## Sources

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15) — HIGH
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — HIGH (informs the "stay on 15.5" recommendation)
- [Next.js on Cloudflare Workers — official guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) — HIGH
- [OpenNext Cloudflare adapter docs](https://opennext.js.org/cloudflare) — HIGH
- [Migrate from CF Pages to CF Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) — HIGH (Pages→Workers, preview env guidance)
- [CF Workers non-production branch builds](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/) — HIGH
- [CF Workers preview URLs](https://developers.cloudflare.com/workers/configuration/previews/) — HIGH
- [`@cloudflare/next-on-pages` GitHub (deprecation notice)](https://github.com/cloudflare/next-on-pages) — HIGH
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
- [Stripe webhook signature verification](https://docs.stripe.com/webhooks/signature-verification?lang=node) — HIGH (both `constructEvent` and `constructEventAsync` work under nodejs_compat)
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
  copy instead). Then:
  1. Read `session_handoff.md` at the repo root for the high-level index and step status.
  2. Read **every file** in `.planning/sessions/` (sorted by filename, oldest first) so you have the
     full history of what was built, decided, and left open — not just the most recent session.
  3. Surface a concise recap to the user: who worked on what, across all sessions, and the clear next step.
  Do this once per session, not every turn. Rob and Max may each be unaware of what the other did, so
  the full session history is the only reliable source of truth.
- This file is the cross-person sync point — it complements (does not replace) GSD's `.planning/` state.
