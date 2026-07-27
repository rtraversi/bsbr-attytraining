# Rename → Iurix — Scoping Doc

**Prepared:** 2026-07-26 (Rob + Claude, terminal). **For:** Max, 2026-07-27.
**Status:** SCOPE ONLY — no code changed this session. Working tree was clean at start and end.

---

## Decisions locked 2026-07-26 (Rob)

| # | Decision |
|---|----------|
| 1 | **Product/brand name is "Iurix Accreditation"**, or **"Iurix"** for the company. Replaces "Athena". |
| 2 | **Corporate structure:** BSBR Holdings, LLC is the *parent*. **Iurix**, **IurisIQ**, and **Built Smart by Rob** are three separate companies under it. |
| 3 | **Consequence of #2 — "Built Smart by Rob" must be REMOVED from this product.** It is a sibling brand, not the publisher. This is the part that makes the sweep bigger than a wordmark swap: BSBR currently appears as the publisher line on the cert PDF, email footers, legal pages, and the site footer. |
| 4 | **Legal entity = BSBR Holdings, LLC; Iurix is a DBA.** Legal pages read "BSBR Holdings, LLC d/b/a Iurix". |
| 5 | **Domain: `iurixaccreditation.com`** (locked 2026-07-27). Rob is setting it up on Cloudflare. `aistaffcompliance.com` is retired. |
| 6 | **The marketing site moves off Netlify onto Cloudflare**, served by the existing `bsbr-attytraining` Worker under the new domain. |
| 7 | **The Netlify site's design is canonical.** The Athena-branded homepage currently in the Next.js app is retired, not the other way round. |

### Why #4 is good news

The Stripe live-mode blocker has been carried since 2026-06-12 as "LLC/EIN + Stripe Tax."
**The LLC/EIN half is now resolved** — Stripe activates under BSBR Holdings, LLC's existing EIN
with Iurix as the trade name. No new entity formation, no new EIN, no waiting. What remains is
only the head-office address → Stripe Tax activation → state registration / CPA consult.

---

## 🔴 Blocking — Rob owes these before Max can finish

1. ~~The actual domain name.~~ ✅ **RESOLVED 2026-07-27: `iurixaccreditation.com`.** Rob is
   setting the zone up on Cloudflare. Layer 4 is unblocked once the zone is live.
2. **Logo assets.** The current mark is an "atc" monogram + "athena." wordmark. Three files need
   new artwork (see Layer 5). Max cannot generate these.
3. **Decision on Layer 3** — does the course keep the name "AI Staff Compliance Training"?
4. **New contact details** — the Netlify site publishes `info@aistaffcompliance.com` and
   `+1 919-609-2808`. Confirm the Iurix replacements before the port (Layer 8).

---

## Layer 1 — Wordmark "Athena" → "Iurix"

16 source files, ~42 occurrences. Mechanical, no infra dependency — **Max can start this
immediately**, before the domain is picked, as long as he leaves Layer 4 strings alone.

| File | Refs | Notes |
|---|---|---|
| `app/globals.css` | 13 | CSS classes: `athena-dotgrid`, `athena-columns`, `athena-pill`, `athena-pill-solid`, `athena-custom-cursor`, `@keyframes athena-caret`. **Class rename is optional/cosmetic** — see note below. |
| `app/_components/atc-logo.tsx` | 4 | The brand lockup component. Needs new artwork, not just a string edit. |
| `app/_components/site-header.tsx` | 4 | |
| `emails/_components/email-shell.tsx` | 5 | Shared shell — one fix covers all 5 email templates. |
| `app/layout.tsx` | 2 | incl. `:55` root `<title>` |
| `app/_components/hero-section.tsx` | 2 | |
| `app/_components/current-state-section.tsx` | 2 | |
| `app/_components/custom-cursor.tsx` | 2 | |
| `app/dashboard/_components/dashboard-footer.tsx` | 1 | `:21` © line |
| `app/_components/footer.tsx` | 1 | |
| `app/login/page.tsx` | 1 | page `<title>` |
| `app/forgot-password/page.tsx` | 1 | page `<title>` |
| `app/onboarding/page.tsx` | 1 | page `<title>` |
| `app/update-password/page.tsx` | 1 | page `<title>` |
| `app/pricing/page.tsx` | 1 | page `<title>` |
| `app/pricing/_components/pricing-slider.tsx` | 1 | consumes `athena-pill-solid` |

> **On the `athena-*` CSS class rename:** zero user-visible benefit, touches globals.css plus every
> consumer, and risks a missed class silently unstyling a landing section. Suggest either doing it
> as its own isolated commit or skipping it. Don't bundle it with the visible-copy sweep.

