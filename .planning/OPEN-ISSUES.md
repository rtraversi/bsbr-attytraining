> ⚠️ **Snapshot from 2026-08-05, not a live list (checked 2026-08-27).** Written the day the
> redesign went to production. It predates the PROD database cutover, the framing correction, the
> published Terms and Privacy, the 50-question bank, and the entire policy intake. Some items here
> are closed. Current blockers are in `STATE.md` §5.

---

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
### 📄 Full detail: **`.planning/PROD-CUTOVER.md`** — read that before touching either database

**Progress 2026-08-05 (second session):** Rob upgraded to Pro and unpaused **IURIX PROD**
(`ttqthtzdjacrhjtrcmmy`). It had **zero** migrations, tables and buckets. It is now
schema-complete: `0001`–`0022` applied, migration history rewritten to the repo's version strings,
and the un-versioned objects created. Schema verified identical to staging on tables, columns,
policies, functions and indexes.

`iurixaccreditation.com` still inlines `ndmzvtuywcufvkxtkjhg` (**IURIX STAGING**). **Nothing has
been switched over.**

> 🔴 **Migrations alone do NOT produce a working database.** Four objects were created by hand in
> the dashboard and are in no migration: the `certificates` bucket, the `courses` row, and **two
> Database Webhooks that are the entire certificate pipeline**. A project built only from
> migrations looks complete and then silently never issues a certificate. Found by diffing
> **triggers** — every other axis matched. See `PROD-CUTOVER.md`.

**Remaining, all Rob:**
1. Enable **Database Webhooks** on IURIX PROD — it has no `supabase_functions` schema and no
   `pg_net`, so the two triggers cannot be created until this is on
2. Auth → Site URL + redirect allowlist must include `https://iurixaccreditation.com`, or every
   invite and password reset breaks (`redirectTo: ${appUrl}/auth/callback`)
3. The credential swap
4. Rotate the webhook shared secret for PROD — staging's is stored **in plaintext in the trigger
   definition**, readable by anyone who can query `pg_trigger`

**The trap when the project ref changes.** The Supabase URL and keys live in **FOUR** places — this
list previously said three — and must all move together:

| Where | Consumed by | If missed |
|---|---|---|
| `.env.local` | `next dev` | local dev breaks loudly |
| App Worker secrets | server-side reads at runtime | server calls fail |
| **`workers/cert-worker` secrets** | **the cron jobs** | **crons keep writing to STAGING. Nothing errors.** |
| **GitHub Actions secrets** | **inlined into the browser bundle at build time** | **sign-in breaks silently, CI still green** |

