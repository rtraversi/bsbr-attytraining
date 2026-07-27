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
| 5 | **Domain moves to an Iurix domain.** Away from `aistaffcompliance.com`. |

### Why #4 is good news

The Stripe live-mode blocker has been carried since 2026-06-12 as "LLC/EIN + Stripe Tax."
**The LLC/EIN half is now resolved** — Stripe activates under BSBR Holdings, LLC's existing EIN
with Iurix as the trade name. No new entity formation, no new EIN, no waiting. What remains is
only the head-office address → Stripe Tax activation → state registration / CPA consult.

---

## 🔴 Blocking — Rob owes these before Max can finish

1. **The actual domain name.** "An Iurix domain" was decided; the specific domain was not.
   Everything in Layer 4 is blocked on this. Register it before Max starts the cutover.
2. **Logo assets.** The current mark is an "atc" monogram + "athena." wordmark. Three files need
   new artwork (see Layer 5). Max cannot generate these.
3. **Decision on Layer 3** — does the course keep the name "AI Staff Compliance Training"?

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
