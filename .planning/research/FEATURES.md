# Feature Research

**Domain:** Attorney-staff compliance training / micro-LMS / certification (ABA Model Rule 5.3 supervision evidence)
**Researched:** 2026-05-19
**Confidence:** HIGH (table stakes, anti-features), MEDIUM (differentiators — opinion-driven from competitor analysis)

## Executive Framing

This is **not** a generic LMS. It's a one-course, one-certificate compliance product where the **artifact** (a defensible audit trail + a clean PDF certificate) is the value, and the training itself is the smallest viable wrapper around that artifact.

The buyer (the attorney) and the user (their paralegal/legal assistant) have different jobs to be done:

- **Buyer's job:** Produce supervision evidence under Rule 5.3 with as little effort as possible, and renew without thinking about it.
- **User's job:** Get through a 20–30 min course as painlessly as possible and never hear about it again until next year.

Every feature decision below is filtered through one question: *does this make the artifact more defensible, or the path to the artifact shorter?* Anything that doesn't do one of those two things is an anti-feature for v1.

---

## Feature Landscape

### Table Stakes (Users Expect These — Missing Them = Amateur)

#### Firm Admin (Buyer) — Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single-pane dashboard listing every seat: name, email, status (not invited / invited / in progress / passed / failed-in-progress / certified), completion date, score, certificate link | This is what the attorney is paying for. A dashboard that doesn't show "who is certified, when, and where's the proof" makes the product feel broken. | M | One screen, one table, sortable. Resist tabs/filters/drilldowns in v1. |
| Bulk seat invitation (email-by-email entry OR CSV upload of name+email) | Solo attorneys with 5–15 staff will not invite people one at a time if Trainual/Workable/Freshservice trained them to expect CSV. | M | CSV is the lower bar; an "add row" UI handles the 1–5 staff case fine. |
| Resend invitation / regenerate invite link | People lose emails. The admin will need to re-send within 30 days of purchase 100% of the time. | S | One button per row. |
| Certificate reprint / re-download from the admin view | If the staff member loses theirs or the attorney is asked for it by malpractice insurer, they need to get it without contacting support. | S | Already in scope — make sure admin path exists, not just employee path. |
| Reminder nudge (manual button → email + automated cadence) | Staff will stall on training. Admin needs to push them without picking up the phone. n8n already handles automated reminders; the admin should also be able to fire one manually. | S | "Send reminder" button per row + automated 7/14/21-day nudges. |
| Per-seat assignment timestamp + completion timestamp visible to admin | An audit trail with no timestamps is not an audit trail. | S | Already implicit in tracking; surface it in the UI. |
| Account/billing page: see plan, seat count, renewal date, update payment method | Stripe Customer Portal handles this. Not having it makes you look unprofessional. | S | Stripe Billing Portal redirect is the cheapest path. |
| Account-level audit log (admin can see "X was invited Y date, completed Z, attempt count N") exportable to CSV/PDF | If the attorney gets a bar complaint or malpractice question, they need to hand over a single document. | M | CSV export is sufficient for v1; PDF roster export is a nice add. |
| Email notifications when a staff member completes (to admin) | Otherwise the admin has to check the dashboard. Removes one entire reason to log in. | S | n8n trigger on pass. |
| Seat reassignment when a staff member leaves the firm | This is a SaaS expectation, not a nice-to-have. If a paralegal leaves in month 3, the attorney expects to give their seat to the new hire without paying again. Standard across HubSpot, Claude Team, Trainual, etc. | M | Admin marks seat "departed" → seat returns to pool → new invite re-uses it. **The departed user's certificate must remain visible in the audit log even after seat reassignment** — this is the compliance value. |

