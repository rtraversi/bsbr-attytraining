# Pitfalls Research

> ⚠️ **STACK SUPERSEDED (2026-06-11):** This document was researched for the original Netlify + n8n + H5P stack. The locked stack is now Cloudflare Pages (`@cloudflare/next-on-pages`) + CF Workers + custom React quiz — see `.planning/STATE.md` Locked Decisions and `CLAUDE.md`. Netlify/n8n/H5P-specific guidance below is historical; domain findings (Stripe, Supabase RLS, Cloudflare Stream, compliance) remain valid.

**Domain:** Compliance Training SaaS for Attorneys (ABA Model Rule 5.3 / AI staff supervision)
**Researched:** 2026-05-19
**Confidence:** HIGH for stack-specific pitfalls (Supabase, Stripe, Cloudflare Stream, n8n — verified against current docs and community reports). MEDIUM-HIGH for compliance/legal framing (verified against ABA Formal Opinion 512 and state bar guidance, but operator should still have a lawyer review marketing copy and TOS).

---

## Critical Pitfalls

These will lose weeks of time, money, or — in the legal-framing cases — invite a state bar complaint.

### Pitfall 1: Certificate Language That Reads as Legal Advice or an Accreditation Claim

**What goes wrong:**
The certificate, marketing site, or course content says something like "ABA-approved," "ABA-certified," "Rule 5.3 compliant," "this satisfies your supervision obligations under Rule 5.3," or "audit-defensible." The ABA does not accredit third-party training products. There is no "Rule 5.3 compliant" status to confer. Any claim that the cert *itself* satisfies an attorney's ethics obligation is (a) factually wrong, (b) potentially deceptive advertising under each state's rules of professional conduct, and (c) arguably the unauthorized practice of law (UPL) when directed at the attorney-buyer who is relying on it as legal guidance.

**Why it happens:**
The product *is* the cert. Conversion copy wants to say "this protects you." That instinct is the trap. The cert is *evidence of training* — one piece of a larger Rule 5.3 supervision program — not a compliance instrument.

**How to avoid:**
Use only these framings on certificate, dashboard, and marketing:
- "Completed [Course Name]: AI Use in Legal Practice under ABA Model Rule 5.3 Framework"
- "Training record" or "completion record" (NOT "compliance certificate" or "accreditation")
- "Helps document training as part of a Rule 5.3 supervision program"

Explicit disclaimer required on the cert, the checkout, and the marketing footer:
> "This training is an educational resource. It is not legal advice and does not constitute accreditation by the American Bar Association or any state bar. Completion documents training only; ethics compliance depends on the attorney's own supervision program."

Have a licensed attorney in your jurisdiction review the cert template, the marketing landing page, and the TOS before launch. Budget $500–$1,500 for a one-time review.

**Warning signs:**
- Copy uses verbs like "guarantees," "ensures," "satisfies," "certifies compliance"
- Marketing references "ABA-approved" or specific state bar approval anywhere
- Customer support gets questions like "will this hold up if the bar audits me?" — that means the marketing already over-promised

**Phase to address:**
Earliest content/branding phase, before any marketing site is live. Re-verify at every public-facing copy change.

---

### Pitfall 2: Storing Staff PII as "Just Training Records" Without Privacy Framing

**What goes wrong:**
Staff names, emails, employer, quiz scores, completion timestamps, and certificates accumulate in Supabase. To the operator this is "course data." To a privacy regulator, plaintiff's lawyer, or attorney-buyer's malpractice carrier, this is **employee training records held by a third-party processor**. Without a published privacy policy, a Data Processing Addendum (DPA), and clear retention/deletion procedures, the attorney-buyer cannot demonstrate that *their* Rule 5.3 supervision — including supervision of *this vendor* — is in order. They will not buy a second year, and they may demand deletion in year one.

**Why it happens:**
Solo operators ship the product first and think about privacy when an enterprise asks. Attorney buyers are not enterprises but they have heightened sensitivity: their entire profession is built on confidentiality duties (Rule 1.6) and they instinctively audit vendors.

**How to avoid:**
Before charging the first customer:
1. Publish a privacy policy that names: what is collected, retention period (recommend: 7 years post-cert to match common malpractice statute), how to request deletion, who the processor is (Supabase, Cloudflare, Stripe, n8n VPS), and where data is hosted (US regions only).
2. Publish a one-page DPA / vendor-info sheet attorneys can drop into their own compliance file. This is a 5.3 supervision artifact for *your* attorney customers — make it a marketing asset.
3. Minimize PII: do not collect SSN, DOB, home address. Email + first name + last name + role is sufficient.
4. RLS-isolate all PII per firm (see Pitfall 6).
5. Add a "delete this employee record" affordance to the firm dashboard so attorney admins can self-serve removal when a staff member leaves.

**Warning signs:**
- No privacy policy linked from checkout
- No clear answer to "who has access to my staff's data?"
- Attorney prospects ghost after the demo — they took it to their IT/compliance person and got "no"

**Phase to address:**
Pre-launch foundation phase. The privacy policy, TOS, and DPA template must exist before Stripe is connected to production.

---

### Pitfall 3: Stripe Webhook Provisions the Same Firm Twice

**What goes wrong:**
Stripe retries webhooks aggressively when your endpoint times out or returns non-2xx. If `checkout.session.completed` is not handled idempotently, a slow first attempt creates the firm, a retry creates a second firm record (or doubles the seat count, or sends two welcome emails). The customer paid once but now has two accounts, conflicting seat counts, and the cert URLs in their welcome emails point to one of the two — usually whichever one the staff doesn't end up using.

**Why it happens:**
The default pattern most tutorials show is: webhook arrives → do work → return 200. If "do work" includes inserting a row, sending emails, calling n8n, and writing to Storage, total runtime can exceed Stripe's 20-second window, triggering a retry. Each retry runs the same insertion logic without checking whether it already ran.