`cert-worker` is a separate Worker with its own `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
(`workers/cert-worker/src/index.ts`, `Env`). Verify the swap landed by grepping the **live client
bundle** for the project ref, not by trusting the deploy output — and confirm a cert PDF actually
appears in the bucket after a quiz pass, which is the only proof the webhooks are wired.

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

### 6. ~~Stripe is still in sandbox~~ — ✅ **CLOSED 2026-08-27**
**This was wrong for weeks.** Stripe has been live since 2026-08-19: live account
`acct_1ThDpU5md3Gcv1Z1`, live Product `prod_V6NwTwWVBDkz7R`, live Price
`price_1U6BAj5md3Gcv1Z13Rx9qQll` carrying `lookup_key: per_seat_annual`, Stripe Tax active with an
NC registration, and a live webhook endpoint on `iurixaccreditation.com`. A real card was charged
$37.54 and refunded. The deployed Worker holds live keys — **proven behaviourally**, since
Cloudflare never returns secret values. Full evidence chain in `CLAUDE.md` §4.

**The "17 firms" line was also wrong** — those are in **staging**. Prod held exactly one firm
("Katy Chavez Law", Rob's own live smoke test), purged 2026-08-27; see `PROD-CUTOVER.md`.
Prod is now empty of firms, members, seats and auth users.

### 6b. 🔴 The refund the code promises but never issues · **Rob**, before live money
`app/api/webhooks/stripe/route.ts:630` emails a **non-US buyer** telling them *in writing* that
their payment is being refunded. `refunds.create` appears **zero times** in the codebase, by design
— cancelling a subscription stops future billing, it does not return the payment just captured.

🔴 **This is no longer hypothetical — as of 2026-08-27 it is live.** Charges are enabled on a
real account with real cards. A non-US buyer who slips past the checkout guard is charged,
cancelled, told in writing that a refund is coming, and nothing issues it unless Rob acts on the
operator alert. **This is now the highest-priority open item on the Stripe path.** Either soften the wording or actually call `refunds.create`. **This is issue #2
below, localised** — it is the non-US path specifically, not the duplicate path, which only alerts
the operator to decide.

### 7. ~~Four Stripe config deltas~~ — ✅ **CLOSED 2026-08-27**
All four are resolved. `tax_behavior` → `exclusive` (one-way; cannot be changed again).
`tax_code` → `txcd_20060058` "Training Services – Self-study Web-based". `lookup_key`
→ `per_seat_annual` was already set. The product was already renamed to
"Iurix Accreditation — Annual Certification". **`ix-stripeaudit` is done.**

Only cosmetic remnant: product `metadata` is still empty (`pricing_model=per_seat_volume` was never
set). Nothing reads it.

🟠 **One new item created by the entity change:** the **statement descriptor** became
`BSBR HOLDINGS LLC`, where it read `IURIX ACCREDITATION`. Customers recognise the brand, not the
holding company; unrecognised descriptors drive chargebacks. **Set it back** — Settings →
Business → Statement descriptor. · **Rob**, dashboard

### 7b. Entity is now BSBR HOLDINGS LLC · **Rob**, dashboard — mostly done
Business type Company / **multi-member LLC** (Rob and Katy), legal name `BSBR HOLDINGS LLC`, EIN on
file, requirements completed 2026-08-27. `charges_enabled` and `payouts_enabled` both true.

This answers **open question #3 in `.planning/legal/README.md`**: the entity is
"BSBR Holdings, LLC d/b/a Iurix", not a separate Iurix LLC. The seven places in the app and legal
docs already say exactly that — **no code change needed.**

Remaining: **move the payout bank account to the LLC's business account.** A company-type account
paying out to a personal account is a mismatch Stripe eventually flags.

⚠️ **Do not diagnose entity state from `GET /v1/account`.** On a standard non-Connect account it
returns `business_type: individual`, `company.name: "Robert M Traversi"` and `requirements: null`
regardless of the truth. That is legacy data. The dashboard's **Account status** tab is the only
authority — this was misread twice on 2026-08-27.

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

### 9b. 🔴 The quiz runs on placeholder questions · **Rob / Katy**
**Surfaced 2026-08-05.** `quiz_questions` holds **8 rows, all tagged `PLACEHOLDER:*`, and zero real
ones** — on staging and now on PROD (seeded there for parity so the environment is testable).

`0003_quiz_questions.sql` calls them *"placeholder questions (replace with Rob's real pool before
launch)"*. `BACKLOG.md` wants **24–32** and lists it under "Blocked on Rob";
`CONTENT-10-STEPS.md` Task 7 is the home for it.

This is the **certifiable layer** — the thing the certificate attests to, and the only graded
component in the product. Everything else on this list is infrastructure; this is the substance.

### 9c. Pre-Stripe duplicate purchase check is still open · **either**
`/api/checkout` performs no identity check, so a customer who already has an account can reach
Stripe and be charged before anything stops them. `BACKLOG.md` #1.

**The safety net (#2) IS built** — contrary to what this list said before. The webhook resolves
identity via `find_user_id_by_email` (`0018`), classifies the case as
duplicate / email_in_use / unresolved / non_us_billing, cancels the duplicate subscription and files
a `provisioning_failures` row. So the money stops billing; it is not automatically returned (see
6b). The remaining gap is that the buyer is charged at all.

---

## 🟡 P2 — housekeeping, no customer impact

### 10. 🔴 `0023_remove_avatars.sql` CANNOT RUN — needs rewriting · **either**
**Reclassified 2026-08-05. This is not housekeeping any more.** It fails:

```
ERROR: 42501: Direct deletion from storage tables is not allowed. Use the Storage API instead.
CONTEXT: PL/pgSQL function storage.protect_delete()
```

Supabase added a guard that blocks `delete from storage.objects` / `storage.buckets` from SQL, and
`0023` does exactly that. It is the only migration unapplied in **every** environment, and because
it is DDL inside a transaction it takes everything batched with it down too — so **the next person
to run `supabase db push` gets a failure that also rolls back anything else pending.**

Rewrite it to drop the bucket through the Storage API rather than SQL. Until then it is
deliberately not recorded in IURIX PROD's migration history, matching staging.

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

## 📝 Corrections to earlier docs (2026-08-05, second session)

- **`BACKLOG.md` #2 is DONE**, not open — see 9c. #1 genuinely is still open.
- **The credential swap is four places, not three** — `workers/cert-worker` has its own Supabase
  secrets. Every prior doc undercounts this.
- **CLAUDE.md says Postgres 15.** Both Supabase projects run **17.6.1**.
- **CLAUDE.md said the price ID is hardcoded at `app/api/checkout/route.ts:17`.** True until
  `stripe-lookup-key`; the file no longer contains a price ID.
- **The `certificates` bucket being hand-created was documented all along**, in a comment inside
  `0013_settings_v1.sql`. It was never carried into a checklist, which is exactly how it nearly
  became a silent production failure. `.planning/PROD-CUTOVER.md` exists so that cannot repeat.

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

---

# 🔴 Added 2026-09-02 — the intro screen now promises an email nothing can send

> **This entry is newer than the snapshot above.** Everything from the `# Open Issues — as of
> 2026-08-05` heading down is frozen. This is not. See the note at the end about where it probably
> belongs.

**What changed today.** `app/intake/_components/intake-intro.tsx` step 2 now reads, verbatim
(Max's copy, 2026-09-02):

> Our team assembles and reviews your policy
> Your written AI use policy is assembled from these answers. **We email you when it is ready.**

That sentence is shown to **every buyer**, on the first screen after payment, on an untouched
session. It is a promise the product makes at its most credible moment.

**Nothing can send that email.** Two independent locks, both deliberate, neither owned by this
change:

1. **Resend returns `403 The iurixaccreditation.com domain is not verified.`** All four DNS records
   were verified present and correct on 2026-08-19 (`resend-domain-verification` TXT, `send.` SPF,
   `send.` MX, `resend._domainkey` DKIM). The remaining step is a click in the Resend dashboard by
   whoever holds that account — possibly Max's rather than Rob's. Tracked as `ix-dnszoho`. This has
   been failing since roughly 2026-08-12 and it takes down invites and certificate delivery too,
   not just this.
2. **`POLICY_EMAIL_COPY_APPROVED = false`** at `lib/policy/delivery-email.ts:41`, checked at `:77`,
   and **pinned false by a test** (`tests/policy-delivery.test.ts:327-330`). This is the more
   important lock and it exists on purpose: without it, the day someone fixes the DNS every
   delivery would start emailing firms a message reading `[TODO(copy) — headline]`. The copy is
   Max's to write.

**So the order is fixed, and it is not the obvious one.** Fixing Resend alone does not make the
promise true — lock 2 still holds, silently. Writing the copy alone does not make it true either.
**Both** have to land, and the copy has to land *before* or *with* the DNS fix, never after.

**Why this is being recorded rather than fixed.** Max, 2026-09-02: *"i know. so note it."* The
copy is deliberate and stays as written. This entry exists so that nobody discovers the gap from a
customer.

**Not a regression.** The pre-2026-09-02 copy made the same promise (*"We email you when it is
ready"* was already in step 2). What changed is that the surrounding sentence got shorter, so the
promise is now more prominent, and the screen it sits on is the one every buyer sees.

> 📌 **This is probably the wrong file.** `OPEN-ISSUES.md` declares itself a frozen 2026-08-05
> snapshot in its own opening banner and points at `STATE.md` §5 for current blockers, and
> `STATE.md` §0 declares itself the document that wins. The live home for this is
> **`STATE.md` §5 → "Engineering, verified in the tree today"**. Recorded here because that is
> where it was asked for; flagged rather than moved silently. Move it and delete this block if you
> agree.

---

# 🟠 Added 2026-09-10 — Katy's billing/Stripe punch list, logged for a batched fix

**Not yet fixed. Rob's call: gather the rest of Katy's billing feedback first, fix everything in
one pass.** Two items confirmed today by reading the code, not guessed.

### 15. Firm name is asked twice at signup — confirmed, has a real fix
`app/api/checkout/route.ts:197` turns on `tax_id_collection: { enabled: true }`. Per Stripe's docs,
when a buyer chooses to enter a Tax ID at Checkout, Stripe also prompts for the **legal business
name** to validate it, and saves that name onto the Stripe **Customer** object (`name` /
`business_name`). Separately, `firms.name` is created **empty on purpose** at webhook time
(`app/api/webhooks/stripe/route.ts:486`), and `/onboarding/firm-name`
(`app/onboarding/firm-name/_components/firm-name-form.tsx`) asks for the firm name again from
scratch before the middleware gate opens.

So the double-ask only bites a buyer who bothers to fill in the optional Tax ID field at Checkout —
not everyone — but for those buyers it is real and it is exactly what Katy hit.

**Proposed fix (not applied):** in the webhook's firm-creation path, read the name Stripe already
captured (`session.customer_details.name`, or fetch the Customer's `business_name`) and use it to
pre-fill `firms.name` instead of `''`. That satisfies the `/onboarding/firm-name` gate automatically
for anyone who already gave Stripe the name, and changes nothing for anyone who didn't (they still
get asked exactly once).

### 16. "Keep the card on our side" — rejected, and the actual need is already built
Katy's ask was to store the card locally so a firm can change it. **Don't build this.** Today,
IURIX never touches a card number — Checkout and the Stripe Customer Portal hold it, which keeps
this product in PCI DSS **SAQ A** (the lightest self-assessment tier). Storing cards ourselves moves
it to **SAQ D** — quarterly ASV scans, network segmentation, in many cases a QSA-led on-site
assessment — a permanent compliance program, plus real breach liability (card-network fines,
mandatory forensic investigation, breach-notification obligations in every state a customer lives
in) that is wildly disproportionate to a $100–300k/yr small-firm SaaS. For a product whose pitch is
governance and risk reduction, a card breach would be closer to fatal than embarrassing.

**The good news: the feature Katy actually wants already exists.** `/dashboard/billing`
(`app/dashboard/billing/_components/billing-client.tsx:184-196`) has an "Update payment method"
button wired to `/api/portal`, which opens a Stripe-hosted Customer Portal session — card changes
happen entirely on Stripe's page. The copy next to the button already reads *"Card details are held
by Stripe, never by IURIX."* Nothing since 2026-08-24 has deployed to prod, so Katy likely hasn't
seen this screen yet. Action item is a demo, not a build.

---

# 🟠 Added 2026-09-11 — the rest of Katy's punch list, design agreed, not yet built

Continuation of the 2026-09-10 block above. Rob signed off on the designs below; nothing listed
here has been touched in code yet.

### 17. ~~Firm name — capture pre-checkout, carry it to Stripe~~ — ✅ **BUILT 2026-09-21**
`/pricing`'s slider now collects "Firm name" before checkout and sends it as
`metadata.firm_name` (`app/api/checkout/route.ts`, optional — a caller that omits it falls back to
the pre-existing behavior). The webhook pre-fills `firms.name` from it instead of `''`
(`app/api/webhooks/stripe/route.ts`, via `normalizeFirmName`). `/onboarding` shows it read-only
when pre-filled, same CONFIRMS-not-CHOOSES treatment as the email field, and still asks once for
anyone who skipped it (`onboarding-client.tsx`). Typecheck, lint and `pnpm test` clean; the one
source-scanning test that asserted the old literal (`tests/firm-name-gate.test.ts`) was updated to
match. Resolves #15.

### 18. Mid-year seat additions — 🟡 **PARTLY BUILT 2026-09-21** (the safe half); renewal charging deferred
No proration at add-time, no band lookup at add-time. Rob confirmed the design with a worked
example (3 seats Jan 1, +1 seat June 1 at $35, renewal next Jan 1 → that seat's renewal line is
$35 − 5/12×$35 ≈ $20.42) and it's now recorded in `CLAUDE.md` as the one deliberate exception to
flat-on-renewal.

**Built and tested:**
- `supabase/migrations/0033_seat_ledger.sql` — `seat_ledger(firm_id, seat_count, rate_paid_cents,
  added_at, covers_until, credited_at)`. **Not yet applied to staging or prod** — needs `supabase
  db push` against staging first (this session had no Docker/linked project available, so it
  wasn't run); `types/supabase.ts` was hand-patched to match so the build typechecks, but that
  patch should be replaced by a real `supabase gen types` once the migration is actually applied.
- `lib/pricing.ts` (band rate lookup) and `lib/seat-ledger.ts` (`computeMidYearChargeCents`,
  `computeRenewalTrueUp` — pure functions, unit-tested against Rob's own numbers in
  `tests/seat-ledger.test.ts`).
- `app/api/billing/add-seats/route.ts` — the one-time charge. Firm admin only; charges a Stripe
  Invoice (invoice item + finalize + pay) at the firm's *current* per-seat rate, **never** bumps
  the subscription's `quantity`, updates `firms.max_seats` / `seats.max_seats` only after the
  charge is confirmed paid, and writes the `seat_ledger` row.
- `/dashboard/billing` — "Add seats" control on the Current plan card. The two dead
  `href="/api/portal"` "Add seats in Billing" links (`invite-form.tsx`, `csv-upload-form.tsx`) now
  point at `/dashboard/billing#add-seats`.