#### Staff (End User) — Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Resume-where-you-left-off in the video | Industry standard since Articulate/Coursera/Labster. Closing a tab and losing 15 minutes will generate support tickets and rage. | M | Persist last video timestamp + completed quiz state to Supabase on each event. |
| Personal copy of the certificate emailed to them | The staff member will frame this / link to it on LinkedIn / save it for resume. If only the admin gets it, the staff member feels like inventory. | S | n8n sends to employee + stores in admin's view. Already in scope. |
| Mobile-completable (responsive, can finish on a phone or tablet) | Paralegals do training on lunch break, commute, evenings. Locking it to desktop is hostile in 2026. | M | Next.js + Cloudflare Stream is mobile-friendly by default; quiz layer (H5P/Rise) must be verified responsive. |
| Clear progress indicator (X of Y modules, % complete) | Standard. Knowing how much is left is the difference between "ugh, fine" and "I quit." | S | Free with any modern LMS or microcourse player. |
| Pass/fail feedback immediately after each quiz attempt | Hiding the score until the end feels punitive. | S | Show score + which questions missed (without revealing correct answer in v1 if retakes are unlimited — see retake mechanics below). |
| Closed-caption / subtitles on the video | Accessibility expectation and a real comprehension aid for non-native speakers / noisy offices. Cloudflare Stream supports auto-captions. | S | Enable Cloudflare Stream caption track; consider human-corrected for launch. |

#### Compliance Evidence — Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Unique, non-guessable certificate ID on every cert (e.g., `BSBR-2026-A7K9-3M2P`) | This is the single feature that separates "real" cert from "PDF I made in Canva." Bar counsel / malpractice carriers expect to see one. | S | UUIDv4 → short hash. Print on cert + store in DB. |
| Certificate includes: recipient name, course name, course version, issue date, expiry date, issuer (Built Smart by Rob / firm name), Rule 5.3 reference | Sertifier and other credential-issuers list these as the minimum field set for audit-readiness. Missing fields = "this looks fake." | S | PDF template work. |
| Tamper-evident PDF (signed via PDF signature or, simpler, a unique cert ID printed on the PDF tied to a DB record) | If anyone challenges the cert, you need to point at a record. | S | DB-stored unique ID is sufficient for v1; signed PDFs are overkill. |
| Audit log of completion events: timestamp, IP address, user-agent, attempt number, final score | This *is* the supervision evidence. Without it, the PDF is just a participation trophy. | M | Log every quiz submit + final pass event with IP + UA. Surface in admin export. |
| Certificate expiry tracking + dashboard surfacing of staff approaching expiry | Annual recert is the revenue model. The admin should see "3 staff expire in 30 days" before getting a renewal email. | S | Already in scope. |