---

## Layer 2 — Remove "Built Smart by Rob"

9 files, 15 occurrences. Per decision #3 these become **Iurix**, not a BSBR publisher line.

| File | Refs | Surface |
|---|---|---|
| `workers/cert-worker/src/index.ts` | 4 | Cron reminder emails — **separate deploy target**, easy to miss. |
| `app/api/webhooks/stripe/route.ts` | 2 | Operator-alert email + renewal notification footers. |
| `app/dpa/page.tsx` | 2 | Legal |
| `app/_components/features-section.tsx` | 2 | Marketing |
| `lib/cert-pdf.ts` | 1 | **Cert PDF — compliance record. Highest stakes.** |
| `app/layout.tsx` | 1 | Root metadata |
| `app/privacy/page.tsx` | 1 | Legal |
| `app/terms/page.tsx` | 1 | Legal |
| `app/_components/footer.tsx` | 1 | Site footer |

Legal pages (`terms`, `privacy`, `dpa`) get the entity treatment from decision #4:
**"BSBR Holdings, LLC d/b/a Iurix"**.

---

## Layer 3 — "AI Staff Compliance Training" — DECISION NEEDED

22 files. This is the *course/product descriptor*, distinct from the company name.

**Recommendation: keep it.** "Iurix Accreditation" is the platform/company; "AI Staff Compliance
Training" is the course being certified. Keeping it avoids ~22 files of churn, stays descriptive
for search, and matches the Stripe product name already in use. If Rob wants it renamed, it also
means a DB `UPDATE` (below) and a Stripe product-name change.

Not just code — two data-layer instances:
- `courses.title` row: `"AI Staff Compliance Training — Annual Certification"`, written at
  `app/api/onboarding/complete/route.ts:81`. Existing rows need an `UPDATE`, not just a code edit.
- Stripe product `prod_...` display name — appears on invoices and receipts.

---

## Layer 4 — Domain move ⚠️ blocked on Rob picking the domain

**Sequencing matters here:** do the domain cutover *before* registering the Stripe live webhook,
or you'll register it twice and chase a stale `whsec_`.

**Config:**
- `wrangler.jsonc:9` — `NEXT_PUBLIC_APP_URL`
- `workers/cert-worker/wrangler.toml:14` — `APP_URL`
- Worker custom domain / route (CF dashboard)
- `.claude/settings.local.json:85-86` — stale curl allowlist entries, trivial

**Hardcoded absolute URLs** (these do *not* derive from `NEXT_PUBLIC_APP_URL`):
- `emails/_components/email-shell.tsx:24` — email logo URL
- `emails/_components/email-shell.tsx:118,122,126` — privacy / terms / dpa footer links
- `lib/cert-pdf.ts:216` — `const domain = 'aistaffcompliance.com'` printed **on the certificate**

**From-addresses:**
- `lib/resend.ts:2` — `'AI Staff Compliance <info@aistaffcompliance.com>'`
- `workers/cert-worker/src/index.ts:148` — same, duplicated in the Worker

**Contact addresses:** `app/dpa/page.tsx:81-82`, `app/privacy/page.tsx:65-66`,
`app/terms/page.tsx:78-79`, `app/login/page.tsx:62`, and the
`OPERATOR_ALERT_EMAIL` fallback at `app/api/webhooks/stripe/route.ts:116`.

**External reconfiguration:**
- **Resend domain verification on the NEW domain** (SPF/DKIM/DMARC). This was already an open
  blocker for prod email — good that we caught it before verifying the old domain.
- **Supabase Auth** — redirect allow-list + the hosted email templates.
- Stripe Checkout `success_url`/`cancel_url` and Portal `return_url` derive from
  `NEXT_PUBLIC_APP_URL` — those follow automatically once the secret is updated. ✅

**Note:** emails already delivered point at the old domain for their logo and legal links. If the
old domain is left resolving for a while, they keep working; if it's dropped, they break. Not
worth blocking on, but decide deliberately.

---

## Layer 5 — Assets Rob owes

| File | What it is |
|---|---|
| `public/atc-athena-logo.svg` | Primary "atc" monogram vector |
| `public/athena-logo-email.png` | Email header logo — served from an absolute URL, so it must exist on the **new** domain |
| `lib/cert-pdf.ts:18` `LOGO_B64` | Base64 JPEG on the certificate. Already a known placeholder ("swap for final SVG/PNG before launch"). Now it also has to be the Iurix mark. |

Also check favicon / OG images.

---

## Layer 6 — Stripe live mode (partially unblocked by decision #4)