**How to avoid:**
- Create a `processed_stripe_events` table keyed on `event.id` (Stripe's event ID, not the object ID). First step in the webhook: try to insert that event ID. If insert fails (unique violation), return 200 immediately — already processed.
- Make all firm-provisioning operations conditional `UPSERT` keyed on `stripe_customer_id` and/or `stripe_subscription_id`, never blind `INSERT`.
- Verify the webhook signature on every call (`stripe.webhooks.constructEvent`). Reject with 400 if invalid — don't 200-OK unsigned traffic.
- Acknowledge the webhook fast (return 200 within a few seconds), then push the work to an async path (a Netlify background function, or post to n8n which fans out the actual provisioning). Heavy work inside the synchronous webhook handler is the root cause of timeout retries.

**Warning signs:**
- Two firm records with the same Stripe customer ID
- Duplicate "Welcome to ..." emails to the same buyer minutes apart
- Stripe Dashboard → Webhooks shows the same event ID with 2+ delivery attempts

**Phase to address:**
The Stripe-checkout-creates-firm phase. Build the idempotency table on day 1 of payment integration — retrofitting after the first paid customer is a data-cleanup operation.

---

### Pitfall 4: Cloudflare Stream Signed-URL Expiry Breaks Mid-Course or Post-Issuance

**What goes wrong:**
Cloudflare Stream signed-URL tokens default to **1 hour**. Two failure modes:
1. *Mid-course:* Staff member starts the 20–30 min video, gets interrupted, returns 90 minutes later. The HLS manifest URL has expired. Video silently stops or fails to resume; quiz state may be lost.
2. *Post-issuance link in cert email:* Marketing/n8n includes a "rewatch the course" or "view your certificate video" link with a short-TTL token. Staff opens the email a day later and the link 403s.

**Why it happens:**
The default expiration is short by design (it's a security feature, not a bug). Tutorials and starter code use the default. Nobody tests the "user comes back tomorrow" flow during development because dev sessions are short.

**How to avoid:**
- For *video playback*: generate signed tokens with a longer TTL (e.g., 4–8 hours) and refresh server-side on each player load — token is generated when the page renders, not when the email is sent. The Next.js page that hosts the player calls a server route that mints a fresh token at request time.
- For *certificate downloads*: certificates are PDFs in Supabase Storage. Use Supabase signed URLs with multi-day expiry, **or** route them through your own Next.js endpoint that authenticates the requester (firm admin or the cert's owner) and streams the bytes — no signed URL leaks. The latter is preferred because it survives password resets, link-sharing, and email forwarding without exposing storage URLs.
- Never bake a Cloudflare Stream signed URL into an email body, a stored database column, or a printed cert. Tokens are per-request, not per-cert.
- Enable Cloudflare Stream's **Allowed Origins** restriction on every video so the embed only plays from your domain (defense in depth against token leaks and hotlinking).

**Warning signs:**
- Support tickets about "video won't play" or "the cert link is dead"
- High 403 rate on Stream URLs in Cloudflare analytics
- Staff who took a break can't resume — they re-start the course and may give up

**Phase to address:**
Video integration phase. Build the token-refresh-on-load pattern from the first prototype; don't ship the short-TTL default.

---

### Pitfall 5: Supabase Free-Tier Project Pause Kills Dev/Staging at the Worst Moment

**What goes wrong:**
Supabase free-tier projects auto-pause after **7 days of database inactivity** and the free tier allows only **2 active projects**. With one prod and one dev/staging project, the dev project pauses any week the operator works on other things. Unpausing requires a manual dashboard click and can take minutes. If the operator is debugging a prod bug at 11pm and needs to reproduce on dev, the dev DB is offline. Worse: paused projects don't count against the 2-project cap, but unpausing too many in a billing period can hit operational friction. (Verified: Supabase docs, multiple 2025–2026 community posts.)

**Why it happens:**
The pause is silent by default. Operator doesn't notice until they try to use the project.

**How to avoid:**
- For *production*: upgrade to Supabase Pro ($25/month) the moment a paying customer exists. Free tier is unsuitable for production — period. Build this into the unit economics; $25/mo against $199–$499 ARPU is fine.
- For *dev/staging*: either (a) upgrade dev as well, (b) accept the pause and unpause manually, or (c) use a tiny GitHub Actions cron that hits the dev DB once every 6 days to keep it warm. Option (c) is free and reliable; option (a) is cleanest if budget allows.
- **Decision to make explicit in PROJECT.md:** "Production = Supabase Pro before launch. Free tier is dev-only."
- Back up the `N8N_ENCRYPTION_KEY` for n8n, Supabase service-role key, and Stripe webhook secret to a password manager. Losing any of these is days-of-rebuild expensive.

**Warning signs:**
- Dev dashboard shows "Project paused" banner
- Supabase status emails about inactivity
- The 2-project cap is hit when trying to spin up a "branch preview" environment

**Phase to address:**
Foundations phase. Decide tier-up timing before the first paying customer. Document the keep-warm strategy for non-prod environments.

---

### Pitfall 6: RLS Policies Pass Manual Testing but Leak Across Firms in Production

**What goes wrong:**
Multi-tenant Supabase apps routinely leak cross-tenant data because:
- RLS is enabled on the main tables but forgotten on a join target (`employees` is locked down, `quiz_attempts` is not).
- Policies are tested in the SQL Editor, which runs as `postgres` and *bypasses* RLS — everything looks fine, then a production user with the anon key sees everyone's data.
- The `service_role` key is reused in client-side or front-end code "just for this admin feature" — that key bypasses RLS entirely.
- New tables added later are forgotten in RLS — they default to **enabled but with no policy = no access** for users **or** **disabled = everyone has access** depending on what the migration did.

In January 2025, security researchers found 170+ Lovable-built apps with publicly readable databases via the anon key. Same failure mode applies here.

**Why it happens:**
RLS is opt-in per table and per-policy. The defaults are forgiving in dev (one user, postgres role) and unforgiving in production (many tenants, anon role). Bugs are silent.

**How to avoid:**
- Enable RLS on **every** new table by default — make it part of the migration template.
- Write policies in terms of a single source of truth: a `firm_members` join table that says "user X belongs to firm Y." Every other policy joins to it.
- Test policies **from the client SDK** (Next.js server actions using the user's JWT), not the SQL Editor.
- Have at least two seed firms in dev (`firm_a`, `firm_b`) with seed users. Every developer-facing test of any data-read screen verifies that `firm_a`'s user cannot see `firm_b`'s rows.
- Use the service-role key **only** in trusted server-side code (n8n workflows, webhook handlers, admin maintenance scripts). Never in the browser. Add an env var naming convention: `SUPABASE_SERVICE_ROLE_KEY` only loaded inside Netlify functions and n8n, never available in client bundles.
- Run Supabase's `get_advisors` (security advisor) before each release.
- Index every column referenced in a policy. Missing indexes turn RLS into a serial-table-scan tax.

**Warning signs:**
- Tests pass on a single-tenant seed DB but never explicitly check cross-tenant isolation
- Any front-end code imports the service role key
- Supabase advisor warnings about missing policies on user-accessible tables
- Slow dashboard queries — symptom of missing index on `firm_id`

**Phase to address:**
Schema/auth phase, before any feature touches tenant data. Build the dual-firm seed and the cross-tenant isolation test on day 1.

---

### Pitfall 7: n8n VPS Dies and the Certificate Pipeline Silently Stops

**What goes wrong:**
The whole certificate-generation flow is on a self-hosted n8n at `n8n.katychavezlaw.com`. When the VPS reboots, runs out of disk, or fails an apt-get upgrade, the webhook from Next.js / Supabase / Stripe still POSTs — but no workflow runs. Or worse, it 502s and Next.js's calling code silently swallows the error. Staff complete the course, hit pass, get the on-screen "your certificate is being generated" toast, and... nothing arrives. They wait a day. They email support. By the time the operator notices, three firms have churned because the product visibly broke. Community survey: **60%+ of self-hosters had failures or downtime in the first 30 days.**

**Why it happens:**
Self-hosted n8n has zero managed uptime. No load balancer, no health checks unless you wire them up. n8n upgrades occasionally break workflows (community-node version mismatches, node parameter renames). The encryption key (`N8N_ENCRYPTION_KEY`) controls all stored credentials — lose it and every connection has to be re-authed.

**How to avoid:**
1. **Health check + alerting:** External uptime monitor (UptimeRobot, BetterStack — both have free tiers) hitting `https://n8n.katychavezlaw.com/healthz` every minute. Alert to SMS/email on failure. This is non-optional.
2. **Outbound dead-letter:** Next.js does not call n8n synchronously and trust it. Instead: write the "needs cert" event to a Supabase table (`cert_generation_queue`). A small worker (Netlify scheduled function, or another n8n workflow on a 5-min cron) drains the queue and retries. If the synchronous call to n8n fails, the row sits in the queue and is picked up later.
3. **Backups:** Daily encrypted backup of (a) n8n's Postgres DB, (b) the n8n volume, (c) the `N8N_ENCRYPTION_KEY` to a separate password manager. Test restoring once before launch.
4. **Version pinning:** Pin n8n version in the Docker compose. Never auto-upgrade. Schedule monthly upgrades with explicit testing of every workflow afterward.
5. **Webhook auth:** Every n8n webhook the public can reach (Stripe webhook proxy, completion notifier) must require either (a) HMAC signature verification matching the upstream provider's signing key (Stripe) or (b) a shared secret header (`X-Webhook-Secret`) compared in an IF node. Default-open webhooks let anyone trigger workflows that send emails, write to DB, or burn paid API calls. Confirmed serious risk per multiple 2025–2026 community reports.
6. **Resource sizing:** 2 vCPU / 4GB RAM minimum for production n8n. Anything smaller and one busy workflow lifts the CPU and others time out.

**Warning signs:**
- Cert generation latency creeping up (was 30s, now 2 minutes) → memory pressure on the VPS
- "I passed but no cert" support tickets — even one means the pipeline isn't observable
- No alerting on n8n down — operator finds out from a customer

**Phase to address:**
Automation pipeline phase. Build the queue + dead-letter pattern *before* the first end-to-end "happy path" demo. Do not ship a "fire and forget" call to n8n.

---

### Pitfall 8: Cloudflare Stream Bandwidth Costs Surprise the Operator

**What goes wrong:**
Cloudflare Stream charges **$1 per 1,000 minutes delivered** plus **$5 per 1,000 minutes stored** per month (verified, current pricing). On paper this is friendly. The surprise modes:
- One firm has 15 staff × 25 min video × 3 retake attempts = 1,125 minutes. At 100 firms that's 112,500 minutes/year = ~$112/year delivery cost. Manageable.
- But: if the cert/marketing video URL is shared on social or a state-bar listserv ("anyone seen this Rule 5.3 thing?"), bandwidth can spike unpredictably from non-paying viewers.
- If the operator does *not* enable Allowed Origins, the player works on any domain — including someone embedding it in their own resale offering or a curious blog post.

**Why it happens:**
Cloudflare Stream bandwidth is included in "minutes delivered" — there's no separate egress surprise like S3, but there's also no soft cap. Costs scale linearly with views, not with paying customers.

**How to avoid:**
- **Allowed Origins** on every video, locked to your production domain(s). This single setting prevents 99% of hotlinking risk.
- **Signed URLs only** for the actual course content. Public/marketing teaser clips can be a separate, intentionally unrestricted video.
- **Budget alert** in Cloudflare for any spend over $50/month — early warning.
- **Per-firm view metrics** in your own DB. Track who watched what, how many minutes. If one firm is doing 10x the expected viewing, it's either abuse or a quiz-loop bug — investigate.
- Keep the canonical course as **one ~25 min video**, not chapter-segmented into 8 short clips. Each segment seek incurs delivery overhead, and HLS chunks add to billable minutes.

**Warning signs:**
- Cloudflare dashboard shows minutes delivered growing faster than firm count
- Stream embed appears in Google search results on third-party domains
- Bandwidth bill spikes without a corresponding sales bump

**Phase to address:**
Video integration phase. Allowed Origins and budget alerts on day 1.

---

### Pitfall 9: Choosing H5P Without Verifying It Embeds Cloudflare Stream

**What goes wrong:**
PROJECT.md leaves H5P vs Articulate Rise open. Reality check: **H5P does not natively support Cloudflare Stream** as a source for Interactive Video. H5P's supported video platforms are YouTube, Vimeo, and Panopto. Cloudflare Stream URLs cannot be dropped into H5P Interactive Video. Confirmed on H5P community forum and H5P help docs as of 2025. A custom integration would require writing a new H5P video library that talks to Cloudflare's Stream API — non-trivial development work.

If the operator picks H5P first and discovers this in week 3, they've burned a week on the wrong path. If they pick Articulate Rise, they get web export but Rise's reporting (passing the quiz score back to the host app) is built for SCORM/xAPI in an LMS context, not for a custom Next.js host — they'll need a postMessage shim or a workaround.

**Why it happens:**
Both tools are marketed as "interactive video." The integration story with non-LMS hosts is buried in community threads, not the marketing pages.

**How to avoid:**
**Recommended decision (HIGH confidence):**
Do **not** treat H5P/Rise as the interactive-video layer over Cloudflare Stream. Instead, decouple:
- Cloudflare Stream plays the video in a standard player on the course page.
- Quiz checkpoints are **separate Next.js components** that appear at scripted timestamps (the Stream player API fires timeupdate events; pause the video, show the quiz component, resume on completion).
- Quiz data is stored in Supabase directly — no SCORM, no xAPI, no LRS, no plugin.

This is *much* less work than integrating either H5P or Rise with Stream. Score-reporting is a direct DB write. The "interactive video" feature in H5P/Rise is a tightly coupled bundle; for this product you only need the "pause and ask a question" piece, which is ~150 lines of React.

If the operator insists on H5P/Rise for authoring UX:
- H5P → host the video on Vimeo or YouTube unlisted (lose Cloudflare's bandwidth economics but gain H5P compatibility) — or commit to building the Cloudflare adapter (weeks of work).
- Articulate Rise → publish as Web (not LMS), embed via iframe, use `window.postMessage` between the iframe and parent Next.js to read completion/score. Iframe sizing is fragile (community reports of scrollbar issues and fixed-height frames).

**Warning signs:**
- Week 2 spent reading H5P forum threads about Cloudflare
- Cert pipeline depends on parsing SCORM packages from Rise
- Quiz score arrives in the dashboard but not consistently — postMessage race condition

**Phase to address:**
Earliest course-delivery phase. Make the decision (custom React quiz overlay vs. third-party authoring tool) before any video is uploaded.

---

## Moderate Pitfalls

### Pitfall 10: PDF Certificate Generation on Netlify Functions Times Out or OOMs

**What goes wrong:**
Spinning up Chromium/Puppeteer inside a Netlify serverless function for each cert generation request is heavy: cold starts of 5–15 seconds, memory pressure, and on free function tiers, timeouts. On the upgraded Netlify PRO tier the limits are friendlier but still not generous for a long PDF render. Even with `@sparticuz/chromium-min`, the cold-start cost on every "issue cert" request is wasteful.

**Why it happens:**
The straightforward pattern (function → puppeteer.launch → pdf) is what every tutorial shows. Nobody warns about cold starts until the third support ticket.

**How to avoid:**
Don't render PDFs in Netlify functions. Two better options:
1. **Render in n8n** using a dedicated Chromium container on the VPS. n8n has community nodes for this; the VPS already has resources. The n8n workflow already runs at cert-issuance time — keep PDF generation there.
2. **Use a PDF microservice** (Browserless, DocRaptor, PDFShift, or self-host Gotenberg on the same VPS). Pricing is per-render and predictable.

For a single canonical certificate template with mostly text + a static border, an HTML-to-PDF library that does *not* spin up Chromium (e.g., `pdfkit`, `pdf-lib` for templating) is fastest and runs in any Node environment. The cert is one page of text + a logo — no need for a full browser engine.

**Warning signs:**
- Cert generation visibly takes 10+ seconds from pass-quiz to email
- Intermittent 502s on the cert-issuance endpoint
- Memory errors in Netlify function logs

**Phase to address:**
Certificate generation phase. Pick the rendering strategy before building the template.

---

### Pitfall 11: Free Trial / Refund Creep When the Product Is the Cert

**What goes wrong:**
Customer pays $199, has 5 staff complete the course in 2 weeks, has 5 PDF certs in hand, then requests a full refund. The training was real, the certs were issued, the customer got what they paid for — and nothing prevents Stripe from honoring the refund. Three of these in a quarter and the margin is gone. Separately: any "free trial" that gives access to the video and quizzes essentially gives away the product, because the cert is the only paywall and *any* completion record is valuable to the buyer.

**Why it happens:**
SaaS instincts say "offer a trial, offer a refund." Wrong instincts for a one-shot deliverable product.

**How to avoid:**
- **No free trial.** PROJECT.md already commits to this — keep it. Offer a demo video and a sample certificate image on the marketing site instead.
- **Refund policy clear at checkout:** "Refunds available within 14 days **and** before any staff has completed the course. Once any certificate has been issued, the purchase is non-refundable." This mirrors the standard digital-product policy (refund only if not consumed) and is enforceable.
- Show the refund policy in plain language on the checkout page, not buried in TOS.
- Implement the refund logic to verify in code: refund button is only available if `count(certificates_issued_for_firm) == 0` and `purchase_date > now() - 14 days`. Otherwise: support has to manually override (and Rob writes off the loss).
- Stripe Dispute risk: a chargeback bypasses the refund policy. The mitigation is signed acceptance of the refund policy at checkout (Stripe stores this on the customer record) and clear evidence of delivery (cert issuance timestamps) when responding to disputes.

**Warning signs:**
- Multiple refund requests in same week
- Refund requests citing "didn't realize there was no refund" — means policy isn't visible at checkout
- Chargeback rate above 0.5%

**Phase to address:**
Checkout / payments phase. Wire refund-eligibility check into the refund UI before launch.

---

### Pitfall 12: Mid-Cycle Seat Tier Changes Are Unhandled

**What goes wrong:**
Firm buys the $199 / 5-seat tier in January. In June they hire two paralegals — now they have 7 staff and need to certify them. The platform either (a) silently blocks the new invites at the 5-seat cap with a confusing error, (b) allows the invites but breaks the cert-issuance check, or (c) the operator manually emails them with a discount link and does it by hand.

**Why it happens:**
Annual-billed seat tiers are unusual in SaaS — most subscription patterns assume monthly proration. The Stripe primitives (proration, quantity updates) all exist but require explicit handling.

**How to avoid:**
- Surface "add seats" as an explicit dashboard action that creates a one-time Stripe charge for the *prorated difference* to the next tier (e.g., $199 → $349 = $150 charged immediately, no change to renewal date; renewal next year is at $349). This is a Stripe `invoice.create` with the line item, not a subscription quantity change.
- Or: simpler, more honest — let firms exceed their seat tier by adding seats at a flat per-seat in-year price ($30/seat for the rest of the term), and surface the upgrade at renewal.
- **Do not** silently block invites without a clear "upgrade to add more staff" CTA. That's the worst UX.
- Document the upgrade flow before the first $199 firm grows.

**Warning signs:**
- Support ticket: "I tried to invite my new paralegal but it failed"
- Firms staying capped at their seat tier despite obvious growth (you're losing expansion revenue)

**Phase to address:**
Seat-management / dashboard phase. Build the upgrade flow before the first customer reaches their cap (which could be 60 days post-launch).

---

### Pitfall 13: Stripe Tax Not Configured for US Sales Tax on Digital Goods

**What goes wrong:**
25 US states tax SaaS / digital training products. If the operator hits economic nexus in those states (typically $100k in sales or 200 transactions) and hasn't been collecting tax, they owe back-tax personally — Stripe doesn't owe it, the LLC does. Even below nexus thresholds, a few states are tax-aggressive. New York taxes SaaS at 100%, Texas at 80% (verified, Stripe guides). Ignoring this is a year-1 ticking time bomb that gets expensive in year 2 when the operator does their accounting.

**Why it happens:**
"It's just $199, I'm not going to hit nexus, I'll deal with it later." Compounding interest on a small problem.

**How to avoid:**
- Turn on **Stripe Tax** from day 1 of taking payments. It's ~0.5% per transaction (small on $199–$499). It handles registration prompts, calculates tax per state, files in supported jurisdictions (with a separate fee).
- Register in your home state for a sales-tax permit on day 1 (you'll have nexus there immediately). For other states, Stripe Tax will alert you when you approach their thresholds.
- Collect business address on the firm at checkout (Stripe Tax needs it for the rate calculation).
- Talk to a CPA who handles SaaS sales tax once before launch. ~$300–$500 conversation. Worth it.

**Warning signs:**
- No tax line on invoices
- Stripe Tax dashboard shows monitoring but not collection enabled
- Customers in NY, TX, WA, MA paying $199 flat with no tax — those are the ones to worry about

**Phase to address:**
Checkout / payments phase. Stripe Tax configuration is a checkbox at Stripe-account setup — flip it on, don't defer.

---

### Pitfall 14: Renewals Bill at the Wrong Price or Wrong Time

**What goes wrong:**
PROJECT.md commits to ~60% renewal pricing. If the renewal is implemented as a normal Stripe subscription, it will auto-bill at the *original* price. If implemented as a one-time annual charge that the customer has to manually re-up, the operator gets a renewal cliff (most won't renew without a calendar nudge and a one-click). Either path has failure modes:
- Auto-renew at original price = customer surprised by full $199 in year 2, refund request follows.
- Manual renewal = no auto-cash flow, every renewal is a marketing motion.

Separately: cert expiry is 12 months. If the customer renews on day 365 + 7, there's a 7-day window where the firm dashboard shows certs as expired. The attorney clicks renew, and... do the certs come back? Are they auto-re-enrolled? Or do staff have to re-take the course immediately?

**Why it happens:**
Annual subscriptions with non-standard pricing rules require explicit business-logic decisions that Stripe primitives don't make for you.

**How to avoid:**
Decide and document **explicitly**:
1. **Renewal mechanism:** Stripe subscription with `cancel_at_period_end` off, billing the renewal price (60% of original). The renewal price is stored as a `renewal_stripe_price_id` on the firm record. At creation, both the initial price and the renewal price are linked.
2. **Pre-renewal communication:** 30, 14, 3 days before renewal, send an email summarizing what will be charged and how to cancel. Critical for legal-services audience.
3. **Cert expiry vs. renewal:** Decouple. Cert expiry = 12 months from cert-issue-date. Renewal = 12 months from purchase-date. If the customer renews on time, staff don't have to retake immediately — give a 30-day grace where existing certs remain "valid (renewal in progress)" until staff complete the new annual cycle.
4. **Failed renewal:** Stripe Smart Retries handles ~57% recovery rate. Configure 4 retries over 14 days. After final fail, mark firm as "renewal lapsed" and revoke fresh cert issuance but **don't** delete data — they may re-up.

**Warning signs:**
- Renewal email response rate is 0% (means it didn't arrive, or arrived in spam)
- High dunning failure → immediate cert revocation → angry email
- Renewal price mismatch in customer support tickets

**Phase to address:**
Phase that wires up Stripe subscriptions, before the first non-trial purchase.

---

### Pitfall 15: Course Content Goes Stale and Re-Issued Certs Embarrass the Operator

**What goes wrong:**
The product is "AI Use Under Rule 5.3 (2026)." In June 2026 the ABA issues Formal Opinion 513 with new guidance. In July your state bar issues a clarifying memo. Staff who took the course in March now have certs that reference outdated guidance. New buyers in August are getting outdated content. By year-end, year-1 customers are renewing into a course that hasn't been updated and they cancel.

The legal landscape on AI is changing fast. **47 state bars** have issued AI ethics guidance as of early 2026, up from 6 in mid-2023.

**Why it happens:**
Operator focuses on platform, treats curriculum as "shipped once." Doesn't budget time for content refresh.

**How to avoid:**
- Quarterly content review on the calendar. 90 minutes per quarter to skim the ABA Standing Committee on Ethics page, state bar feeds, and a handful of legal-tech newsletters.
- When content changes meaningfully, version the course (v1.0, v1.1) and update the cert language ("based on guidance current as of [DATE]"). This is honest and defensible — and a marketing asset ("we keep the training current").
- Build a "course version" column on `certificates`. Surfaces to the firm admin which version each cert is based on.
- For minor regulatory updates, an *addendum module* (5-min supplemental video + 3-question quiz) issued to existing cert-holders is cheaper than re-recording the whole course.

**Warning signs:**
- Marketing site says "ABA Formal Opinion 512" but the latest opinion is 514
- A customer asks "does this cover [new opinion]?" — answer is "no"
- Year-2 renewal rate well below the 60% target

**Phase to address:**
Post-launch operations. But: build the course-version field in the data model from the start; retrofitting is messy.

---

## Minor Pitfalls

### Pitfall 16: Password Reset Loop for Solo-Attorney Staff Without IT

**What goes wrong:**
Solo and small firms have no IT department. Receptionist gets a password-reset email, doesn't see it (spam, work email forwarded to gmail, didn't recognize the sender). Calls the firm admin. Firm admin calls Rob. Rob does a password reset by hand. Repeats per onboarding cycle. Per-firm support burden goes from 0 minutes to 20 minutes.

**How to avoid:**
- **Magic-link login** as the default for staff (not the firm admin). Staff click an email link, no password to remember. Supabase Auth supports this out of the box.
- Invite emails are sent from `noreply@builtsmartbyrob.com` (a domain the firm has heard of from the buy flow) with a clear subject line: `[Firm Name] training invitation: please complete by [DATE]`.
- Include a "didn't get the email?" self-serve resend on the login page that the firm admin (not Rob) can trigger from their dashboard.
- Set up SPF/DKIM/DMARC on the email-sending domain before launch. Otherwise gmail/outlook will spam-foldering.

**Phase to address:**
Auth / invitations phase. Default to magic links from day 1.

---

### Pitfall 17: Audit Defensibility Without an Audit Log

**What goes wrong:**
Attorney-buyer asks "if I get a bar complaint, can I prove the training happened?" The operator says "yes, the cert is the proof." The operator is half-right. A cert PDF is not great evidence — it could have been issued in error, post-dated, or forged. What the attorney wants is an **immutable, timestamped record** with: who logged in, when, from what IP, what video segments they watched, what quiz attempts they made (right and wrong answers), and when the pass was registered. Without that, the cert is just a piece of paper.

**How to avoke:**
- Server-side log table `training_events`: `(firm_id, user_id, event_type, timestamp, ip, user_agent, metadata)`. Insert on every meaningful event: invite_sent, invite_accepted, login, video_started, video_completed, quiz_started, quiz_attempt, quiz_passed, cert_issued, cert_downloaded.
- Make this table append-only by RLS policy (`INSERT` allowed, `UPDATE`/`DELETE` denied even from the dashboard).
- Expose a "download audit log (CSV)" affordance on the firm dashboard. The attorney-buyer should be able to hand a CSV to their bar inquirer.
- Don't store the log in n8n — store it in Supabase. n8n is automation; audit data belongs in the system of record.

**Phase to address:**
Schema / data-model phase. Cheap to add at the start, painful to retrofit.

---

### Pitfall 18: Embed/Player Compatibility on iPad Safari and Old Chromebooks

**What goes wrong:**
Small-firm staff often work on iPads (especially Mac-leaning firms) and old school-district Chromebooks (paralegals at law schools / clinics). Cloudflare Stream's player has good cross-browser support, but a custom quiz overlay with a postMessage shim can break on Safari (different iframe sandbox semantics) or on Chromebooks running Chrome 90-something.

**How to avoid:**
- Test on real iPad Safari and a real Chromebook before launch. BrowserStack has both. ~$30/month for one month of testing.
- Avoid custom video controls and iframe-postMessage gymnastics. Use Cloudflare Stream's React component and overlay a sibling div for the quiz (not an iframe).
- Don't depend on `requestAnimationFrame` or modern features without polyfills.

**Phase to address:**
QA phase before launch.

---

### Pitfall 19: Solo Operator Burnout from Over-Engineering Before Revenue

**What goes wrong:**
The roadmap is ambitious (dashboards, automation, n8n flows, branding, content). A solo operator can easily spend 3 months building generic abstractions and a beautiful admin UI before a single firm pays. By the time the product ships, the operator is burned out and has zero validation that the market wants it.

The successful-solo-founder data is consistent: ship in **weeks**, not months. Pieter Levels' Nomad List launched in 2–3 days. The MVP is "a wireframe that takes payment" — the rest comes after revenue.

**How to avoid:**
- **Hardcode three n8n workflows, don't build a workflow engine.** "Provision firm on Stripe paid," "Issue cert on quiz pass," "Send renewal reminder at -30d, -14d, -3d." That's it. No generic system.
- **No admin dashboard for the operator** until there are 3+ paying firms with overlapping problems to manage. Until then, the operator uses the Supabase dashboard + Stripe dashboard directly.
- **No customer self-serve invoice download, no team admin permissions, no SSO.** The user is a firm admin who logs in once a year and sees a list of staff. That's the whole UI.
- Build to the *first paying customer's* needs, not the *hundredth*.
- One feature, one user flow, end-to-end, observable, before the next feature starts.

**Warning signs:**
- Week 4 of building and no demo URL exists yet
- More files in `lib/` than in `app/`
- Operator is writing tests for code that has no real user

**Phase to address:**
Every phase. The roadmap-creation prompt should explicitly time-box each phase to days, not weeks.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode three n8n workflows instead of building a generic engine | Ships in days, not weeks | Will need refactor at 50+ firms with edge cases | **Always** at MVP; revisit at 25 firms |
| Synchronous Stripe webhook handler doing all provisioning inline | Simple, easy to debug | Stripe retries cause duplicate provisioning, slow firms wait at checkout | **Never** — add idempotency table from day 1 |
| Supabase free tier in production | Saves $25/month | Project pauses, no backup, no support — guaranteed outage | **Never** for production |
| Use service-role key in client code "just for this admin button" | Saves writing a server route | Total RLS bypass, cross-tenant leak risk | **Never** |
| Single hardcoded course version, no version column on `certificates` | Saves a migration | When content updates, can't tell which version a cert was issued against | Acceptable for v0, mandatory before second customer |
| Skip Stripe Tax | Saves 0.5% per transaction and the setup time | Back-tax owed personally to states, accountant cleanup | **Never** if selling in US |
| No audit log on training events | Saves a table and ~10 insert points | Attorney-buyer cannot defend cert in a bar complaint, product loses credibility | **Never** — the audit log *is* the product |
| Long-lived Cloudflare Stream signed URL baked into email | Easy "watch the course" link | URL leaks become persistent, no revocation possible | **Never** — always generate on page load |
| n8n on free-tier VPS with no monitoring | Saves $5/month for monitoring | Pipeline goes down silently, customers churn | Acceptable only during local dev — never post-launch |
| Hardcode the certificate template HTML in the n8n workflow node | Fastest to ship | Every copy change requires editing the workflow | Acceptable until first content update, then move to a template file in repo |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe → Next.js webhook | Doing all provisioning inline in the webhook handler | Acknowledge 200 immediately; enqueue to async worker (n8n or Supabase queue) |
| Stripe webhook signature | Skipping signature verification | Always verify with `stripe.webhooks.constructEvent(rawBody, sig, secret)` |
| Stripe → n8n provisioning | Calling n8n from the Stripe webhook directly | Stripe webhook writes to Supabase; n8n polls/triggers from there. Decouple. |
| Supabase RLS | Testing policies in SQL Editor | Test from the actual client SDK with the user's JWT |
| Supabase Storage → cert download | Returning public URL of the PDF | Stream through an authenticated Next.js endpoint that re-verifies firm membership |
| Cloudflare Stream → player | Default 1-hour token, generated at email-send time | Generate signed token at page-load time with 4–8h TTL |
| Cloudflare Stream → embed | Default Allowed Origins (none = any) | Lock to production domain(s) only |
| H5P / Articulate Rise → Stream | Assume they integrate | They don't (H5P confirmed, Rise requires postMessage shim). Use native player + custom React quiz overlay |
| n8n webhook | Public URL with no auth | Require shared-secret header OR HMAC signature from Stripe |
| n8n credentials | Lose the encryption key | Backup `N8N_ENCRYPTION_KEY` to password manager separately from DB backup |
| Email delivery (invitations, certs) | Send from gmail or unverified domain | SPF + DKIM + DMARC on the sending domain before first send |

---

## Performance Traps

Realistic scale assessment: **1–500 firms × 1–15 staff = max 7,500 users**. Most "scale" concerns are not relevant here. The real performance traps are user-facing latency and pipeline reliability.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| PDF generation cold-start in serverless | Cert email arrives 15s after pass-screen toast | Render in n8n with a long-lived Chromium container, or use a lighter PDF library | Even at 5 firms; user-facing slowness |
| Cloudflare Stream signed-URL refresh storm | Many concurrent firms hit token-mint endpoint at once | Cache token per-user for the token's TTL; mint once per session, not per chunk | 50+ concurrent learners (unlikely but possible during corporate-firm onboarding) |
| Supabase RLS without index on `firm_id` | Dashboard query takes 5+ seconds | Index every column referenced in any policy | ~10k rows per table |
| n8n VPS single-instance bottleneck | Cert generation queues up under load (5+ pending) | Queue + dead-letter in Supabase; worker drains. VPS isn't the system of record. | 10+ concurrent passes (rare — most firms cert their staff sequentially) |
| Stripe webhook → synchronous DB inserts blocking response | Stripe retries due to >20s response | Async path; webhook handler is <1s | First batch of paying firms; immediate |
| Email-send throughput | Welcome / cert emails bouncing | Use a transactional provider (Postmark, Resend) with reputation, not gmail SMTP | First marketing push; immediate |

---

## Security Mistakes

Beyond OWASP basics. Domain-specific to a legal-services product.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service-role key exposed in client bundle | Total RLS bypass, all firm data readable by anyone | Service-role key in Netlify env vars only, never `NEXT_PUBLIC_*`. CI check to grep bundles. |
| RLS not enabled on a new table | Cross-tenant data leak, public read | Migration template that always includes `ENABLE ROW LEVEL SECURITY` and a default-deny policy |
| Stripe webhook accepts unsigned requests | Attacker can fake `customer.subscription.created` and provision a free firm | Always verify signature; reject 400 if missing/invalid |
| n8n webhook accepts unauthenticated POST | Attacker triggers cert-issuance, burns email-send quota, can write fake training events | Header auth (`X-Webhook-Secret`) on every public webhook; verify in IF node |
| n8n encryption key in plaintext in git | All credentials compromised on repo leak | Key in VPS env file outside repo, separate backup to password manager |
| Supabase signed-URL for cert PDF with long expiry, embedded in email | URL leaks (forwarded email, screenshot) become persistent download links | Cert downloads route through authenticated Next.js endpoint; no raw storage URLs |
| Cross-firm leakage via API endpoint that takes `firm_id` from the URL | Attacker iterates IDs to read other firms' data | Never trust `firm_id` from URL; derive from authenticated user's session and RLS |
| Cert downloadable without auth on a "share" link | Forged certs could be reused; staff names/emails leak | Cert URLs are short-lived signed URLs OR require login OR contain a verification token; never raw bucket paths |
| Email enumeration on login | Attacker can determine which firms use the platform | Auth responses don't distinguish "user not found" from "wrong password" (Supabase Auth does this correctly by default — don't override) |
| No rate limit on quiz submissions | Brute-force quiz to find pass conditions | Server-side rate limit (5 attempts/minute per user); the score gate must be enforced server-side, not just in the H5P/Rise/JS layer |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Quiz-pass screen says "your certificate is being generated" with no time estimate | User refreshes, panics, emails support | Generate cert synchronously or near-synchronously (<5s); show clear "you'll get an email in 1 minute" with the actual URL the moment it's ready |
| Firm admin dashboard sorted alphabetically with no completion status filter | Admin can't tell who hasn't completed; manual scan of 15 names | Default sort by status: incomplete first, then in-progress, then complete |
| Renewal email arrives 7 days before expiry, no reminder before that | Firm admin misses it, certs expire silently | 30/14/3 day cadence, with a banner in the dashboard 60 days out |
| Failed-quiz feedback says only "you didn't pass" | User repeats the same wrong answer | Show which questions were wrong (not the right answer — that's giveaway) and which video segments cover them |
| Cert PDF has no verification URL or QR | Cert can be edited in Acrobat; attorney can't prove it's real | Include a verification URL on the cert that resolves to a "this cert was issued on [date] to [name] of [firm]" public page (no PII beyond what's already on the cert) |
| Staff invite email is generic-looking | Spam-foldered; staff don't enroll | Email from `{firm_name}-training@builtsmartbyrob.com` (display name), subject mentions firm name, body references the attorney admin who invited them |
| Single "complete the course" button with no save/resume | Staff abandons 12 min in, restarts from 0, gives up | Save video position + quiz state every 30s; "resume from 12:34" CTA |
| No mobile/iPad support | Staff who try on iPad get a broken player | Test on iPad explicitly; if not supported, surface clearly: "please use a desktop browser" |

---

## "Looks Done But Isn't" Checklist

Things that pass a happy-path demo but fail in production.

- [ ] **Stripe webhook:** verify signature on EVERY request, including manual test events. Idempotency table populated. Verify by re-sending the same event from Stripe Dashboard and confirming no duplicate firm/email.
- [ ] **Cert issuance:** verify that a passing quiz score actually arrives at the server (not just shown in JS). Server-side score validation, not just client-side.
- [ ] **Cert link:** open the cert email from a phone that's never logged in. Does the link work? Does it leak data without auth?
- [ ] **RLS cross-tenant test:** seed two firms with two users each. As `firm_a` user, attempt to read `firm_b` data via Supabase client directly. MUST get nothing.
- [ ] **n8n down test:** stop the VPS for 10 minutes. Process a "firm paid" event. Verify the work eventually completes when VPS is back (queue / dead-letter works).
- [ ] **Cloudflare Stream Allowed Origins:** verify the video does NOT play when embedded on a domain other than yours. Try `localhost`, try a JSFiddle.
- [ ] **Cert download under load:** open the cert URL after the magic-link login session has expired. Verify behavior (re-prompt or generate fresh URL — don't silently 403).
- [ ] **Privacy / DPA / TOS:** all three exist as published URLs (not "coming soon") and are linked from checkout. Acceptance is a checkbox at checkout, stored on the customer record.
- [ ] **Refund logic:** test refund attempt after a cert has been issued. Should require manual approval, not auto-refund.
- [ ] **Renewal:** simulate the 12-month-later renewal billing. Does the customer get billed at 60%? Do certs continue working until staff re-complete? Is the dashboard clear about the new cycle?
- [ ] **Audit log export:** download the firm's audit log CSV. Is it complete? Is it append-only? Try to manipulate it via the dashboard — verify you can't.
- [ ] **Email deliverability:** send a test cert email to gmail, outlook.com, yahoo, and a custom-domain email. Check spam folders. Verify SPF/DKIM/DMARC pass.
- [ ] **Backup restore:** restore n8n's database from yesterday's backup into a staging environment. Verify workflows run with `N8N_ENCRYPTION_KEY` correctly applied.
- [ ] **Mid-cycle seat upgrade:** add 3 seats to a 5-seat firm. Verify proration math, verify new invites work, verify cert issuance for new staff is unblocked.
- [ ] **Course content version:** record a course version (e.g., `v1.0.0`) on every issued cert. Verify the dashboard shows version. Manually bump version, issue a new cert, verify both versions coexist for different staff.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate firm from non-idempotent webhook | MEDIUM | Manually merge in Supabase: re-point staff to canonical firm record; refund/void duplicate Stripe charge; backfill idempotency table |
| RLS leak discovered post-launch | HIGH | Treat as security incident: lock down policies immediately, audit logs to see what was accessed, disclose to affected firms (legal-services audience expects this), bring in counsel |
| Cloudflare Stream over-budget month | LOW | Enable Allowed Origins (if not already); identify the source domain hotlinking; if internal, optimize chunk fetching; if external, send DMCA/cease-and-desist |
| n8n VPS data loss | HIGH (if no backup) / MEDIUM (with backup) | Restore from latest backup; replay missed events from Supabase event log; re-issue any missed certs |
| Cert issued in error (wrong score, fake pass) | LOW | Build a "revoke cert" admin action: marks cert as void, adds a row to audit log, optionally emails staff and firm admin |
| Stripe chargeback after cert issued | MEDIUM | Respond with: signed TOS at checkout, refund policy text shown at checkout, cert issuance timestamps, audit log of staff completion. Usually wins |
| Course content provably outdated and cert holder complains | LOW | Issue an addendum module + supplementary cert; communicate "we've updated for [new opinion]" as a renewal value-add |
| Bar complaint references the cert | HIGH (operator's risk) | Be ready: have privacy policy, TOS, DPA, audit log available. Have counsel pre-engaged for this scenario. Cooperate fully. |
| Supabase project paused at critical moment | LOW | Unpause from dashboard (~minutes); upgrade to Pro to prevent recurrence |
| Stripe Tax not configured, back-tax liability discovered | MEDIUM | CPA reviews exposure by state; voluntary disclosure programs in many states reduce penalties; enable Stripe Tax going forward |
| H5P/Rise integration cul-de-sac | MEDIUM | Pivot to custom React quiz overlay over Cloudflare Stream native player. Reuses the video; rebuilds the quiz layer. ~3–5 days of work |
| Mass-failed renewal week (payment processor outage) | LOW | Grace period extends automatically (the certs keep working); customers are not affected; resume normal dunning when processor recovers |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Certificate language as legal advice | Branding/content phase (earliest) | Attorney review of cert template + marketing copy before any public launch |
| 2. PII without privacy framing | Pre-launch foundation phase | Privacy policy, TOS, DPA published; linked from checkout |
| 3. Duplicate firm provisioning | Stripe integration phase | Re-send same Stripe event from dashboard; assert no duplicate records |
| 4. Stream signed-URL expiry | Video integration phase | Test: load player after 2 hours; cert URL works after 24 hours |
| 5. Supabase free-tier pause | Foundations phase | Pro tier decision documented; keep-warm cron on non-prod |
| 6. RLS cross-tenant leak | Schema/auth phase | Two-firm seed; explicit cross-tenant isolation test in CI |
| 7. n8n pipeline silent failure | Automation phase | UptimeRobot alert configured; queue + dead-letter implemented; backup restore tested |
| 8. Cloudflare Stream bandwidth surprise | Video integration phase | Allowed Origins set; budget alert at $50/month |
| 9. H5P/Rise + Cloudflare Stream integration | Course-delivery phase (earliest decision point) | Decision documented before video upload; recommend custom React overlay |
| 10. PDF generation timeout/OOM | Certificate generation phase | Render in n8n or lightweight library, not Netlify Chromium |
| 11. Refund/trial creep | Checkout phase | Refund eligibility check in code; refund policy at checkout |
| 12. Mid-cycle seat upgrade | Dashboard/seat-management phase | "Add seats" flow ships before first customer reaches cap |
| 13. Stripe Tax not configured | Stripe integration phase | Stripe Tax enabled before first transaction |
| 14. Renewal pricing/timing | Stripe integration phase | Renewal price ID stored on firm record; 30/14/3 day reminders configured |
| 15. Course content goes stale | Post-launch ops; data model in early phase | Course-version column on certificates from start; quarterly review on calendar |
| 16. Password reset support burden | Auth phase | Magic-link default for staff; self-serve resend |
| 17. Audit log missing | Schema phase | `training_events` table with append-only RLS; CSV export from dashboard |
| 18. Cross-browser quiz compatibility | QA phase pre-launch | iPad Safari + Chromebook test pass |
| 19. Solo-operator over-engineering | Every phase | Time-box phases to days, not weeks; no admin UI until 3+ paying firms; hardcode workflows |

---

## Sources

**ABA / legal-ethics framing:**
- [ABA Formal Opinion 512: AI in Legal Practice (UNC Law Library overview)](https://library.law.unc.edu/2025/02/aba-formal-opinion-512-the-paradigm-for-generative-ai-in-legal-practice/)
- [ABA Ethics Opinion on Generative AI (Business Law Today)](https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-october/aba-ethics-opinion-generative-ai-offers-useful-framework/)
- [ABA Model Rules 1.1, 1.6, 5.3 and AI (Claire)](https://www.letsaskclaire.com/legal/aba-model-rules-ai-compliance)
- [AI and Attorney Ethics 50-State Survey (Justia)](https://www.justia.com/trials-litigation/ai-and-attorney-ethics-rules-50-state-survey/)
- [Unauthorized Practice of Law (California State Bar)](https://www.calbar.ca.gov/public/concerns-about-attorney/avoid-legal-services-fraud/unauthorized-practice-law)

**Supabase:**
- [Supabase Pricing & Free Tier Limits](https://supabase.com/pricing)
- [Supabase Pausing Pro-Projects Troubleshooting](https://supabase.com/docs/guides/troubleshooting/pausing-pro-projects-vNL-2a)
- [Supabase RLS Best Practices (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Why Your Supabase Data Is Exposed (Lovable incident analysis)](https://dev.to/jordan_sterchele/why-your-supabase-data-is-exposed-and-you-dont-know-it-25fh)
- [Multi-Tenant SaaS RLS Patterns (AntStack)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)

**Cloudflare Stream:**
- [Cloudflare Stream Pricing](https://developers.cloudflare.com/stream/pricing/)
- [Securing Cloudflare Stream (signed URLs, Allowed Origins)](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
- [Cloudflare Stream Signed URL Piracy Prevention discussion](https://community.cloudflare.com/t/cloudflare-stream-preventing-signed-urls-tokens-piracy/274607)

**Stripe:**
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe Webhook Idempotency & Security (DEV)](https://dev.to/whoffagents/stripe-webhook-security-signature-verification-idempotency-and-local-testing-1lk3)
- [Stripe Subscription Prorations](https://docs.stripe.com/billing/subscriptions/prorations)
- [Stripe Smart Retries (Revenue Recovery)](https://docs.stripe.com/billing/revenue-recovery/smart-retries)
- [Stripe Tax overview](https://stripe.com/tax)
- [SaaS Taxability in the US (Stripe guide)](https://stripe.com/guides/introduction-to-saas-taxability-in-the-us)

**n8n:**
- [n8n Hosting Documentation](https://docs.n8n.io/hosting/)
- [n8n Security Hardening Checklist (MassiveGRID)](https://massivegrid.com/blog/n8n-security-hardening-checklist/)
- [Common Mistakes When Hosting n8n on a VPS (YouStable)](https://www.youstable.com/blog/common-mistakes-when-hosting-n8n-on-a-vps)
- [n8n Webhooks Are Public (Flowgenius)](https://flowgenius.in/insecure-webhook-exposure/)
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)

**H5P / Articulate Rise:**
- [H5P Cloud Flare Video for Interactive Video (community thread, confirms no native support)](https://h5p.org/node/1264738)
- [H5P Supported External Video Platforms](https://help.h5p.com/hc/en-us/articles/25222952007069-Supported-External-Video-Platforms)
- [Articulate Rise Embedded Share Links FAQ](https://articulate.com/support/article/Rise-360-Embedded-Share-Links-FAQs)
- [H5P xAPI documentation](https://h5p.org/documentation/x-api)

**Solo SaaS / business:**
- [SaaS Refund Policy guidance (TermsFeed)](https://www.termsfeed.com/blog/saas-refund-policy/)
- [Digital Product Refund Policy Best Practices](https://www.destinicopp.com/blog/refunds-for-digital-products)
- [Solo-Founder Playbook (ProductLed)](https://productled.com/blog/the-solo-founder-playbook-how-to-run-a-1m-arr-saas-with-one-person)
- [PDF generation on Netlify / serverless (Browserless guide)](https://www.browserless.io/blog/puppeteer-netlify)

---
*Pitfalls research for: AI Compliance Training Platform (ABA Model Rule 5.3, solo/small attorney firms)*
*Researched: 2026-05-19*