**Deliberately NOT built — flagged rather than rushed:** making the annual renewal itself
app-controlled (recompute headcount, look up the new band, apply `computeRenewalTrueUp`'s credit,
and actually get Stripe to charge that exact amount on the right day without misfiring proration
or double-charging) is real design and testing work of its own — timing an app-driven charge
against Stripe's own invoice/collection cycle needs a dedicated pass with Stripe sandbox testing,
not a same-session addition. `lib/seat-ledger.ts` has the credit math ready; nothing calls it
against a live Stripe invoice yet. #3 (the original "no mechanism at all" complaint) is resolved
for the add side; the renewal side is where #3 partially remains.

### 19. Change payment method — confirmed already built, no work needed
`/dashboard/billing`'s "Update payment method" button → `/api/portal` → Stripe Customer Portal.
Nothing to build. Resolves #4 from yesterday's list (the "what if they want to change their card"
question) alongside #16.

### 20. Cancellation is four different mechanisms, not one — clarified 2026-09-11
- **Cancel auto-renewal** — built, `/dashboard/billing`. Soft: stays active to period end, no
  refund, certs remain valid forever. **No change.**
- **Remove one staff member** — built, `app/api/firm/member/delete/route.ts`. Soft-deletes the
  member and frees their seat via the `sync_used_seats` trigger. Not billing-related at all — a
  roster action, not a cancellation. **No change.**