### Differentiators (Where "Built Smart by Rob" Can Win vs. Ethena / Lawline / Generic LMS)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Single course, single price, no SKU forest** | Ethena, KnowBe4, Lawline all have a course-library shopping experience. For a solo attorney who just needs Rule 5.3 supervision evidence, that's noise. "Pay $199, certify your 5 staff, done" is the differentiator. | S | This is a product positioning differentiator, enforced by the codebase being one-course. **Do not** build a course catalog. |
| **Audit-ready single-PDF roster export** | One button → PDF that says "On 2026-MM-DD, all 5 staff of [Firm Name] held active certification under ABA Rule 5.3. Here is the cert ID, completion date, and score for each." This is the artifact an attorney hands to their malpractice carrier or shows in a bar inquiry. Compliance.ai, Ethena, KnowBe4 dashboards export CSV; almost none produce a one-page firm-level compliance attestation. | M | n8n can render this. High perceived value, low build cost. **Strong recommendation: ship this in v1.** |
| **Plain-English explainer of WHAT the cert actually proves** in the admin dashboard | Every other compliance product assumes the buyer understands compliance theater. Solo attorneys often do not. A small "What this cert means under Rule 5.3" expandable on the dashboard removes ambiguity and provides reassurance. | S | Static copy. Huge trust-building win for the price tier. |
| **Recertification reminder cadence written by a lawyer for lawyers** | Generic LMS reminders read like "Your annual compliance assignment is due." A reminder that reads "Your staff's Rule 5.3 supervision certification expires Nov 14. Renewing now keeps your supervision documentation continuous." is dramatically more effective for this buyer. | S | Copywriting + n8n templates. |
| **One-question-at-a-time quiz with no back-button + per-question randomization from a pool** | This is the cheapest, most credible anti-trivialization control. It makes unlimited retakes defensible: yes, you can retake forever, but each attempt is genuinely a different test, and you can't refer back to question 3 while answering question 5. | M | Requires question pool of 3–4x final quiz size (see Pitfalls). H5P and Articulate Rise both support this; verify in stack selection. |
| **Identity attestation checkbox + signed completion statement** | Before final submit: "I, [name], certify that I personally completed this training as identified above." Captured + stored with IP/UA. This is the single biggest credibility lift you can do without proctoring. Cheaper than honor-code proctoring, more defensible than nothing. | S | One checkbox + DB record. |
| **"Built Smart by Rob" brand voice in every email/UI element** | This is a small-firm sales differentiator. Solo attorneys buy from people they trust, not platforms. Plain language, no enterprise jargon, no "Your Compliance Journey Begins" cringe. | S | Copywriting only. |
| **Renewal flow that re-enrolls existing staff with one click** | Generic LMS renewal = re-buy + re-invite. A renewal that auto-re-enrolls last year's staff (minus departed ones) at 60% price is meaningfully better UX and locks in the recurring revenue. | M | Already implied in scope, but the *one-click* nature of it is the differentiator. |

### Anti-Features (Commonly Built, Deliberately NOT Building)

| Feature | Why Commonly Requested | Why Problematic | Alternative |
|---------|------------------------|-----------------|-------------|
| **Course catalog / multiple courses / learning paths** | "LMS-shaped" thinking. Every compliance platform expands its SKU set. | Doubles the UI complexity, forces module/lesson navigation, creates "which course do I assign?" admin work. Already explicitly out of scope. | One course. One cert. One price. |
| **Gamification: badges, leaderboards, streaks, XP** | Research shows it can improve completion in long-form L&D programs. | Wrong audience. A 47-year-old paralegal does not want a "First Quiz Completed!" confetti animation in their compliance training. Research (BYU True Office study, Convercent) shows gamification only helps when training is long and recurring — not for one-shot 30-minute certs. Risks making the cert feel *less* serious to the attorney buyer. | Plain progress bar. That's it. |
| **Social features (comments, discussion boards, peer review, sharing)** | Drives engagement in consumer learning products. | Adds moderation surface, accessibility surface, and creates "who can see my answers?" privacy questions in a workplace context. Zero relevance to a supervision-evidence product. | None. Do not build. |
| **Custom course authoring for the firm** | Larger firms ask for it; LMS vendors upsell it. | Drags the product toward enterprise LMS territory. Already out of scope. | The course is fixed. If a firm wants custom training, they're not the customer. |
| **Heavy LMS navigation (modules, lessons, sub-lessons, prerequisites)** | Default in every LMS template. | For a 20–30 min course, this is hostile. Coursy.io and others document that "locked navigation + forced linear progression" is a top complaint. Forced linear is acceptable here (compliance) but the architecture should be one course → quiz → certificate, not modules/lessons. | Single video player + final quiz. |
| **In-product chat / live support / chatbot** | Adds support surface. | For a $199/year product with self-serve flow, a chat widget is operator overhead. Worse, it implies the product is complicated. | Email-only support. FAQ page. |
| **State-specific course variants in v1** | Already in PROJECT.md as out of scope, repeated here because it's the #1 scope-creep risk for this product. | Multiplies content + maintenance. State bars haven't required state-specific Rule 5.3 training — the rule itself is the framework. | National generic only. Revisit only if a specific state bar issues an opinion that mandates state-specific content. |
| **CLE credit accreditation** | Attorneys ask "does this count for CLE?" out of habit. | CLE accreditation is per-state, per-provider, recurring paperwork, and fundamentally a different product (the attorney consumes it, not their staff). Already out of scope. | Marketing copy clarifies: "This is supervision evidence under Rule 5.3, not CLE credit for the attorney." |
| **Public certificate verification page** ("anyone can look up cert XYZ123") | Sertifier, Credly, etc. make this look like a standard. | Privacy issue (staff names indexable), low-value for the buyer (no one is actually verifying paralegal certs externally), and the cert ID + admin dashboard already provide internal verification. Already out of scope. | Cert ID printed on PDF + admin dashboard lookup. If demand validates, add later. |
| **HRIS integrations (BambooHR, Gusto, Rippling, ADP)** | Ethena's headline feature. | Solo and 5-person firms do not have an HRIS. Adding integrations adds vendor sprawl + auth surface for zero value to this segment. | CSV upload + manual invite. That's enough for 1–15 staff. |
| **Per-question time limits / time-locked retakes / 24hr cool-down between attempts** | Industry advice for high-stakes certification testing. | This is unlimited-retake by design — the cert is the outcome the buyer paid for. Adding friction to retakes undercuts the value prop. Question pool randomization is the credibility control instead. | Question randomization + one-question-at-a-time + identity attestation. |
| **Mobile native app (iOS/Android)** | Lawline has one. | Maintenance overhead, app store review pain, and a responsive web app on Cloudflare Stream covers the use case. | Mobile-responsive web only. |
| **Proctoring / webcam monitoring / browser lockdown** | Honorlock, Proctortrack, Integrity Advocate. | Wildly disproportionate to a $199/year compliance cert for a paralegal. Would actively harm the product. | Identity attestation checkbox + IP/UA log + unique cert ID. |
| **SSO / SAML / SCIM** | Standard for mid-market and enterprise. | Already out of scope. Solo/small firms use email-password, full stop. | Email + password (Supabase Auth). Magic links optional in v1.1. |
| **Sentiment surveys, feedback collection, NPS in-product** | Ethena pushes this hard. | Adds UI surface and asks the wrong question. The product's "did this work?" measure is renewal rate, not survey score. | Post-renewal email-only survey if needed later. |

