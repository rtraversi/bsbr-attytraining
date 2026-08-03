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
| Quiz score + pass/fail                     | Employee         | `quiz_attempts.score`, `passed`                                              | Supabase                          |                                                                                                                                                                                                                                                                                                                                          |                    |
| **Individual answers given**               | Employee         | `quiz_attempts.answers` (JSON)                                               | Supabase                          |                                                                                                                                                                                                                                                                                                                                          |                    |
| Certificate number, issue + expiry         | Employee         | `certificates`                                                               | Supabase                          |                                                                                                                                                                                                                                                                                                                                          |                    |
| Certificate PDF (name, score, dates)       | Employee         | Supabase Storage, `certificates` bucket (**private**, 60-second signed URLs) | Supabase                          |                                                                                                                                                                                                                                                                                                                                          |                    |
| **IP address**                             | Employee         | `training_events.ip_address`                                                 | Supabase, Cloudflare              |                                                                                                                                                                                                                                                                                                                                          |                    |
| **Browser user-agent**                     | Employee         | `training_events.user_agent`                                                 | Supabase, Cloudflare              |                                                                                                                                                                                                                                                                                                                                          |                    |
| Every training action + timestamp          | Employee         | `training_events`                                                            | Supabase                          |                                                                                                                                                                                                                                                                                                                                          |                    |
| Support requests (topic, subject, details) | Admin + employee | Not stored — emailed                                                         | Resend, and the support inbox     |                                                                                                                                                                                                                                                                                                                                          |                    |


**IP and user-agent are captured at four points**, all for identity attestation:
`app/api/quiz/attempt`, `app/api/training/knowledge-check`, and twice in
`app/api/training/content-progress`.

---



## Section B — firm account and billing (Iurix is CONTROLLER)


| What                                             | Whose    | Where it lives                                                       | Who else sees it | Why *(yours)* | How long *(yours)* |
| ------------------------------------------------ | -------- | -------------------------------------------------------------------- | ---------------- | ------------- | ------------------ |
| Firm name                                        | The firm | `firms.name`                                                         | Supabase         |               |                    |
| Owner identity                                   | Admin    | `firms.owner_id`                                                     | Supabase         |               |                    |
| Seat count + tier                                | The firm | `firms.max_seats`, `tier`, `seats`                                   | Supabase, Stripe |               |                    |
| Subscription status + renewal date               | The firm | `firms.status`, `current_period_end`                                 | Supabase, Stripe |               |                    |
| Stripe customer + subscription IDs               | The firm | `firms.stripe_customer_id`, `stripe_subscription_id`                 | Supabase, Stripe |               |                    |
| **Card details**                                 | Admin    | **Never touches Iurix.** Held by Stripe only                         | Stripe           |               |                    |
| Billing address + tax ID                         | Admin    | **Stripe only** (`tax_id_collection` is on)                          | Stripe           |               |                    |
| Invoice history                                  | The firm | **Stripe only**, read live                                           | Stripe           |               |                    |
| Notification preferences                         | The firm | `firms.notify_cert_earned`, `notify_weekly_summary`, `reminder_days` | Supabase         |               |                    |
| Failed-provisioning records (email + Stripe IDs) | Buyer    | `provisioning_failures`                                              | Supabase         |               |                    |


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



## Open questions — these change the documents, so settle them first

1. **Where is the Rise course actually served from?** If it loads from `rise.articulate.com`, then
  Articulate receives every employee's IP and browser and **must** be listed as a sub-processor in
   the DPA. If it is self-hosted on Cloudflare R2, it must not be. `courses.rise_embed_url` holds the
   answer. *(Prior notes suggest in-platform hosting was approved, reversing the earlier external
   decision, but that is not verified against the live row.)*
2. **The** `avatars` **bucket is PUBLIC.** `app/api/account/avatar/route.ts:49` calls `getPublicUrl`,
  unlike certificates which use 60-second signed URLs. Anyone holding the URL can view a staff
   member's photo without logging in. Either accept and disclose it, or change it to signed URLs.
3. `quiz_attempts.answers` **stores every individual answer**, not just the score. That is
  defensible as exam evidence, but it is more granular than a firm may expect, and it needs a
   retention answer.
4. **Do you keep a departed employee's records?** `firm_members` delete wipes `app_metadata` but the
  training history and certificates persist by design. That is almost certainly correct for
   compliance evidence, but it must be stated rather than left implicit.
5. **Who is the legal entity?** Everything currently says "BSBR Holdings, LLC d/b/a Iurix". If Rob
  confirms something different, all four documents change. Confirm before drafting.
6. **How is the DPA accepted?** Click-through at signup, or a countersigned PDF? A law firm's
  reviewer will ask, and the answer changes the signup flow.