1. Activate the Stripe account under **BSBR Holdings, LLC** — needs the head-office address.
2. Set the **statement descriptor to IURIX** — customers will recognize Iurix on their card
   statement, not BSBR. Getting this wrong drives chargebacks.
3. Enable **Stripe Tax**. `app/api/checkout/route.ts:68` already sets
   `automatic_tax: { enabled: true }` — checkout will **fail in live mode** until Tax is active.
4. Recreate product + volume-tiered price in live mode ($35 / $32 / $28 bands, `tiers_mode=volume`).
5. Swap the hardcoded `PRICE_ID` at **`app/api/checkout/route.ts:17`**
   (currently sandbox `price_1TjNHc6ZCSojEKRrKs79ToJ0`).
6. Register the live webhook endpoint **on the new domain** → new `whsec_` →
   `wrangler secret put STRIPE_WEBHOOK_SECRET`. Events: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`,
   `invoice.payment_succeeded`.
7. `wrangler secret put STRIPE_SECRET_KEY` with the live key.

> **Doc correction:** CLAUDE.md still names price `price_1ThbLNCzT2268ei9nkadS8kD` and product
> `prod_UgzKT3NrGNAvDA`. The code actually uses `price_1TjNHc6ZCSojEKRrKs79ToJ0` on sandbox account
> `acct_1ThDpr6ZCSojEKRr`. CLAUDE.md is stale — fix it during this pass.

---

## Layer 8 — Marketing site: Netlify → Cloudflare (added 2026-07-27)

### The situation

This is **not a normal migration** — nothing needs to be built to leave Netlify. The
`bsbr-attytraining` Worker **already serves a full marketing site** (`/` renders a homepage,
`/pricing` returns 200). There are simply two competing marketing sites:

| | Netlify (`aistaffcompliance.com`) | Worker (`bsbr-attytraining`) |
|---|---|---|
| Title | "AI Staff Compliance Training — Rule 5.3 AI Certification for Law Firm Staff" | "Athena — AI Staff Compliance Training \| Built Smart by Rob" |
| Hero | "Your staff is using AI." | Athena landing |
| Status | **CANONICAL — this design wins** | **Retired** |

There is also a third variant at `/mockup` (Rob's v0 concept, quick task `260703-g7x`) — decide
whether to delete it during this pass.

**DNS note:** `aistaffcompliance.com` runs on **Netlify DNS** (NS1 nameservers,
`dns1–4.p07.nsone.net`), not Cloudflare. Irrelevant now that the domain is being retired —
`iurixaccreditation.com` goes onto Cloudflare nameservers from the start.

### Approach: build fresh in the Next.js app, using the Netlify site as the reference

**Decision (Rob, 2026-07-27): build the new website in Cloudflare** — i.e. as pages in the existing
Next.js app served by the `bsbr-attytraining` Worker, not as a separate static site. The Netlify
site is the **design and content reference**, not something to copy file-for-file.

⚠️ **The Netlify site is a pre-launch "coming soon" page with a waitlist** — it has no working
checkout. The Next.js app has a *real* pricing page wired to `/api/checkout`. Following the Netlify
version too literally would ship a coming-soon page over a finished product.

Take its structure, design language, and copy; wire the real purchase flow in place of the
waitlist. Two sections are the ones that change:
- "The training platform is coming soon" → remove, or repurpose
- "Be first in line" (email capture) → replace with the real checkout CTA

### Netlify site structure (single page, no internal routes)

1. **Hero** — "Your staff is using AI."
2. **"What we do"** — 3 value props: structured AI training for nonlawyer staff / a scored
   assessment with a pass gate / a defensible paper trail for the supervising attorney
3. **"Why Rule 5.3 just changed"** — 3 case callouts: *Mata v. Avianca*, *In re Crabill*,
   *Wadsworth v. Walmart*
4. **"Simple annual pricing"**
5. **"The training platform is coming soon"** → replace
6. **"Be first in line"** (email capture) → replace with real checkout

Contact details in the footer: `info@aistaffcompliance.com`, `+1 919-609-2808` — both need Iurix
replacements (see Blocking #4).

> **Content note:** *In re Crabill* is the standout case from Katy's AI-ethics research
> (2026-07-24 session) — the attorney who realized his citations were fake the morning of the
> hearing, didn't withdraw, and drew a 1yr+1day suspension. Worth keeping the section grounded in
> that research rather than rewriting it from scratch.

### Cutover steps

1. Rob: register `iurixaccreditation.com` → add as a Cloudflare zone → registrar nameservers → CF.
2. Max: port the Netlify design into the Next.js app, replacing the Athena homepage; wire the real
   checkout in place of the waitlist.
3. Workers → `bsbr-attytraining` → Settings → Domains & Routes → **Add custom domain**
   (Custom Domain, *not* Route — CF auto-provisions the cert and DNS record).
4. Update `NEXT_PUBLIC_APP_URL` (Worker secret **and** `wrangler.jsonc:9`) and the cert worker's
   `APP_URL` (`workers/cert-worker/wrangler.toml:14`); redeploy **both** workers.
5. Resend: verify `iurixaccreditation.com` (SPF/DKIM/DMARC); update both `FROM` constants.
6. Stripe: register the live webhook on the new domain (see Layer 6 — do this *after* step 3).
7. Supabase Auth: redirect allow-list + hosted email templates.
8. Decide `aistaffcompliance.com`'s fate — 301 redirect to the new domain, or drop it. It can stay
   on Netlify purely as a redirect at no cost.

---

## Layer 7 — Records risk

**Confirm no real certificates have been issued** before the rename. Certificates are the
compliance artifact the whole product exists to produce; any already in customer hands carry the
Athena/BSBR branding and a `aistaffcompliance.com` domain line. Since Stripe has never been live,
the expected answer is zero real certs — but verify rather than assume, and if any exist, decide
reissue vs. leave.

---

## Suggested order

1. **Rob:** register the domain, send logo assets, answer Layer 3. *(blocks 3 and 4)*
2. **Max:** Layers 1 + 2 — string sweep, leaving all domain strings untouched. Safe, no infra,
   independently deployable.
3. **Domain cutover:** DNS → Worker custom domain → Resend verify → secrets → redeploy.
4. **Stripe live:** Tax activation → live objects → `PRICE_ID` → webhook on the new domain.
5. **Legal pages:** entity treatment, ideally with the reviewing attorney's eyes on it.

---

## Cloudflare account audit (2026-07-27, via MCP)

| Worker | Created / last deployed | Verdict |
|---|---|---|
| `bsbr-attytraining` | 06-12 / **07-20** | **Keep** — the app. Live deploy covers all code commits (last code commit 07-17; everything after is docs). |
| `bsbr-cert-worker` | 06-12 / 06-24 | **Keep** — crons are load-bearing. See caveat below. |
| `aistaffcompliancetraining` | 06-11 / **06-11** | **Delete.** Literal `return new Response("Hello world")`, never modified since creation, its `workers.dev` URL 404s. |
| `kc-assets` | 07-24 | Unrelated (Katy Chavez signature assets). Leave alone. |

### ⚠️ Verify: cert-worker's HTTP handler is a no-op stub

`bsbr-cert-worker`'s **`scheduled` (cron) handler is real** — expiry reminders (90/30/7),
inactivity reminders, renewal reminders (30/14/3), and the 5-minute `cert_generation_queue` drain.
That part is load-bearing; do not remove it.

Its **`fetch` (HTTP) handler is not.** It validates `X-Webhook-Secret`, parses the payload,
confirms it's a passed `quiz_attempts` INSERT — and then discards everything and returns 200:

```js
void { attemptId, firm_id, enrollment_id, user_id, score };
return new Response("OK", { status: 200 });
```

Cert generation actually lives in the app at `/api/certs/generate`, which is what
`DEPLOY-CHECKLIST.md` step 6 points the Supabase DB webhook at. **Confirm the Supabase Database
Webhook targets the app URL, not the cert worker.** If it's aimed at the cert worker, certificates
silently never generate and nothing raises an error — the webhook gets a clean 200 every time.
Re-check this after the domain cutover, since the webhook URL changes.

---

## Unrelated open items (not part of this rename)

- **Auth performance** — ~5s per dashboard route. Zero `getClaims()` usage repo-wide despite
  CLAUDE.md mandating it; three serialized `getUser()` round-trips per navigation
  (`middleware.ts:36` → `app/dashboard/layout.tsx:11` → page) plus a `getUserById` fan-out at
  `app/dashboard/page.tsx:56`. Touches ~7 auth files. **Still waiting on Max's go-ahead since 07-17.**
- **Question pool** — still placeholder (8 questions, no randomization). Katy: legal-accuracy pass.
  Rob: commit to a pool size (~24–32 target, unresolved since 2026-06-12).
- **`.planning/STATE.md` is badly stale** — still claims "Phase 0, 0% complete." Phases 1–5 are done
  and deployed. Either refresh it or delete it; it has misled two sessions now.
- **`cloudflare_stream_video_id`** — vestigial `NOT NULL` column from the pre-Rise CF Stream era.
  Only ever written (`app/api/onboarding/complete/route.ts:82`), never read by any app code.
  The 07-24 notes flagged this as a real gap; it isn't. Worth a migration to drop it, low priority.