---

## Compliance Evidence Sub-Section (Critical for This Domain)

Because the entire product is "produce a defensible compliance artifact," compliance evidence deserves its own focused breakdown. **These are all table stakes — but they're easy to under-build, so calling them out separately:**

### What Makes the Cert "Real" to an Attorney

1. **Unique certificate ID** (printed on PDF, stored in DB, looked up via admin dashboard) — separates "real cert" from "Canva PDF."
2. **Course version reference** on cert — proves which version of the curriculum the staff completed (matters if the curriculum updates and someone is audited for a prior year).
3. **Issuer identification** — "Built Smart by Rob" + firm name + a postal/contact address on the cert face. A cert with no identifiable issuer is worthless.
4. **Identity attestation** — checkbox at quiz submit: "I, [name], personally completed this training." Captured with timestamp, IP, user-agent.
5. **Immutable audit log** — every invite, login, video-start, video-complete, quiz-attempt, quiz-pass event stored with timestamp + IP + UA. The admin sees a clean summary; the export contains the raw events.
6. **Expiry date on cert face** — explicitly. "Valid through 2027-MM-DD." Implicit expiry is not evidence; printed expiry is.
7. **Pass score printed on cert** — not just "passed," but "passed with 87%."

### Required Audit Log Fields per Event

| Event | Fields |
|-------|--------|
| Invite sent | timestamp, admin_user_id, invited_email, seat_id |
| First login | timestamp, user_id, ip, user_agent |
| Video started | timestamp, user_id, video_id, ip |
| Video completed | timestamp, user_id, video_id, watch_duration_seconds, ip |
| Quiz attempt | timestamp, user_id, attempt_number, question_ids_served, score, passed (bool), ip, user_agent |
| Identity attestation | timestamp, user_id, attested_name, ip, user_agent |
| Certificate issued | timestamp, user_id, certificate_id, course_version, issue_date, expiry_date |
| Seat reassigned | timestamp, admin_user_id, old_user_id, new_user_id, seat_id, reason |

