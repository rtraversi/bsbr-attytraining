# Data inventory — Iurix

**Built 2026-08-03 from the live schema and code, not from a template.** Every row below was read
out of `types/supabase.ts`, the migrations, or the route that writes it. Nothing here is assumed.

**This is not a legal document.** It is the factual worksheet that Privacy, Cookies and the DPA are
all written *from*. Write it once and those three cannot contradict each other.

## How to use it

Four columns are already filled because only the code knows them: **what, whose, where it lives,
who else sees it.**

**Two columns are yours**, because they are business decisions, not code facts:

- **Why** — the purpose, in one clause. If you cannot state it, that is a signal you should not be
collecting it.
- **How long** — retention. The column everyone fudges. For a compliance product this is a
*feature*, not a liability: "we keep certificates indefinitely because they are your Rule 5.3
evidence" is a good answer. The awkward ones are quiz attempts, training events, and a departed
employee's record.

---



## The controller / processor split

This distinction is the entire point of the DPA, and it is not uniform across the product.


| Data                                                     | Iurix is the…  | Because                                                                     |
| -------------------------------------------------------- | -------------- | --------------------------------------------------------------------------- |
| Staff names, training records, quiz scores, certificates | **Processor**  | The firm decides who is enrolled and why. We process on their instructions. |
| The firm's own account and billing data                  | **Controller** | We decide to collect it, for our own contractual purpose.                   |
| Website visitors                                         | **Controller** | Our site, our decision.                                                     |


---



## Section A — staff data (Iurix is PROCESSOR, the law firm is CONTROLLER)


| What                                       | Whose            | Where it lives                                                               | Who else sees it                  | Why *(yours)*                                                                                                                                                                                                                                                                                                                            | How long *(yours)* |
| ------------------------------------------ | ---------------- | ---------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Email address                              | Admin + employee | Supabase `auth.users`                                                        | Supabase, Resend                  | Necessary for us to know what employee belongs to which firm and which user has admin interface. Supabase serves as our database for safely storing the address of the users and getting everyone their assigned login. Resend sees it as well because they take care of relaying emails for sign up, sign in, notifications, and so on. | pending.           |
| Password (hashed)                          | Admin + employee | Supabase `auth.users`                                                        | Supabase                          | Supabase safely stores admin and employee passwords securily to confirm their log in is legitimate. Serves for indentification.                                                                                                                                                                                                          |                    |
| Full name                                  | Admin + employee | `auth.users.user_metadata.full_name`                                         | Supabase, Resend                  | Same as email address.                                                                                                                                                                                                                                                                                                                   |                    |
| Profile photo                              | Admin + employee | Supabase Storage, `avatars` **bucket**                                       | Supabase, **anyone with the URL** | This is a completely optional choice. Profile photos are cosmetic and supabase only stores their images safely.                                                                                                                                                                                                                          |                    |
| Firm membership + role                     | Admin + employee | `firm_members`, `app_metadata`                                               | Supabase                          | Same as email address and name. It is necessary to identify the employee or admin and if they should have access to admin functinons or not.                                                                                                                                                                                             |                    |
| Invite / activation dates                  | Employee         | `firm_members.invited_at`, `activated_at`                                    | Supabase                          | Serves for audit trail. TBD.                                                                                                                                                                                                                                                                                                             |                    |
| Whether an invite email bounced            | Employee         | `firm_members.invite_email_failed`                                           | Supabase                          | Necessary to ensure user actually got their log in, because without it they can't access what their firm payed for.                                                                                                                                                                                                                      |                    |
| Course position (resume point)             | Employee         | `firm_members.scorm_lesson_location`, `scorm_suspend_data`                   | Supabase                          | Used for encouragement and user experience improvement.                                                                                                                                                                                                                                                                                  |                    |
| Enrolment + completion                     | Employee         | `enrollments`                                                                | Supabase                          | Success signifies the process is done correctly and the fair can get started with their certification process.                                                                                                                                                                                                                           |                    |
| Total time spent training                  | Employee         | `enrollments.total_training_seconds`                                         | Supabase                          | If an account goes stale it could mean an employee has forgotton to do their training, or if they                                                                                                                                                                                                                                        |                    |
| Quiz score + pass/fail                     | Employee         | `quiz_attempts.score`, `passed`                                              | Supabase                          | For audit trail purposes and user feedback for knowledge checks and verfication of completion for final assessment and certification                                                                                                                                                                                                     |                    |
| **Individual answers given**               | Employee         | `quiz_attempts.answers` (JSON)                                               | Supabase                          | Audit trail                                                                                                                                                                                                                                                                                                                              |                    |
| Certificate number, issue + expiry         | Employee         | `certificates`                                                               | Supabase                          | Audit trail and validation of accreditation                                                                                                                                                                                                                                                                                              |                    |
| Certificate PDF (name, score, dates)       | Employee         | Supabase Storage, `certificates` bucket (**private**, 60-second signed URLs) | Supabase                          | Same as before                                                                                                                                                                                                                                                                                                                           |                    |
| **IP address**                             | Employee         | `training_events.ip_address`                                                 | Supabase, Cloudflare              | pending.                                                                                                                                                                                                                                                                                                                                 |                    |
| **Browser user-agent**                     | Employee         | `training_events.user_agent`                                                 | Supabase, Cloudflare              | pending.                                                                                                                                                                                                                                                                                                                                 |                    |
| Every training action + timestamp          | Employee         | `training_events`                                                            | Supabase                          | Audit trail and user experience                                                                                                                                                                                                                                                                                                          |                    |
| Support requests (topic, subject, details) | Admin + employee | Not stored — emailed                                                         | Resend, and the support inbox     | pending.                                                                                                                                                                                                                                                                                                                                 |                    |




