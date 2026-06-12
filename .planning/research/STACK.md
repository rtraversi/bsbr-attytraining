# Stack Research

> ⚠️ **STACK SUPERSEDED (2026-06-11):** This document was researched for the original Netlify + n8n + H5P stack. The locked stack is now Cloudflare Workers (`@opennextjs/cloudflare`) + CF Workers + custom React quiz — see `.planning/STATE.md` Locked Decisions and `CLAUDE.md`. Netlify/n8n/H5P-specific guidance below is historical; domain findings (Stripe, Supabase RLS, Cloudflare Stream, compliance) remain valid.

**Domain:** Tiny SaaS — AI compliance certification platform for solo/small-firm attorneys (1–15 staff), self-serve, $199–$499/year
**Researched:** 2026-05-19
**Confidence:** HIGH (all major versions verified against current official docs; H5P-vs-Rise recommendation has explicit rationale)

This document validates and refines the operator's pre-chosen stack. **No alternatives are proposed to chosen tools unless a critical flaw exists.** The one decision being closed out is H5P vs Articulate Rise — verdict at bottom of section 6.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | **15.5.x** (App Router) | Frontend, SSR, API routes (marketing site + firm dashboard + employee training UI) | Current LTS on Netlify. v16 ships major breaks (sync APIs removed, Turbopack default, React Compiler stable) — for a greenfield tiny SaaS, lock to 15.5 LTS until 16.x has 2–3 patch releases; revisit at first phase boundary. App Router is mandatory: Server Components let the dashboard fetch firm/employee data without an extra API layer, and route handlers replace the old `pages/api` for Stripe webhooks. |
| **React** | **18.3.x** | UI runtime | Pairs with Next.js 15.5; React 19 features (use(), Actions) are available but optional — don't adopt until needed. |
| **TypeScript** | **5.6.x** | Type safety | Non-negotiable for a billing/compliance product. Stripe + Supabase both ship first-class types. |
| **Tailwind CSS** | **4.1.x** | Styling | Fastest path to applying Built Smart by Rob brand colors to a marketing-plus-dashboard product. v4 ships CSS-first config (`@theme` directive) and is dramatically faster — use it. |
| **Netlify** | PRO plan (active) | Hosting, serverless functions, ISR, scheduled functions | Operator pays for it. 26-second function timeout (enough for Stripe webhooks + Supabase calls; **not enough for PDF generation — that's why n8n handles certs**). Branch deploys ideal for staging-vs-prod environments. |
| **Supabase** | **JS client `supabase-js` v2.49+** with **`@supabase/ssr` v0.6+** | Auth + Postgres + Storage | Single integrated provider. RLS handles firm-vs-employee tenancy at DB level. Storage signs cert URLs natively. Stay on free tier during dev; **upgrade to Pro ($25/mo) before launch** — free-tier 500MB RAM + project-pause-after-7-days is incompatible with paid customers. |
| **Postgres** | **15** (Supabase managed) | Source of truth | Schema: `firms`, `firm_members`, `seats`, `enrollments`, `quiz_attempts`, `certificates`. JWT custom claims (`firm_id`, `role`) drive RLS. |
| **Cloudflare Stream** | (current) | Video hosting, signed URLs, HLS delivery | Paid add-on. Pricing: $5 per 1,000 min stored, $1 per 1,000 min delivered. Ingress + encoding free. Pro/Business CF plan includes 100 min storage + 10,000 min delivery monthly. For one 30-min course × thousands of plays: delivery cost dominates. At 30 min × 100 employees × 5 firms/mo = 15,000 min/mo = ~$15/mo — well within tolerance. |
| **Stripe** | **Node SDK `stripe` v17.x**, API version `2025-09-30.acacia` (latest) | Checkout, subscriptions, webhooks, customer portal | Standard SaaS billing. Three tiered Prices, one Product per tier or one Product with three Prices. Customer Portal handles renewals — no custom UI needed. |
| **n8n** | self-hosted **v1.7x+** (already operational at `n8n.katychavezlaw.com`) | All automation (cert PDF generation, emails, reminders) | First-choice automation runtime per project constraint. Triggered by Supabase Database Webhooks or by Netlify Function HTTP POSTs after Stripe webhooks. |
| **H5P** (h5p-standalone, MIT license) | **`h5p-standalone` v3.8+** | Interactive video quiz layer | **Chosen over Articulate Rise** — see §6 below. MIT-licensed, embeds via `<iframe>` or direct DOM mount, emits xAPI events that the parent Next.js page captures via `H5P.externalDispatcher.on('xAPI', …)`. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | `^2.49.0` | Supabase JS client | Always — browser, server, n8n. |
| `@supabase/ssr` | `^0.6.0` | Cookie-based SSR auth for Next.js App Router | Required for App Router. Replaces deprecated `@supabase/auth-helpers-nextjs` — do not use auth-helpers. |
| `stripe` (Node) | `^17.0.0` | Stripe API SDK | Webhook signature verification, Checkout Session creation, Customer Portal session creation. |
| `@stripe/stripe-js` | `^5.0.0` | Stripe browser SDK | Loads Stripe.js on the client when redirecting to Checkout. |
| `h5p-standalone` | `^3.8.0` | Render H5P content packages client-side without an H5P server | The `.h5p` package is unzipped to Supabase Storage or served from `/public/h5p/`; the library mounts it into a div and exposes `H5P.externalDispatcher` for event capture. **MIT license.** |
| `hls.js` | `^1.5.0` | HLS playback in browsers that don't support it natively (Chrome, Firefox, Edge) | If using a custom player or H5P-with-MP4-fallback. The Cloudflare Stream native player (`<iframe>`) doesn't need this, but custom embeds do. |
| `zod` | `^3.23.0` | Runtime schema validation | Validate Stripe webhook payloads, H5P xAPI events, user-submitted firm metadata. |
| `react-email` + `@react-email/render` | `^3.0.0` / `^1.0.0` | Type-safe transactional email templates | Render to HTML for n8n to send via Resend/Postmark — or render server-side in Next.js and pass HTML to n8n. |
| `pdf-lib` *(fallback only)* | `^1.17.0` | PDF manipulation in JS (e.g., merge a generated cert with a template) | Only if n8n's PDF nodes prove insufficient. Primary plan: n8n + Puppeteer node renders HTML→PDF. |
| `date-fns` | `^4.1.0` | Date math for 12-month cert validity, renewal reminders | Lightweight alternative to Moment/Day.js. Already de facto standard. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `pnpm` | Package manager | Faster than npm, deterministic, lower disk. Configure `engines.pnpm` in `package.json`. |
| `eslint` + `eslint-config-next` | Linting | Next.js 15.5 still ships `next lint`; v16 deprecates it in favor of running eslint directly — start with eslint directly to avoid migration later. |
| `prettier` | Formatting | Standard. Single config at repo root. |
| **Supabase CLI** | Local DB, migrations, type generation | `supabase gen types typescript --linked > types/supabase.ts`. Run on every schema change. Crucial — never hand-write types for the DB. |
| `dotenv-cli` | Env management | Or just `.env.local` for Next.js. Keep `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDFLARE_STREAM_SIGNING_KEY_ID`, `CLOUDFLARE_STREAM_SIGNING_KEY_PEM` server-side only. |
| **Stripe CLI** | Local webhook testing | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — non-negotiable for webhook dev. |
| Playwright | E2E tests | Test the critical revenue path: Stripe Checkout → firm provisioning → invite → quiz pass → cert email. One smoke test for this is more valuable than 100 unit tests. |

---

## Installation

```bash
# Core
pnpm add next@15.5 react@18.3 react-dom@18.3
pnpm add @supabase/supabase-js@^2.49 @supabase/ssr@^0.6
pnpm add stripe@^17 @stripe/stripe-js@^5
pnpm add h5p-standalone@^3.8 hls.js@^1.5
pnpm add zod@^3.23 date-fns@^4

# Email templating
pnpm add react-email @react-email/render @react-email/components

# Styling
pnpm add -D tailwindcss@^4 @tailwindcss/postcss postcss

# Dev tooling
pnpm add -D typescript@^5.6 @types/node @types/react @types/react-dom
pnpm add -D eslint eslint-config-next@15.5 prettier prettier-plugin-tailwindcss
pnpm add -D @playwright/test

# Optional fallback
pnpm add pdf-lib@^1.17  # only if n8n PDF path fails
```

```bash
# Global CLIs (one-time)
pnpm add -g supabase
brew install stripe/stripe-cli/stripe   # or: scoop install stripe   on Windows
```

---

## Integration Patterns (the load-bearing details)

### 1. Next.js 15 on Netlify PRO — routing & rendering split

**Verified against:** [Next.js on Netlify docs](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Netlify pricing 2026](https://www.netlify.com/pricing/), [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15).

- **App Router only.** No Pages Router. The Stripe webhook handler is a Route Handler at `app/api/webhooks/stripe/route.ts`.
- **Rendering strategy by surface:**
  - Marketing pages (`/`, `/pricing`, `/about`) → **Static + ISR** with `revalidate: 3600`. Re-generate hourly so copy edits ship without a redeploy.
  - Auth pages (`/login`, `/invite/[token]`) → **Dynamic** (`export const dynamic = 'force-dynamic'`). Required by `@supabase/ssr` to read cookies.
  - Firm dashboard (`/dashboard/*`) → **Dynamic**, Server Components fetch via Supabase server client with RLS-scoped queries.
  - Employee training player (`/train/[enrollmentId]`) → **Dynamic**, requests a fresh Cloudflare Stream signed token on every load.
- **Next.js 15 caching gotcha:** `fetch` is no longer cached by default. Don't rely on the old default. Set explicit `cache: 'force-cache'` only for static marketing content; everything authenticated stays uncached.
- **Netlify PRO compute:** 26 s function timeout — fine for Stripe webhook handling, but **not** for cert PDF rendering. That's why the cert pipeline lives in n8n (no timeout there).
- **Netlify lag warning:** Netlify's Next.js runtime occasionally trails Vercel by weeks on bleeding-edge features. Stay on 15.5 LTS; don't adopt 16.x on Netlify until they explicitly publish 16.x support in their docs.
- **Branch deploys:** Use a `staging` branch with its own Netlify deploy context → its own Supabase project (free tier #2) → Stripe test mode. Production branch → paid Supabase + Stripe live mode.

### 2. Supabase — Auth, RLS, Storage

**Verified against:** [Supabase Next.js SSR setup](https://supabase.com/docs/guides/auth/server-side/nextjs), [@supabase/ssr docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Multi-tenant RLS patterns](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/).

**Auth flows:**
- **Firm admin (purchaser):** email/password set during post-Stripe-checkout onboarding. Magic link as a "forgot password" fallback.
- **Employees:** invite link → set password on first visit. Magic link offered as a secondary login. Do NOT require employees to "sign up" — they are provisioned by the firm admin's seat purchase.

**Client setup (the modern pattern):**
- `lib/supabase/client.ts` exports `createBrowserClient()` — used in Client Components only.
- `lib/supabase/server.ts` exports `createServerClient()` — used in Server Components, Route Handlers, Server Actions. Reads cookies via `cookies()` from `next/headers`.
- `middleware.ts` at repo root refreshes the auth token on every request. **This is mandatory** — without it, sessions expire mid-flow.
- Use `supabase.auth.getClaims()` (not `getSession()`) for authorization decisions in server code. `getSession()` returns un-verified data; `getClaims()` validates the JWT.
- **Do NOT use `@supabase/auth-helpers-nextjs`** — deprecated. Anyone copy-pasting older tutorials will hit this.

**Multi-tenant RLS pattern (firms → employees):**

```sql
-- Custom claim 'firm_id' set on JWT via Auth Hook
-- All tenant tables get a firm_id column
create table firm_members (
  user_id uuid references auth.users primary key,
  firm_id uuid references firms not null,
  role text check (role in ('admin','employee')) not null
);

-- RLS policy template (apply to enrollments, quiz_attempts, certificates)
create policy "firm members read own firm data"
  on enrollments for select
  using (firm_id = (auth.jwt() -> 'app_metadata' ->> 'firm_id')::uuid);

create policy "firm admins write own firm data"
  on enrollments for insert with check (
    firm_id = (auth.jwt() -> 'app_metadata' ->> 'firm_id')::uuid
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

- `firm_id` and `role` are stamped into `app_metadata` (NOT `user_metadata`, which the user can edit) via an Auth Hook or a server-side `auth.admin.updateUserById()` call during invite acceptance.
- Index every `firm_id` column. RLS without indexes is the #1 Supabase performance pitfall.

**Storage for certificates:**
- Bucket: `certificates`, **private** (not public).
- Path convention: `firms/{firm_id}/employees/{user_id}/{enrollment_id}.pdf`.
- Generate signed download URLs server-side: `supabase.storage.from('certificates').createSignedUrl(path, 60 * 60 * 24 * 7)` — 7-day URL, regenerated when the dashboard renders.
- RLS-equivalent storage policy: only firm members can list/read their firm's prefix.

**Free-tier reality check:**
- Two active projects max — staging + prod = at the limit. **No room for a third (e.g., a sandbox).**
- Free projects pause after 7 days inactivity. Fine for dev, fatal for prod.
- **Action:** upgrade to Pro ($25/mo) before going live. Budget item.

**Key migration coming:** Anon and service_role keys remain valid through end of 2026, but Supabase recommends the new publishable (`sb_publishable_*`) and secret (`sb_secret_*`) key format. New projects should adopt the new format immediately to avoid a migration later.

### 3. Cloudflare Stream — signed URLs & embedding

**Verified against:** [Securing your Stream](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/), [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing/), [Generating signed tokens in Node](https://community.cloudflare.com/t/generating-signed-tokens-in-node/328114).

**Architecture:**
1. Enable signed URLs for the course video: PATCH `/accounts/{accountId}/stream/{videoId}` with `{ requireSignedURLs: true }`.
2. Create a signing key once: POST `/accounts/{accountId}/stream/keys` → returns `{ id, pem, jwk }`. **Store the PEM in Netlify env vars** as `CLOUDFLARE_STREAM_KEY_PEM` and the key id as `CLOUDFLARE_STREAM_KEY_ID`. PEM is shown once — store it immediately.
3. On every `/train/[enrollmentId]` load, sign a JWT server-side with claims `{ sub: videoId, kid: keyId, exp: now + 3600, accessRules: [...] }`. Use the `jsonwebtoken` library or `crypto.createSign('RSA-SHA256')` directly. No API call to Cloudflare per request → no rate limit.
4. Pass the signed token to the client. Embed:
   ```tsx
   <iframe
     src={`https://customer-{subdomain}.cloudflarestream.com/${signedToken}/iframe`}
     allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
     allowFullScreen
   />
   ```
5. **Access rules in the JWT** can restrict by IP or country, but for this product we just rely on short `exp` (1 hour) plus the JWT being tied to a specific videoId.

**H5P + Cloudflare Stream — the integration that decides the architecture:**

Native H5P Interactive Video supports YouTube/Vimeo/Panopto sources directly but **does not have a Cloudflare Stream adapter** (verified via [H5P forum](https://h5p.org/node/1264738)). Two viable paths:

- **Path A (chosen):** Don't use H5P Interactive Video. Instead, embed the Cloudflare Stream iframe in the page, and place H5P **Question Set** / **Single Choice Set** content blocks below or alongside it. Use the Stream player's `postMessage` events to drive UI logic (e.g., reveal the quiz when video reaches 95%). Simpler, no custom H5P plugin, full Cloudflare Stream features (DRM-lite via signed URLs, analytics).
- **Path B:** Use H5P with a direct MP4 URL from the Cloudflare Stream Downloads API. This gives you timestamp-locked interactions in-video but: (a) signed MP4 URLs are awkward (one URL per download enable, separate API), (b) you lose adaptive bitrate streaming, (c) bandwidth costs may go up. **Avoid.**

**Recommendation:** Path A. Video plays in the Cloudflare iframe; quizzes are separate H5P content rendered with `h5p-standalone` after the video. Score-gate logic lives in the Next.js page, reading H5P xAPI events.

### 4. Stripe — tiered seat pricing, webhooks, portal

**Verified against:** [Stripe webhooks docs](https://docs.stripe.com/webhooks), [Customer Portal config](https://docs.stripe.com/customer-management/configure-portal), [Pricing models](https://docs.stripe.com/products-prices/pricing-models).

**Product/Price model — the simplest workable shape:**

One Stripe Product per tier (three Products), each with one annual Price and one "renewal" Price. Why three Products not one with three Prices? Because each tier has a different renewal Price (~60%), and grouping per-tier keeps the math obvious.

- `prod_basic`: "Compliance Training — Up to 5 Seats" → Prices: `price_basic_first_$199`, `price_basic_renewal_$119`
- `prod_standard`: "Compliance Training — 6–15 Seats" → Prices: `price_standard_first_$349`, `price_standard_renewal_$209`
- `prod_pro`: "Compliance Training — 16+ Seats" → Prices: `price_pro_first_$499`, `price_pro_renewal_$299`

Seat count is **metadata on the subscription** (`{ seat_tier: 'basic', seat_count: 5 }`), not a Stripe per-seat quantity. The Next.js app enforces seat caps via `firm_members` count vs. metadata.

**Checkout flow:**
- Use **Stripe Checkout (hosted)**, mode `subscription`. Don't build a card form.
- After payment, Stripe redirects to `/onboarding?session_id={CHECKOUT_SESSION_ID}` where the app waits for the webhook to provision the firm.

**Webhook handler — the critical Next.js detail:**
- Route: `app/api/webhooks/stripe/route.ts`.
- **Must read the raw request body** for signature verification:
  ```ts
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  export async function POST(req: Request) {
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature')!;
    const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    // ...handle event
  }
  ```
- Critical events to subscribe to:
  - `checkout.session.completed` → create the firm, set seat metadata, generate the admin invite token, hand off to n8n for welcome email.
  - `customer.subscription.updated` → seat tier changed; update firm.
  - `customer.subscription.deleted` → mark firm as inactive; revoke employee access at expiry.
  - `invoice.payment_succeeded` (on renewal) → extend cert validity by 12 months for active employees.
  - `invoice.payment_failed` → notify firm admin; grace period before downgrade.

**Customer Portal:**
- Configure once in the Stripe Dashboard: enable subscription cancellation, payment method updates, invoice history. Disable plan upgrades unless you want to handle mid-cycle proration logic (recommend: disable, link to a "contact us" page for upgrades initially).
- Server route `app/api/portal/route.ts` creates a portal session: `stripe.billingPortal.sessions.create({ customer, return_url })`.

**Webhook delivery to Netlify functions** is well-trodden — Netlify PRO's 26 s timeout is plenty since the handler should write to Supabase and trigger n8n, then return 200 in under a second. The slow work (PDF, email) is offloaded to n8n.

### 5. n8n — automation runtime

**Verified against:** [n8n Supabase integrations](https://n8n.io/integrations/supabase/), [n8n-nodes-puppeteer](https://github.com/drudge/n8n-nodes-puppeteer), [PDF generation workflow template](https://n8n.io/workflows/12554-generate-pdf-documents-from-html-with-pdf-generator-api-gmail-and-supabase/).

**Why n8n owns the slow async work:** Netlify function timeout is 26 s. Headless-Chrome PDF cold starts can blow past that. n8n on a VPS has no timeout, persistent workers, and built-in retry. This is the right boundary.

**Trigger patterns:**

| Event source | Trigger method | When to use |
|--------------|---------------|-------------|
| Supabase row insert/update | **Database Webhook** (Supabase → n8n HTTP webhook node) | Reactive: when a `quiz_attempts.status` flips to 'passed', kick off cert generation. |
| Next.js route handler | HTTP POST from `fetch()` to n8n webhook | Initiated from app code: after Stripe webhook completes, POST to n8n to send welcome email. |
| Scheduled / cron | n8n **Schedule Trigger** | Daily job: scan certificates for expiry within 60 days → send reminder emails. |
| Email link click | n8n **Webhook node** (public URL) | "Send me a reprint" link → n8n re-signs the Storage URL and emails it. |

**The certificate generation pipeline (concrete):**

1. Trigger: Supabase Database Webhook on `enrollments` UPDATE where `status = 'passed'`.
2. n8n **Set** node: shape data into `{ firmName, employeeName, completionDate, score, certId }`.
3. n8n **HTML Template** node (or HTTP fetch from Next.js `/api/cert/html` if you want React Email rendering): produce the cert HTML.
4. n8n **Puppeteer** node ([n8n-nodes-puppeteer](https://github.com/drudge/n8n-nodes-puppeteer)): `setContent(html)` → `pdf({ format: 'Letter' })`.
5. n8n **Supabase** node: upload to `certificates/firms/{firmId}/employees/{userId}/{enrollmentId}.pdf`.
6. n8n **Supabase** node: insert a row into `certificates` table linking the file.
7. n8n **HTTP** or **Resend** node: email the employee + CC firm admin with a signed download link.

**Email node choice:** Resend has an official n8n community node and matches the React Email rendering on the app side. Postmark is more reliable for absolute deliverability but pricier. **Recommend Resend** for $0.40/1k emails, with React Email templates rendered server-side in Next.js and passed as HTML to n8n.

**Self-hosted n8n hardening:**
- Use `N8N_ENCRYPTION_KEY` (32-byte random) — n8n encrypts credentials at rest with this. Rotate carefully (re-saving credentials).
- Restrict the n8n webhook URL to known-source IPs at the reverse proxy (Cloudflare in front of the VPS), or use a shared-secret header validated in each workflow.
- Back up the n8n SQLite/Postgres database — losing it means losing every credential and workflow.

### 6. H5P vs Articulate Rise — the decision

**Verdict: Choose H5P (via `h5p-standalone`, MIT-licensed). Do not choose Articulate Rise.**

**Confidence:** HIGH.

| Dimension | H5P (h5p-standalone) | Articulate Rise 360 |
|-----------|----------------------|---------------------|
| License | **MIT** — free commercial use, no copyleft | Proprietary subscription |
| Cost | $0 | **$1,449–$1,749 per author/year** ([Articulate pricing](https://www.articulate.com/360/pricing/)) |
| Self-host published content | Yes — bundle `.h5p` file with the Next.js app; render with `h5p-standalone` | Yes — export to "Web" produces a static HTML/JS folder you can host anywhere |
| Authoring UX | Adequate; Lumi desktop app is free; web authoring requires h5p.com or a hosted H5P platform | Excellent, polished WYSIWYG — but only available inside the Articulate 360 subscription |
| Cloudflare Stream integration | No native adapter; works via Path A (CF iframe + separate H5P quiz blocks) | No native adapter; embed CF iframe as a multimedia block; quiz is a separate Rise block |
| Score reporting back to host app | **xAPI events via `H5P.externalDispatcher`** — clean JS API for parent page to capture every interaction | xAPI **only when exported as an LMS package**; tracks via URL launch parameters (`endpoint`, `auth`, `actor`) hitting an LRS; OR fragile `window.parent.postMessage` hacks ([forum thread](https://community.articulate.com/discussions/discuss/postmessage-to-iframe-parent-not-received-cross-domain-scorm/278321)) — Articulate doesn't officially support cross-window postMessage for score reporting |
| Standards | xAPI native; SCORM via plugins | xAPI/SCORM/AICC via export options |
| Maintenance | Open source; you control upgrades | Subscription lapses → can't edit existing courses |
| Fit for one canonical course | Excellent — one `.h5p` file in repo, version-controlled | OK — but you pay $1,449/yr to maintain edit access to that one course |

**Why this is decisive for THIS product:**

1. **Margin math:** Selling at $199–$499/year. Articulate's $1,449/year per author would eat 3–7 customers' annual revenue **just to keep editing the course.** H5P costs zero.
2. **Score integration:** The product needs to pass/fail-gate on quiz score, then trigger n8n cert generation. H5P's `xAPI` event dispatcher on `window` is a one-liner integration:
   ```tsx
   useEffect(() => {
     window.H5P?.externalDispatcher?.on('xAPI', (event: any) => {
       const stmt = event.data.statement;
       if (stmt.verb.id === 'http://adlnet.gov/expapi/verbs/completed') {
         const score = stmt.result?.score?.scaled; // 0..1
         if (score >= 0.8) markPassed(enrollmentId, score);
       }
     });
   }, []);
   ```
   With Rise, the only first-class path is to host the Rise export and configure xAPI launch params to point at a custom LRS — that's an LRS you'd then have to operate, or pipe into n8n via webhook from a hosted LRS like Grassblade or Learning Locker. Substantially more infrastructure. The postMessage workaround is community-hacked and unsupported.
3. **Curriculum-still-being-designed reality:** Operator will iterate on quiz content. With H5P, the `.h5p` file is editable in the free Lumi desktop app and committed to git. With Rise, editing requires an active $1,449 subscription forever.
4. **Embedding into Next.js:** `h5p-standalone` is one `npm install` and a `new H5P({ ... })` constructor call. Rise needs `<iframe src="/rise/course/index.html">` with the entire Rise export served statically — works but you give up React-driven UI for the quiz frame.

**When Rise would be the right choice (none of these apply here):** You have a content team that already uses Articulate, you need polished authoring for non-technical SMEs, you have $1.4k+/yr in the budget per author, you're shipping multiple courses, and your platform pays for LMS integration overhead.

**Implementation note for H5P path:**

- Author the course in **Lumi Desktop** (free, MIT) → outputs `.h5p` file → commit to repo at `content/aba-rule-5.3.h5p` → extract on build into `public/h5p/aba-rule-5.3/` → render with `h5p-standalone`.
- The course is structured as: a Cloudflare Stream `<iframe>` (the lecture) above an H5P **Question Set** content type (the quiz). The quiz appears below the video; score events fire on submission.
- For v1, don't try to do in-video timestamp-locked questions. Watch the video → take the quiz → get the cert. Simpler product, fewer moving parts.

---

## Alternatives Considered

The operator has chosen the tools. These are the *alternatives that were considered and rejected*, with explicit conditions under which the rejected option would be right.

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js on Netlify PRO | Next.js on Vercel | Only if Netlify ships broken on a specific Next.js feature you need; Vercel is faster on the bleeding edge but operator already pays for Netlify and doesn't need cutting-edge features. |
| Supabase | Auth0 + Neon + S3 | Multi-region compliance requirements, >100k users, or need for SOC2-certified auth provider. None apply at this scale. |
| Cloudflare Stream | Mux | Mux has superior analytics and slightly better API ergonomics, but at higher cost. Cloudflare is fine for this volume. |
| Cloudflare Stream | YouTube unlisted | Free, but: no DRM, no signed URLs, ads risk, brand dilution, no analytics. Unacceptable for paid product. |
| Stripe | Lemon Squeezy / Paddle | Merchant-of-record services that handle tax. Worth revisiting **post-launch** if VAT/sales tax across states becomes painful. Stripe + manual tax filing is fine at v1 scale. |
| n8n self-hosted | Make / Zapier | Explicitly out of scope per project constraint. n8n self-hosted is already running. |
| H5P (h5p-standalone) | Articulate Rise 360 | See §6 above — only if you have a content team that already uses Articulate and the $1,449/yr cost is acceptable. Not the case here. |
| H5P (h5p-standalone) | Custom React quiz component | Tempting and might be right if quiz interactions are extremely simple. Loses xAPI standard, but for a single multiple-choice quiz it'd be ~200 LOC. **Re-evaluate at the quiz-design phase** — if the quiz is 5 multiple-choice questions, building it in React may beat the H5P toolchain. |
| Resend (email) | Postmark | When a single missed password-reset email would be a P0 incident. For onboarding + cert delivery + reminders at this scale, Resend is fine and cheaper. |
| Puppeteer in n8n (PDF) | PDF Generator API / DocRaptor / Carbone | If Puppeteer cold starts or layout fidelity becomes painful. Both are reasonable external services with n8n nodes. Start with Puppeteer; switch if it gets flaky. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-nextjs` | Deprecated. Bug fixes have stopped. Many copy-pasted tutorials still reference it. | `@supabase/ssr` v0.6+ |
| Supabase `getSession()` for authorization | Returns unverified data from cookies — can be spoofed in some scenarios | `supabase.auth.getClaims()` (validates JWT) for any "can this user do X" check |
| `user_metadata` for `firm_id` or `role` | The user can edit their own `user_metadata` via the client SDK — instant privilege escalation | `app_metadata` (read-only from the client; set by service-role admin calls) |
| Next.js Pages Router | App Router is the path forward; mixing both for a greenfield project creates support drag | App Router exclusively |
| Next.js 16.x on Netlify (today) | Netlify's Next.js runtime trails Vercel on new releases; 16.x stability there is unverified | Next.js 15.5 LTS until 16.x has been on Netlify production for 2–3 patch cycles |
| `next lint` (legacy wrapper) | Deprecated in 15.5, removed in 16 | Run `eslint` directly with `eslint-config-next` |
| `fetch()` default caching in Next.js 15 | Changed behavior from Next.js 14 — was cached, now is not. Easy to assume old behavior. | Explicit `cache: 'force-cache'` or `next: { revalidate: N }` per request |
| Articulate Rise `postMessage` for score reporting | Unsupported by Articulate; community-hacked; cross-domain reliability issues | If you must use Rise, use the official xAPI export + LRS path |
| H5P **Interactive Video** content type with Cloudflare Stream | No native CF Stream adapter exists; the H5P Interactive Video player can't programmatically control a Stream iframe | Cloudflare Stream iframe + separate H5P Question Set below it |
| `@lumieducation/h5p-server` (full server library) | GPLv3 license — would force open-sourcing the entire SaaS | `h5p-standalone` (MIT) for rendering published content; author content in free Lumi Desktop app |
| Stripe per-seat `quantity` for tier pricing | Tiers here are bands (5, 15, 16+), not strict per-seat — using `quantity` invites accidental proration math | Three distinct Prices, seat cap as subscription metadata |
| Storing `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in client code | Total compromise — these keys can do anything on your account | Server-side only (Netlify env vars, `process.env.*` in route handlers / server components) |
| Running PDF generation inside Netlify functions | 26 s timeout + cold start = unreliable for headless Chrome | n8n on VPS — no timeout, persistent worker |
| Free-tier Supabase in production | Pauses after 7 days inactivity, 500 MB RAM, no point-in-time recovery | Pro tier ($25/mo) before launch |
| Old Supabase API keys for new projects | Will be retired end of 2026 | New `sb_publishable_*` + `sb_secret_*` key format |

---

## Stack Patterns by Variant

**If a firm has only 1–5 employees (most common):**
- Use `prod_basic` ($199). Seat metadata `{ seat_count: 5 }`. Enforce at invite time.
- No special pattern — this is the default flow.

**If a firm has 6–15 employees:**
- Use `prod_standard` ($349). Same flow.

**If a firm wants to add seats mid-cycle:**
- Out of v1 scope. Customer Portal disables plan changes initially. Operator handles manually for v1. Add proration logic if it becomes a pattern.

**If a firm fails payment on renewal:**
- Stripe Smart Retries handles retries. After final failure, `invoice.payment_failed` webhook → mark firm as `payment_failed`, employees lose access to *new* enrollments but keep access to existing certs (immutable record). Email firm admin with payment recovery link.

**If a video gets longer (say a 60-min course in v2):**
- Cloudflare Stream cost scales linearly with delivered minutes. At ~$1 per 1,000 min delivered, a 60-min video × 1,000 plays = 60,000 min = $60/mo. Still fine.
- H5P quiz pacing may want in-video interaction points — at that scale, reconsider Path B (direct MP4 + H5P Interactive Video) or build a custom React video player on hls.js.

**If launching internationally (post-v1):**
- Stripe handles multi-currency natively but tax compliance is on you. Switch to Lemon Squeezy or Paddle (merchant-of-record) before international launch.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@15.5` | `react@18.3`, `react-dom@18.3` | React 19 works with Next.js 15.5 but optional features only. Don't adopt until needed. |
| `next@15.5` | `eslint-config-next@15.5` | Pin to the same minor. |
| `@supabase/ssr@^0.6` | `@supabase/supabase-js@^2.49` | Always upgrade both together; the SSR package depends on supabase-js types. |
| `@supabase/ssr@^0.6` | `next@15.5` App Router | Requires `cookies()` from `next/headers` — App Router only. Will not work with Pages Router. |
| `stripe@17` (Node) | Stripe API version `2025-09-30.acacia` | SDK ships with a default API version pinned; pass `apiVersion` explicitly to lock it. |
| `h5p-standalone@^3.8` | Modern browsers (ES2018+) | No IE11. No SSR — must mount in `useEffect` (client component). |
| `n8n-nodes-puppeteer` | n8n `>= 0.187` | Install via Community Nodes panel. Requires `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` + system Chrome on the VPS for production stability. |
| `tailwindcss@^4` | PostCSS via `@tailwindcss/postcss` plugin | v4 dropped the v3 plugin format. Migration is real but small. |

---

## Confidence Assessment

| Component | Confidence | Reason |
|-----------|------------|--------|
| Next.js 15.5 on Netlify PRO | HIGH | Verified against Netlify and Next.js current docs; well-trodden combo. |
| Supabase Auth + RLS pattern | HIGH | Standard multi-tenant pattern documented by Supabase itself; pattern matches firm/employee model exactly. |
| Cloudflare Stream signed URLs | HIGH | Direct match to product needs (signed video access tied to enrollment); pricing verified for our volume. |
| H5P over Rise decision | HIGH | License + cost are objective; xAPI integration via `H5P.externalDispatcher` is documented and clean. The one risk is operator's preference for Rise's authoring UX — flag this for the operator to verify Lumi Desktop is acceptable. |
| Stripe pattern (three Prices + metadata) | HIGH | Standard tiered SaaS shape; Customer Portal handles renewal. |
| n8n + Puppeteer for PDF | MEDIUM-HIGH | n8n + Puppeteer node is documented and used by many; Puppeteer reliability on a single VPS is the one weak link — have the PDF-Generator-API fallback ready in mind. |
| Resend over Postmark | MEDIUM | Functionally correct for this scale; Postmark is the safer pick for absolute deliverability. Decide before launch based on operator's risk tolerance on missed emails. |
| Tailwind v4 | MEDIUM-HIGH | v4 is stable but newer than v3; one-time migration cost for any v3-era components copy-pasted from elsewhere. |

---

## Sources

- [Next.js on Netlify — official guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/) — HIGH confidence
- [Deploy Next.js 15 on Netlify](https://www.netlify.com/blog/deploy-nextjs-15/) — HIGH
- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15) — HIGH
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — HIGH (informs the "stay on 15.5" recommendation)
- [Netlify pricing 2026](https://www.netlify.com/pricing/) — HIGH
- [Supabase SSR for Next.js — official](https://supabase.com/docs/guides/auth/server-side/nextjs) — HIGH
- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — HIGH
- [Migrating to the SSR package from Auth Helpers](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers) — HIGH (confirms auth-helpers deprecation)
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) — MEDIUM-HIGH
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — MEDIUM-HIGH
- [Supabase Pricing](https://supabase.com/pricing) — HIGH
- [Cloudflare Stream — Securing your Stream](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/) — HIGH
- [Cloudflare Stream Pricing](https://developers.cloudflare.com/stream/pricing/) — HIGH
- [Cloudflare Stream — Use your own player](https://developers.cloudflare.com/stream/viewing-videos/using-own-player/) — HIGH
- [Generating signed tokens in Node — CF community](https://community.cloudflare.com/t/generating-signed-tokens-in-node/328114) — MEDIUM
- [H5P — Cloudflare Video integration forum thread](https://h5p.org/node/1264738) — HIGH (confirms no native CF Stream adapter)
- [H5P Licensing](https://h5p.org/licensing) — HIGH
- [H5P MIT-licensed](https://h5p.org/MIT-licensed) — HIGH
- [h5p-standalone GitHub (MIT)](https://github.com/tunapanda/h5p-standalone) — HIGH
- [@lumieducation/h5p-server (GPLv3)](https://www.npmjs.com/package/@lumieducation/h5p-server) — HIGH
- [Articulate 360 Pricing](https://www.articulate.com/360/pricing/) — HIGH
- [Articulate Rise — Publishing for Web Distribution](https://articulate.com/support/article/Rise-360-Publishing-Content-for-Web-Distribution) — HIGH
- [Articulate xAPI in Rise — community](https://community.articulate.com/discussions/discuss/x-api-in-rise/1223338) — MEDIUM
- [Articulate postMessage cross-domain issue](https://community.articulate.com/discussions/discuss/postmessage-to-iframe-parent-not-received-cross-domain-scorm/278321) — MEDIUM (confirms fragility of non-xAPI score reporting)
- [Stripe Webhooks — quickstart](https://docs.stripe.com/webhooks/quickstart?lang=node) — HIGH
- [Stripe Customer Portal — configure](https://docs.stripe.com/customer-management/configure-portal) — HIGH
- [Stripe pricing models — tiered/per-seat/flat](https://docs.stripe.com/products-prices/pricing-models) — HIGH
- [Verify Stripe webhook signature in Next.js API Routes](https://maxkarlsson.dev/blog/verify-stripe-webhook-signature-in-next-js-api-routes) — MEDIUM-HIGH
- [n8n + Supabase integrations](https://n8n.io/integrations/supabase/) — HIGH
- [n8n-nodes-puppeteer GitHub](https://github.com/drudge/n8n-nodes-puppeteer) — HIGH
- [n8n PDF generation workflow template](https://n8n.io/workflows/12554-generate-pdf-documents-from-html-with-pdf-generator-api-gmail-and-supabase/) — HIGH
- [Resend vs Postmark 2026 comparison](https://www.pkgpulse.com/blog/resend-vs-nodemailer-vs-postmark-email-nodejs-2026) — MEDIUM

---
*Stack research for: AI Compliance Training Platform (Built Smart by Rob) — solo/small-firm legal SaaS, ABA Rule 5.3 certification*
*Researched: 2026-05-19*