- ✅ **Immediate cancel + refund — BUILT 2026-09-21.** New eligibility rule
  `lib/cancel-refund-eligibility.ts` (purchase date ≤ 14 days ago AND no certificate issued for
  this firm — unit-tested in `tests/cancel-refund-eligibility.test.ts`), exposed on
  `/api/billing/summary` so the dashboard can show/hide the action, and enforced again
  server-side in the new `POST /api/billing/cancel-refund` before anything happens. On eligible,
  it alerts the operator (via the newly-extracted `lib/operator-alert.ts` — same pattern, pulled
  out of the webhook route so this route could use it too) with everything needed to act by hand;
  it does **not** call `refunds.create` or cancel the Stripe subscription itself — both stay
  Rob's own action, per the agreed design. Ineligible requests return why (`too_late` /
  `certificate_issued`), surfaced in the new "Cancel and request a refund" section on
  `/dashboard/billing`. UI copy there is a first draft, Max's to revise before shipping.
- ✅ **Involuntary cancellation (payment failure) — BUILT 2026-09-21.** `handlePaymentFailed` now
  calls `alertOperator` with the firm, customer email, subscription and invoice link, same as
  every other branch in that file.
- 📌 **Full account/data deletion — pinned, not designed.** Rob to discuss with Katy before this
  gets a design. Tension already on record: `training_events` rows are kept indefinitely with
  identifiers stripped, as the evidentiary record behind a certificate (`STATE.md` §6) — "delete
  everything" and "keep proof the certificate is real" are in direct conflict and need a policy
  answer, not a code answer, first.