**IP and user-agent are captured at four points**, all for identity attestation:
`app/api/quiz/attempt`, `app/api/training/knowledge-check`, and twice in
`app/api/training/content-progress`.

---



## Section B — firm account and billing (Iurix is CONTROLLER)


| What                                             | Whose    | Where it lives                                                       | Who else sees it | Why *(yours)*                                         | How long *(yours)* |
| ------------------------------------------------ | -------- | -------------------------------------------------------------------- | ---------------- | ----------------------------------------------------- | ------------------ |
| Firm name                                        | The firm | `firms.name`                                                         | Supabase         | Audit trail reasons, and user experience,             |                    |
| Owner identity                                   | Admin    | `firms.owner_id`                                                     | Supabase         | same as before plus authentication                    |                    |
| Seat count + tier                                | The firm | `firms.max_seats`, `tier`, `seats`                                   | Supabase, Stripe | authentication and access management                  |                    |
| Subscription status + renewal date               | The firm | `firms.status`, `current_period_end`                                 | Supabase, Stripe | authentication and access management and verification |                    |
| Stripe customer + subscription IDs               | The firm | `firms.stripe_customer_id`, `stripe_subscription_id`                 | Supabase, Stripe |                                                       |                    |
| **Card details**                                 | Admin    | **Never touches Iurix.** Held by Stripe only                         | Stripe           |                                                       |                    |
| Billing address + tax ID                         | Admin    | **Stripe only** (`tax_id_collection` is on)                          | Stripe           |                                                       |                    |
| Invoice history                                  | The firm | **Stripe only**, read live                                           | Stripe           |                                                       |                    |
| Notification preferences                         | The firm | `firms.notify_cert_earned`, `notify_weekly_summary`, `reminder_days` | Supabase         |                                                       |                    |
| Failed-provisioning records (email + Stripe IDs) | Buyer    | `provisioning_failures`                                              | Supabase         |                                                       |                    |


---



## Section C — website visitors


| What                           | Where      | Note                                                                                                                               |
| ------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **No analytics of any kind**   | —          | Verified 2026-08-03: zero tracking scripts in source. No GA, GTM, Plausible, PostHog, Segment, Hotjar, Fathom or Vercel Analytics. |
| **No custom cookies**          | —          | Verified: nothing in the codebase sets a cookie.                                                                                   |
| Session cookies                | Browser    | Supabase auth only, via `@supabase/ssr`. Strictly necessary for login.                                                             |
| Server request logs (incl. IP) | Cloudflare | Standard edge logging, not written to our database.                                                                                |


> **This is a genuinely strong position and it makes the Cookies page short.** With only
> strictly-necessary session cookies and no tracking, you very likely do not need a consent banner.
> **It stops being true the moment anyone adds analytics** — which is why that decision has to be
> made before the Cookies page is written, not after.  
> deu*n*

---



## Sub-processor register (this section *is* DPA §4)


| Sub-processor  | Entity                 | What it processes                                                                                               |
| -------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Supabase**   | Supabase Inc.          | Database, authentication, file storage. Everything in Sections A and B.                                         |
| **Cloudflare** | Cloudflare Inc.        | Hosting, CDN, serverless compute. All request traffic, including visitor IPs.                                   |
| **Stripe**     | Stripe Inc.            | Payment processing. Name, email, billing address, tax ID, card details.                                         |
| **Resend**     | Resend Inc.            | Transactional email. Recipient addresses and message contents, which include staff names and certificate links. |
| **Articulate** | Articulate Global, LLC | ⚠️ **Only if the Rise course is served from Articulate's hosting.** See open question 1.                        |


> ⚠️ **The legal entity names above are unverified.** The `/dpa` placeholder already asserts
> "Supabase Inc.", "Stripe Inc.", "Resend Inc." and "Cloudflare Inc." Naming a sub-processor's legal
> entity incorrectly in a signed DPA is exactly the kind of detail a law firm's reviewer checks.
> Confirm each against the provider's own DPA or terms page before this ships.

---



## Retention schedule — proposed 2026-08-04

**This supersedes the per-row "How long" column.** Retention groups by category rather than by field,
and writing it once here is what the Privacy Policy quotes. Leave the column blank.

Everything below is **[STANDARD]** (my proposal) unless marked **[MAX]** (already decided).