### CSV Export Schema (admin → "Export audit log")

```
firm_id, firm_name, employee_email, employee_name, seat_id,
invited_at, first_login_at, video_completed_at,
attempt_count, final_score, passed_at, certificate_id,
course_version, issue_date, expiry_date, status
```

---

## Retake Mechanics (Unlimited-Retake Defensibility)

The product allows unlimited retakes. To prevent this from trivializing the cert (which would harm the artifact's defensibility), v1 should ship these controls:

1. **Question pool randomization.** Pool of ~24–32 questions; quiz draws 8–10 per attempt. Industry rule of thumb: pool size 3–4x the per-attempt count.
2. **One question at a time, no back button within an attempt.** Standard anti-memorization control. Both H5P and Articulate Rise support this.
3. **Identity attestation at every attempt** (not just the passing one). Re-affirms each retake was the same person.
4. **Attempt counter on the cert audit log.** If someone takes 14 attempts to pass, that's recorded. Not visible on the cert face (would undermine the staff member), but visible in the admin's audit log and the CSV export.
5. **Do not reveal correct answers between attempts in v1.** Show "you got X wrong" but not what the right answer was. This preserves question-pool integrity. Optional v1.1: reveal answers after final pass.

Deliberately **NOT** doing in v1:
- Time-locked retakes (24/48hr cooldown) — too punitive for the price tier.
- Maximum attempt cap — explicitly out of scope per PROJECT.md key decisions.
- Proctoring — out of scope per anti-features.

---

## Feature Dependencies

```
Stripe checkout
    └─ provisions firm + seat tier
        └─ admin can invite staff
            └─ staff log in (Supabase Auth)
                └─ staff watch video (Cloudflare Stream)
                    └─ resume-from-timestamp persists progress
                        └─ staff take quiz (H5P or Rise)
                            └─ score-gate determines pass/fail
                                └─ pass → identity attestation
                                    └─ n8n generates PDF cert
                                        └─ cert stored in Supabase Storage
                                            └─ cert linked from admin dashboard
                                            └─ cert emailed to employee
                                                └─ audit log row written

Audit log
    └─ feeds admin's CSV export
    └─ feeds firm-level compliance attestation PDF (differentiator)

Certificate expiry (12mo)
    └─ triggers n8n reminder cadence (90d / 30d / 7d before expiry)
        └─ admin sees expiring staff on dashboard
            └─ renewal flow re-enrolls same staff at 60% price
                └─ new invite cycle begins

Seat reassignment
    └─ admin marks employee "departed"
        └─ certificate retained in audit log (DO NOT delete)
        └─ seat returns to firm pool
            └─ admin invites new staff member to reclaimed seat
```

### Critical Dependency Notes

- **Audit log writes must be atomic with state changes.** If the cert PDF generates but the audit row doesn't, the artifact has no provenance. n8n should write the log row first, generate cert second, on cert success update log row with cert_id.
- **Departed-staff cert retention is non-optional.** When a seat is reassigned, the original certificate must remain visible in the audit log forever. This is the supervision-evidence value: "Yes, paralegal Jane was certified in 2026 during the period she worked here."
- **Quiz layer choice (H5P vs Rise) affects retake mechanics feasibility.** Both support question pools + randomization + no-back-nav, but H5P's open-source path requires more wiring; Rise is faster but proprietary. Verify in stack research, not here.
- **Email deliverability is a hidden dependency.** Invitations, reminders, completion notices, and cert delivery all flow through email. If email goes to spam, the entire product breaks silently. Use a transactional email provider (Postmark / Resend) with proper SPF/DKIM/DMARC — do **not** send from a generic Gmail or Netlify default.

---

## MVP Definition

### Launch With (v1)

**Firm Admin (Buyer):**
- [ ] Stripe checkout → firm account provisioning
- [ ] Stripe Customer Portal link for billing management
- [ ] Single-table dashboard: all staff, status, score, completion date, cert link
- [ ] Add staff via individual entry OR CSV upload
- [ ] Resend invite + manual reminder button per staff member
- [ ] Certificate reprint/download from admin view
- [ ] Audit log CSV export
- [ ] **Firm-level compliance attestation PDF export** (one-button, the differentiator)
- [ ] Seat reassignment when staff departs (with cert retention)
- [ ] Expiry view: dashboard shows staff expiring in next 90 days
- [ ] One-click renewal flow at 60% price, auto-re-enrolling current staff
- [ ] Email notification to admin on staff completion

**Staff (User):**
- [ ] Email invite → set password → log in (Supabase Auth)
- [ ] Resume-where-you-left-off video player
- [ ] Mobile-responsive playback (Cloudflare Stream + Next.js)
- [ ] Closed captions on video
- [ ] Progress indicator (X of Y, % complete)
- [ ] Quiz with question-pool randomization, one-question-at-a-time, no back button
- [ ] Immediate pass/fail feedback per attempt
- [ ] Identity attestation checkbox before final submit
- [ ] Unlimited retakes
- [ ] Cert emailed to staff member personally on pass
- [ ] Cert accessible from staff dashboard

**Compliance Evidence:**
- [ ] Unique cert ID on every cert
- [ ] Cert PDF includes: name, course name, course version, issue date, expiry date, issuer, score, Rule 5.3 reference, cert ID
- [ ] Audit log captures: invite, login, video start/complete, every quiz attempt, identity attestation, cert issuance, seat changes — all with timestamp + IP + UA
- [ ] 12-month expiry tracking with automated reminder cadence (90/30/7 day)

### Add After Validation (v1.x)

- [ ] Magic-link login (passwordless) — reduces first-login friction; defer until v1 password flow proves to be the dropoff
- [ ] Public cert verification page (cert ID lookup) — defer until a customer asks for it
- [ ] Reveal correct quiz answers after final pass (training value) — defer; ship cleaner v1
- [ ] Cert language localization (Spanish-language paralegals) — defer until market signal
- [ ] Per-staff custom message in invite email — defer; default copy is good enough for v1
- [ ] Webhook out (admin-defined endpoint receives completion events) — defer; few small-firm buyers will use it

### Future Consideration (v2+)

- [ ] State-specific course variants (only if state bars actually require it; do not pre-build)
- [ ] White-label / co-brand for managed legal IT providers reselling to their firms
- [ ] Course catalog (a second course — e.g., Rule 1.6 confidentiality + AI) — only after Rule 5.3 v1 proves repeat purchase
- [ ] SSO (only if mid-firm segment validates as a real customer)
- [ ] HRIS integration (only when a customer specifically requests + segment justifies)
- [ ] CLE credit pathway — separate product motion, not an extension of this one

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Dashboard with staff status + cert links | HIGH | MEDIUM | P1 |
| Stripe checkout + seat provisioning | HIGH | MEDIUM | P1 |
| Email invite + Supabase Auth login | HIGH | LOW | P1 |
| Cloudflare Stream video player + resume | HIGH | MEDIUM | P1 |
| Quiz with score gate + unlimited retakes | HIGH | MEDIUM | P1 |
| Question pool randomization | HIGH | MEDIUM | P1 |
| Identity attestation checkbox | HIGH | LOW | P1 |
| Unique cert ID + PDF generation via n8n | HIGH | MEDIUM | P1 |
| Audit log capture (every event, IP, UA) | HIGH | MEDIUM | P1 |
| Cert email to employee + admin visibility | HIGH | LOW | P1 |
| Seat reassignment | HIGH | MEDIUM | P1 |
| Expiry tracking + reminder cadence (n8n) | HIGH | LOW | P1 |
| Renewal flow at 60% with re-enrollment | HIGH | MEDIUM | P1 |
| CSV audit log export | MEDIUM | LOW | P1 |
| Firm-level compliance attestation PDF | HIGH | MEDIUM | P1 (differentiator) |
| Bulk CSV upload of staff | MEDIUM | LOW | P1 |
| Captions on video | MEDIUM | LOW | P1 |
| Mobile-responsive | HIGH | LOW (free w/ Next.js) | P1 |
| Stripe Customer Portal link | MEDIUM | LOW | P1 |
| Manual reminder-nudge button | MEDIUM | LOW | P1 |
| Reveal quiz answers after final pass | LOW | LOW | P2 |
| Magic-link login | LOW | LOW | P2 |
| Public cert verification page | LOW | MEDIUM | P3 |
| HRIS integration | LOW | HIGH | P3 |
| SSO / SAML | LOW | HIGH | P3 |
| Multiple courses | LOW | HIGH | P3 (out of scope v1) |
| Gamification | NEGATIVE | MEDIUM | NEVER |
| Proctoring | NEGATIVE | HIGH | NEVER |
| Social features | NEGATIVE | HIGH | NEVER |

**Priority key:** P1 = ship in v1, P2 = v1.x after validation, P3 = v2+, NEVER = anti-feature.

---

## Competitor Feature Analysis

| Feature | Ethena | KnowBe4 (Compliance Plus) | Lawline | Generic Micro-LMS | Built Smart by Rob (our approach) |
|---------|--------|---------------------------|---------|-------------------|------------------------------------|
| Course catalog | Yes (large) | Yes (huge library) | Yes (2,000+ CLE) | Yes | **No — single course on purpose** |
| Admin dashboard | Yes, fancy | Yes, enterprise-grade | Yes | Yes | Yes, ruthlessly simple |
| Certificate generation | Yes | Yes | Yes (instant) | Yes | Yes, with cert ID |
| Audit log | Yes (Platinum+ tier only) | Yes (Platinum+/Diamond, 180-day window) | Yes | Varies | **Yes, included, exportable** |
| HRIS integration | Yes (BambooHR, ADP, etc.) | Yes (enterprise) | No | Some | **No (anti-feature for segment)** |
| Bulk CSV upload | Yes | Yes | Yes | Yes | Yes |
| Pricing model | Per-seat subscription | Per-seat subscription | Subscription per attorney | Varies | **Flat annual fee per seat tier** |
| Self-serve signup | Yes (under 100 learners) | No (enterprise sales) | Yes | Yes | Yes |
| Reminders / nudges | Yes (automated) | Yes | Yes | Yes | Yes (admin manual + n8n auto) |
| Gamification | Some | Some | No | Varies | **No (anti-feature)** |
| Proctoring | No | No | No | Some | **No (anti-feature)** |
| Identity attestation | Implicit | Implicit | Implicit | Varies | **Explicit checkbox + audit row** |
| Rule 5.3 / supervision framing | No (general HR/IT) | No (general security) | CLE for attorney, not staff | No | **Yes — entire positioning** |
| Firm-level compliance attestation export | No | Reports, not single artifact | No | No | **Yes — key differentiator** |
| Renewal at discount | Varies | No | Subscription | Varies | **Yes — 60% on annual renewal** |
| Annual recertification model | Some | Yes | Annual MCLE cycle | Varies | **Yes (core to pricing)** |

**Where we win:** Positioning, scope discipline, the firm-level attestation export, and a price point ($199–$499) that no enterprise compliance vendor will touch.

**Where we are deliberately worse:** Course breadth (we have one), integration depth (we have none), enterprise features (no SSO, no SCIM). These are intentional trade-offs for the segment.

---

## Phase / Roadmap Implications

Suggested phase ordering (handing off to roadmap research):

1. **Foundation phase:** Next.js + Supabase scaffolding, auth, basic firm + user data model. Lays the audit-log substrate.
2. **Checkout + provisioning phase:** Stripe → firm account → seat allocation → invite flow. Without this nothing else works.
3. **Course delivery phase:** Cloudflare Stream + quiz layer (H5P or Rise — decide in stack research) + resume-where-you-left-off + identity attestation. The user-facing core.
4. **Certification phase:** n8n PDF generation, unique cert IDs, audit log write-paths, email delivery. The artifact.
5. **Admin dashboard phase:** Status table, CSV export, **firm-level compliance attestation PDF export (the differentiator)**, reminder buttons, seat reassignment.
6. **Renewal/recert phase:** Expiry tracking, automated reminder cadence, 60%-discount renewal flow. Required for the business model but not for first paying customer.

Recertification phase can be sequenced last because the first cohort's expiry is 12 months out — there's runway to ship it after launch as long as the data model captures expiry dates from day one.

**Phases that need deeper research before building:**
- Course delivery phase (H5P vs Rise decision, Cloudflare Stream + quiz interop)
- Certification phase (PDF generation tooling under n8n, cert template design, email deliverability setup)

**Phases that are standard patterns:**
- Foundation, checkout, admin dashboard, renewal — well-trodden SaaS patterns.

---

## Sources

- [Ethena pricing and platform features](https://www.goethena.com/platform/)
- [Ethena G2 reviews](https://www.g2.com/products/ethena/reviews)
- [KnowBe4 Audit Log Overview](https://support.knowbe4.com/hc/en-us/articles/23542330166163-KnowBe4-Audit-Log-Overview)
- [KnowBe4 Compliance Plus](https://www.knowbe4.com/products/compliance-plus)
- [Lawline CLE platform](https://www.lawline.com/)
- [ABA Model Rule 5.3 — Responsibilities Regarding Nonlawyer Assistance](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_5_3_responsibilities_regarding_nonlawyer_assistant/)
- [ABA Formal Opinion 512: A Compliance Guide](https://legalaigovernance.com/resources/aba-opinion-512/)
- [Sertifier — Verifiable Certificate of Completion](https://sertifier.com/blog/verifiable-certificate-of-completion/)
- [Sertifier — Certificate of Training Governance Playbook](https://sertifier.com/blog/certificate-of-training-governance-playbook/)
- [Best Practice: Using Question Pools (Elucidat)](https://support.elucidat.com/hc/en-us/articles/4402595801745-Best-Practice-Using-Question-Pools)
- [Why Question Randomization Is Essential (OnlineExamMaker)](https://onlineexammaker.com/kb/why-question-randomization-is-essential-for-fair-and-cheat-resistant-online-testing/)
- [Compliance Testing Best Practices (Skillcast)](https://www.skillcast.com/blog/compliance-testing-best-practices)
- [Why Employees Hate Compliance Training (Coursy)](https://coursy.io/blog/2026/03/24/why-employees-hate-compliance-training-and-what-actually-works-instead/)
- [Effects of Gamification on Compliance Training (BYU)](https://scholarsarchive.byu.edu/facpub/8284/)
- [Recertification Reminder Workflow (RenewOps)](https://renewops.app/guides/recertification-reminder-workflow)
- [Resume Video Where Learner Left Off (Articulate Community)](https://community.articulate.com/discussions/discuss/resume-video-where-the-learner-left-off/605193)
- [Seat-Based Licensing and Reassignment Patterns (Verus Trust)](https://verustrust-licensing.com/blog/seat-based-vs-concurrent-licensing/)
- [Bulk Invite Team (Trainual)](https://help.trainual.com/en/articles/5581415-bulk-invite-team)
- [SCORM vs xAPI (iSpring)](https://www.ispringsolutions.com/blog/xapi-vs-scorm)
- [Online Proctoring for Corporate Training (Honorlock)](https://honorlock.com/corporate/)

---
*Feature research for: Attorney-staff compliance training (Rule 5.3 supervision evidence)*
*Researched: 2026-05-19*
