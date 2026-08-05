# Open Issues — as of 2026-08-05, after the redesign went live

**Written:** 2026-08-05 (Rob + Claude), immediately after production was promoted to
`2c8bf062-378b-4149-9fb2-26c18ec1fb05`.
**Purpose:** one prioritised list Max can pick up from. Where an item already exists in
`.planning/BACKLOG.md` it is cross-referenced rather than duplicated.

**Status of the thing that was blocking everything:** the redesign is live on
`iurixaccreditation.com`, deploys run through CI on Linux, and the Windows build problem is
permanently routed around. None of the items below block shipping code.

---

## 🔴 P0 — before any real customer exists

### 1. Production runs on the STAGING database · **Rob**, in progress
`iurixaccreditation.com` inlines `ndmzvtuywcufvkxtkjhg` (**IURIX STAGING**). **IURIX PROD**
(`ttqthtzdjacrhjtrcmmy`) has been **INACTIVE** since it was created on 2026-06-11 — free-tier
projects pause after 7 days idle.

Rob is upgrading to Supabase Pro within 24h of 2026-08-05 and activating the prod DB.

**The trap when the project ref changes.** The Supabase URL and anon key live in **three** places
and must all move together:

| Where | Consumed by | If missed |
|---|---|---|
| `.env.local` | `next dev` | local dev breaks loudly |
| Worker secrets | server-side reads at runtime | server calls fail |
| **GitHub Actions secrets** | **inlined into the browser bundle at build time** | **sign-in breaks silently, CI still green** |

Migrations `0001`–`0022` must exist on whichever project takes traffic. Verify it landed by
grepping the live client bundle for the project ref, not by trusting the deploy output.

### 2. A customer email promises a refund nobody has automated · **Rob**
Carried from Max's 08-03 handoff and still unresolved — it was deferred during the deploy and is
now live. The operator alert carries a 🔴 REFUND line, but if Rob does not act on that email, a
customer has been told in writing that money is coming back. **Fix the wording.**

### 3. `www.iurixaccreditation.com` returns 522 · **Rob**, dashboard
DNS resolves to Cloudflare, but the response carries no `x-opennext` header — unlike the apex, www
is not bound to the Worker, so Cloudflare accepts the request and has no origin. Anyone typing the
`www.` form gets a Cloudflare error page. Needs a custom-domain entry or a redirect rule. Unrelated
to the redesign; promoting did not fix it and never would have.

### 4. `[ATTORNEY TO COMPLETE]` is live on `/privacy`, `/terms`, `/dpa` · **Max drafts, Katy/Rob approve**
Not a regression — it was already live before the redesign. Still unfinished legal copy on a paid
compliance product. `.planning/POLICY-DECISIONS.md` (Max, 08-05) now records the underlying
decisions so the drafts can be traced rather than invented.

**One constraint from the retention decision:** `training_events` rows are kept and their
identifiers stripped, because the row is the Rule 5.3 evidence the certificate rests on. That makes
training activity **retained indefinitely**, and the Privacy Policy must say so.