| Group | Covers | Retention | Reasoning |
|---|---|---|---|
| **Identity attestation** | `ip_address`, `user_agent` | **2 years**, then nulled, event row kept | **[MAX]** Held to 2 years to match the event retention rather than the shorter 12 months, deliberately choosing the conservative option. |
| **Assessment detail** | `quiz_attempts.answers` | **12 months**, then nulled; `score` and `passed` kept | **[MAX]** Keep the outcome, drop the detail. Individual answers only matter while a specific result could be disputed. |
| **Training records** | `training_events` rows, course position, enrolment, total seconds | **Kept.** Not deleted on a timer | **[MAX, resolved 2026-08-04]** An earlier version of this table said both "keep the event row" and "delete `training_events` rows" at the same 2-year mark. Terminal caught the contradiction and refused to guess. The row *is* the Rule 5.3 evidence and it is what a certificate rests on, so deleting it at 2 years would destroy the proof behind a certificate retained indefinitely. Only the identifiers age out, per the row above. |
| **Certificates** | `certificates`, the stored PDFs | **Indefinite** | **[MAX]** They are the customer's compliance evidence and the product itself. Deleting them destroys what was bought. |
| **Account + identity** | email, password hash, name, photo, membership, role, invite dates | **Life of the account**, then deleted on removal or at the firm's choice on termination | Already partly implemented: member delete clears `app_metadata` and redacts. |
| **Billing** | firm name, Stripe IDs, subscription status, invoice history | **7 years** | ⚠️ **Not discretionary.** Invoices and payment records carry statutory retention for tax and accounting. A shorter period here would conflict with your own obligations, so "why keep it longer than we need" does not apply. |
| **Operational** | `provisioning_failures` | **12 months** after `resolved_at` | Operational record with no ongoing purpose once closed. |
| **Rate limiting** | `verification_rate_limit` | **~24 hours** | Already self-cleaning: the function opportunistically deletes rows older than a day on roughly 1% of calls (`0020`). Nothing to build. |

### 🔑 Migration `0020` quietly solved the hardest retention problem

Deleting a staff member's account used to be blocked by an unstated dependency: `certificates.user_id`
pointed at `auth.users`, so removing the person would orphan the certificate or break the name on it.

`0020` snapshots **`holder_name` and `firm_name` onto the certificate row at issue time**. The
certificate no longer depends on the auth account for anything it displays or verifies. So an account
can now be fully deleted while its certificates stay intact and verifiable.

That is what makes the "delete everything except certificates" line in `POLICY-DECISIONS.md` actually
implementable rather than aspirational.

---

## Proposed text for the three "pending" cells

**[STANDARD]** — for Max to accept, edit, or reject.

- **IP address** — *"Captured at the moment a knowledge check or the certification assessment is
  submitted, as evidence that a named person completed their own training. This is what makes a
  certificate meaningful as supervision evidence rather than a claim. Not used for tracking,
  analytics, or profiling."*
- **Browser user-agent** — *"Captured alongside the IP address at the same four points, for the same
  purpose: corroborating that a submission came from a real session rather than an automated one."*
- **Support requests** — *"Sent to our support inbox so we can answer you. Not stored in the
  platform database."* ⚠️ Note this means retention is governed by whatever the mailbox does, which
  is an operations decision rather than a product one.

---

## Open questions — these change the documents, so settle them first

1. **Where is the Rise course actually served from?** If it loads from `rise.articulate.com`, then
  Articulate receives every employee's IP and browser and **must** be listed as a sub-processor in  
   the DPA. If it is self-hosted on Cloudflare R2, it must not be. `courses.rise_embed_url` holds the  
   answer. *(Prior notes suggest in-platform hosting was approved, reversing the earlier external*  
   *decision, but that is not verified against the live row.) --ANSWER: We export the rise content as a web artifact, as .js basically, we integrate that on our own platform using cloudflare. but verify if rise embedded something that could count them as subprocessors.*  

2. **The** `avatars` **bucket is PUBLIC.** `app/api/account/avatar/route.ts:49` calls `getPublicUrl`,
  unlike certificates which use 60-second signed URLs. Anyone holding the URL can view a staff  member's photo without logging in. Either accept and disclose it, or change it to signed URLs. --ANSWER: change to signed URSL.
3. `quiz_attempts.answers` **stores every individual answer**, not just the score. That is
  defensible as exam evidence, but it is more granular than a firm may expect, and it needs a  retention answer. --ANSWER: we need it as exam evidence. plainly, more data makes it more robust for us to defend that they did in fact answer each question and which, to be certified.
4. **Do you keep a departed employee's records?** `firm_members` delete wipes `app_metadata` but the
  training history and certificates persist by design. That is almost certainly correct for  compliance evidence, but it must be stated rather than left implicit. --ANSWER: yes we do keep their record's, but this is for compliance evidence.
5. **Who is the legal entity?** Everything currently says "BSBR Holdings, LLC d/b/a Iurix". If Rob
  confirms something different, all four documents change. Confirm before drafting. --ANSWER: TBD
6. **How is the DPA accepted?** Click-through at signup, or a countersigned PDF? A law firm's
  reviewer will ask, and the answer changes the signup flow. --ANSWER: at sign up before paying they should be prompted to accept.