`/cookies` exists as structure only and is 404-guarded in production (see #11).

### 5. 390px mobile has never been checked by anyone · **either**
The site is live and no one has viewed it at that width. The browser extension would not change the
viewport for Rob on 08-05 and was not connected on the second machine either. Needs one pass in the
DevTools device toolbar. The header is the likely failure: enlarged lockup plus four nav links.
Statically every grid is mobile-first and every width is `max-w-*`; the only `min-w` is the legal
table, deliberately inside `overflow-x-auto`.

---

## 🟠 P1 — before taking real money

### 6. Stripe is still in sandbox · **Rob**
Checkout hardcodes `price_1TjNHc6ZCSojEKRrKs79ToJ0` (`app/api/checkout/route.ts:8`), which is
`livemode: false`. Live-mode object creation was deferred pending Stripe Tax. The 17 firms in the
database all carry a `stripe_subscription_id` and are therefore test records — **confirm that
before assuming it.**

### 7. Four Stripe config deltas, all customer-visible or tax-affecting · **Rob**, dashboard
From the 2026-08-03 audit in `CLAUDE.md`:

- `tax_behavior` is **`unspecified`** while `app/api/checkout/route.ts:68` sets
  `automatic_tax: { enabled: true }`. Stripe expects an explicit `inclusive`/`exclusive`.
- **No `tax_code`** on the product — automatic tax falls back to the account default category.
- **No `lookup_key`**, so the hardcoded price ID is the only handle. Setting one would remove the
  ID swap from the launch checklist.
- **The product is still named "AI Staff Compliance Training — Annual Certification"**, the retired
  course name. `grep` finds zero occurrences in source because the Stripe product name is not
  source — it renders on hosted Checkout, every invoice and every receipt.

### 8. Resend's send path is not fully verified · **Max**
DNS looks correct — DKIM at `resend._domainkey` intact, `send.` subdomain keeps its own MX and SPF,
DMARC on relaxed alignment. But the Resend API key is send-only and cannot list domains, so **the
only real test is sending a message.** A mail change broke everything for days on 07-29; do not
assume.

> ### ⛔ Never enable Cloudflare Email Routing on the apex
> Older notes called it "verified safe: the apex has zero MX and zero TXT." True on 2026-08-03,
> **false since 08-04** — the apex now carries Zoho MX (`mx.zoho.com`, `mx2`, `mx3`) and
> `v=spf1 include:one.zoho.com ~all`. Enabling Email Routing would overwrite those records and
> break inbound mail. Verified live on 08-05: Zoho owns the apex, Resend sends from `send.`, and
> they do not collide.
>
> *(The two code comments that used to state the opposite — `lib/resend.ts` and the block in
> `workers/cert-worker/src/index.ts` — were already corrected by Max in `98019d3` on 08-04. A later
> note listing them as stale was itself out of date. No action needed.)*

### 9. Four features are advertised before they exist · **Rob's call, flagged in code**
Published deliberately, to build to match. Every day it stays unbuilt is a day the page overstates.

| Promised on the page | Reality |
|---|---|
| A written policy, tailored to your firm | Not built |
| A yearly Iurix Accredited website token | Not built |
| Members-only page of sanction summaries | Not built |
| Ongoing nationwide sanction monitoring | Operational commitment, not software |
| Individually signed attestations | **Partial** — the quiz captures identity attestation and `/api/firm/attestation` emits a firm-level PDF; there is no per-staff signed document |

---

## 🟡 P2 — housekeeping, no customer impact

### 10. `supabase db push` for `0023_remove_avatars.sql` · **either**
The only unapplied migration. Pure cleanup — it deletes the avatars bucket and its objects, and no
code references avatars. Safe in either order; nothing waits on it.

### 11. Remove the production guards on `/cookies` and `/mockup` when they stop being true
Both 404 in production and stay viewable under `next dev`.
- `/cookies` — delete the guard when the copy lands and Katy or Rob has approved it.
- `/mockup` — the superseded "Warm Counsel" concept. Delete the route outright once nobody needs it
  for comparison.

### 12. `deploy.yml` never prints the preview URL
Its grep expects a `workers.dev` string that `opennextjs-cloudflare upload` does not emit, so the
run summary shows "Preview uploaded" over a blank line. Build the URL from the version ID
meanwhile: first 8 characters + `-bsbr-attytraining.aistaffcompliance.workers.dev`.

### 13. Two deploy docs give advice that is now wrong
- **`.planning/DEPLOY-RUNBOOK.md` step 2** says to copy `NEXT_PUBLIC_APP_URL` from `.env.local`.
  That file holds `http://localhost:3000`. The value is inlined into the browser bundle at build
  time, so following it literally ships password-reset links pointing at localhost — from a build
  that passes. The secret is set correctly now; **the table row is still wrong.**
- **`.planning/DEPLOY-CHECKLIST.md`** (June) still says `pnpm run deploy`. That predates the Windows
  discovery and is safe only on macOS/Linux.

### 14. CI actions warn about Node 20 deprecation
`actions/checkout@v4`, `actions/setup-node@v4` and `pnpm/action-setup@v4` are being forced onto
Node 24. Harmless today, will not be forever.

---

## 🔵 Content and product decisions — need a person, not a commit

- **`/about`, `/contact` and `/ai-policy` do not exist.** Katy's page structure calls for the first
  two; `/ai-policy` is specced in the brief. No copy for any of them. Nav uses in-page anchors.
- **$35 vs $39 is undecided.** Katy's draft says both in different places; the live Stripe bands and
  the slider are $35/$32/$28. **If $39 is the real intent it changes in Stripe first**, then in
  `included-section.tsx` and `pricing-slider.tsx`. Advertising a number checkout does not charge is
  a billing problem, not a copy problem.
- **"Accredited" vs the brief.** `01-brief.md` says avoid "accredited" and "guarantee" entirely for
  legal reasons; Katy's copy makes "Iurix Accredited" the central promise. Shipped as Katy wrote it,
  with the footer disclaimer drawing the line. **Katy and Rob should confirm the two are reconciled
  on purpose.**
- **Business voicemail line (Twilio)** — `.planning/BACKLOG.md` item 7. Ties to the contact email
  and the footer phone placeholder; retaining voicemails would add Twilio to the DPA sub-processor
  list.
- **`.planning/BACKLOG.md` items 1, 2, 5 and 6** remain open on their own terms: pre-Stripe
  duplicate purchase check, the webhook re-purchase safety net, removing `devLink` from production
  routes, and the "Try Again" quiz button not resetting state.

---

## ✅ Closed on 2026-08-05 — do not reopen

- `main` merged into `redesign-iurix`, all 12 conflicts resolved; then `redesign-iurix` merged to
  `main`. Both branches are at the same commit and match production. `.planning/MERGE-GUIDE.md` is
  history.
- Five GitHub Actions secrets added — deploys no longer depend on one person's Mac.
- The CI upload step no longer reports success when it fails (`set -o pipefail`). Six earlier runs
  had gone green while uploading nothing.
- The rollback target in the handoff was fiction (`0cd156ef`, present in zero of ten deployments).
  Real one is `a0323ac4-e7f3-44d1-8e0e-9071b5dc241d`, the pre-redesign build.
- The US-only checkout disclosure was arriving styled for the dark page — 1.41:1 contrast, legally
  required and effectively invisible. Now 9.23:1 / 5.19:1.
- `/cookies` and `/mockup` are no longer publicly reachable in production.
- The `noreply@` justification comments were corrected on 08-04 (`98019d3`).
