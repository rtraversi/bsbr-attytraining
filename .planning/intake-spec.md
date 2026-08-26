# Policy Intake — build spec

The firm AI policy intake: the questionnaire a firm completes immediately after paying, whose
answers Katy drafts the firm's written AI policy from.

**This document is the source for the build.** It carries the final question set and every decision
behind it, so no future session needs the conversation it came out of.

---

## What this is, and what it is not

**It is an instrument for a human drafter.** Katy writes every policy by hand. There is no
generator, no template engine, and no model reads these answers. The intake exists to give her a
complete, unambiguous picture of one firm in one pass, so she can decide which modules ship as
prepared template text and which need bespoke drafting.

That framing decides every design argument in here. A question earns its place if the answer tells
Katy something she can act on, or saves her a round-trip with the firm. Nothing else.

**🔴 Intake answers are never sent to a model.** Not for summarising, not for classification, not
for drafting assistance. Confirmed by Max 2026-08-26. Any future feature that wants to must be
expressly approved by Katy first, and that is an unlikely scenario, not a formality.

---

## Decisions on record

| Date | Who | Decision |
|---|---|---|
| 2026-08-25 11:03 | Katy | *"I want the intake to be there, at the beginning."* The whole intake runs before the dashboard, not inside it. |
| 2026-08-25 11:04 | Katy | *"I dont want the name part to move, I want the whole intake there."* Firm name is a question in the intake, not a separate setup step. |
| 2026-08-25 10:59 | Katy | *"the point is that they di NOT have to duplicate again the same information."* Anything already known from checkout is carried in, never re-asked. |
| 2026-08-25 09:29 | Katy | One question at a time. *"If there are a bunch at a time it doesnt seem custom."* |
| 2026-08-25 09:29 | Katy | No hedge options. *"If a firm does an action then they need a policy for it."* `I don't know` survives as the only soft answer and therefore carries real weight. |
| 2026-08-25 10:56 | Katy | Conditional branching. *"that is the whole point of the questions going one by one so that it checks for which is next based on conditional tree."* |
| 2026-08-25 11:57 | Katy | Attorneys never consume a seat and use the training for free. Non-attorney staff consume seats. |
| 2026-08-25 11:58 | Katy | *"The intake needs to ask for the list of all parties, attorneys and non attorneys."* |
| 2026-08-25 12:27 | Katy | The policy always requires: all non-attorney staff trained, **all** staff sign the attestation. Training is non-attorneys only; attestation is everyone. |
| 2026-08-25 12:59 | Katy | A solo with zero staff pays for one seat and needs no non-attorney training to be accredited. |
| 2026-08-25 13:30 | Katy | Pricing band one becomes 0-9 non-attorney staff at the same $35. |
| 2026-08-26 | Katy | Roster collects name, email and attorney status for every person. Approved. |
| 2026-08-26 | Katy | The two sensitive questions stay in, restricted to her eyes only. |
| 2026-08-26 | Katy | Answers are wiped once the policy is delivered. A renewal re-runs the intake from scratch rather than pre-filling. |
| 2026-08-26 | Katy | The tool grid may sit on one screen, one row per tool. An explicit exception to one-at-a-time. |
| 2026-08-26 | Katy | Practice areas stays out. |
| 2026-08-26 | Max | Password is set before the intake, so answers attach to a real firm row. |
| 2026-08-26 | Max | A roster larger than the seats purchased is flagged, never blocked. |
| 2026-08-26 | Max | Export is one `.docx` per firm, generated on demand. Katy does not get a login. |
| 2026-08-26 | Max | Purge is a deliberate action with an audit row, plus a 30-day automatic backstop. |
| 2026-08-26 | Max | The roster name is authoritative. Staff no longer type their own name at password-set. |
| 2026-08-26 | Max | The upload bucket is `Intake-uploads` on staging — capital I, case-sensitive, cannot be renamed. |
| 2026-08-26 | Max | The buyer sets an email and password on /onboarding. No magic link, no email sent on the buyer's path. |
| 2026-08-26 | Max | The intake is a CONDITION checked wherever the firm lands, not a step in a redirect chain. |
| 2026-08-26 | Max | No grandfather rule. Existing firms are junk; every firm without a submitted intake is gated, including the live one. |

### Corrections applied to Katy's refined question list

Her final list is the authority. Four things in it are being changed, and why:

1. **The case-management question carried the legal-research option list**, pasted by mistake
   (CoCounsel, Lexis+ AI, Vincent AI, Ask Practical Law, Westlaw Edge). Replaced with real practice
   management platforms. Clio missing from a case-management list was the tell.
2. **The notetaker question merged two things** into one single-select: the consent regime and the
   meeting type. Its options therefore overlapped and its branch tested for a `NO` that did not
   exist among them. Reverted to the two-question structure from her own earlier Module M.
3. **Jurisdiction was free text.** It is the switch that matters most in the policy, and free text
   returns `NC`, `N.C.` and `North Carolina` for the same answer. Now a state picker.
4. **Firm size band and the non-attorney staff count are replaced by the roster.** The roster
   carries both facts and more besides, so asking them separately is the duplication Katy objected
   to. Seat count is computed from the roster, not asked.

### The roster wins on names — added 2026-08-26 (Max)

The roster column is **"name as it should appear on the certification"**, and that name is
authoritative. Staff no longer type their own name when they set their password; the field comes
out of that screen entirely.

This is a correction to a path that is broken today, not a preference:

- `app/api/invite/bulk/route.ts` already accepts `{ name, email }` per row and **silently discards
  the name.** It creates the auth user from the email alone and never writes
  `user_metadata.full_name`.
- So the name on a certificate comes from the staff member typing it into
  `app/update-password/_components/update-form.tsx:144`, at the moment they set their password.
- And `app/api/certs/generate/route.ts:102` reads `user_metadata.full_name` **falling back to the
  email address**. A staff member who leaves the field blank gets a certificate made out to
  `paralegal@firm.com`.

The firm admin who typed the roster is the right author of that name, not the employee, and the
admin is the one accountable for the certificate being correct.

**What this obliges batch 4 to do:**

1. Stamp the roster name into `user_metadata.full_name` at provisioning, in the bulk-invite path —
   the row the intake promotes must carry its name all the way to the auth user.
2. Remove the name field from the password-set screen.
3. Leave the email fallback in cert generation alone as a last resort, but it should now be
   unreachable for anyone provisioned from a roster.

---

## Where it sits in the flow

```
Stripe checkout  →  set email + password  →  POLICY INTAKE  →  dashboard
```

An unfinished intake resumes at `intake_sessions.current_question`.

### The buyer never gets an email — 2026-08-26 (Max)

`/api/onboarding/complete` used to generate a magic link and mail it. Two reasons that is gone:

1. **It does not work.** Resend has returned 403 for every send for a week (`ix-dnszoho`), so the
   entire post-payment path is impassable today.
2. **It is fragile even when mail works.** A paying firm whose link lands in spam is stranded with
   no route back into an account they have already been charged for.

The buyer now sets an **email and a password** directly on `/onboarding`, and is signed in and sent
to `/intake` from the same request. The security shape, all server-side:

- The Stripe `session_id` is the proof of purchase and is already validated.
- **The email field CONFIRMS, it does not choose.** It is matched strictly against the Stripe
  session's own email and any mismatch is refused. The buyer must not be able to substitute a
  different address here: the duplicate / `email_in_use` / `provisioning_failures` machinery from
  migrations 0018 and 0022 all keys on the **paying** email, and an editable field bypasses every
  one of those guards at once.
- Refuse if onboarding has already run. It is one-time, and it consumes the `session_id` for this
  purpose.

**Email and password only on that screen.** The firm name is question one of the intake and stays
there — Katy, 2026-08-25 11:04: *"I dont want the name part to move, I want the whole intake
there."* The firm row keeps its `My Firm` placeholder until the intake promotes the real name.

### The dashboard is gated on intake state — 2026-08-26 (Max)

An admin whose firm has **no submitted `intake_sessions` row** is redirected to `/intake`, whatever
route they arrived by. This is a **condition checked at the destination**, not a step in a redirect
chain: every hop in a chain is somewhere to fall out of, and falling out today lands a paying firm
on a dashboard that has no idea the intake exists.

- **Hard gate.** `/dashboard/billing` and `/dashboard/support` are the only exemptions, so a firm
  with a payment problem can always reach us.
- **Employees are never gated.** They are invited after the intake, and `/intake` already bounces
  non-admins.
- **No grandfather rule.** Existing firms are junk (Max, 2026-08-26). Every firm without a
  submitted intake is gated, the live one included.

---

## The question set

Each question carries the module letter it feeds, so the export can be read module by module and
Katy can sort template from bespoke in one pass down the page.

`req` = required. `sens` = stored in `intake_sensitive`, visible only in Katy's export.

### Profile

| # | key | Question | Type | Module |
|---|---|---|---|---|
| 1 | `firm_name` | What is the name of the firm to be accredited? | text, req | — |
| 2 | `roster` | Everyone at the firm: name, email, and whether they are an attorney. | roster, req, min 1 | 0 |
| 3 | `jurisdictions` | Every US jurisdiction where the firm's attorneys are licensed. | state multi-select + federal, req | 0 |
| 4 | `contract_attorneys` | Does the firm work with contract or of-counsel attorneys? | yes/no, req | G |
| 5 | `existing_policy` | Does the firm have any AI policy in place today? | yes/no, req | 0 |

The roster is one screen, not one question per person. The admin is row one, pre-filled from their
account, and their own attorney answer is what decides whether they occupy a seat.

### Tools — Module A

| # | key | Question | Type |
|---|---|---|---|
| 6 | `ai_tools` | Which AI tools does the firm use, or want to use? Tick everything, even if you would not call it AI. | multi-select + other, req |
| 7 | `tool_grid` | For each tool: which tier, and is there a signed agreement that the vendor will not train on your data? | grid, one row per tool selected in Q6 |
| 8 | `prohibited_tools` | Any tools the firm wants to prohibit by name? | text, optional |
| 9 | `personal_devices` | Does the firm ever allow personal devices or personal AI accounts to touch client information? | yes/no, req |

Q6 options: ChatGPT, Claude, Gemini, Microsoft Copilot, CoCounsel, Westlaw Edge, Lexis+ AI, Harvey,
Spellbook, DraftWise, Otter.ai, other.

Q7 shown only when Q6 is non-empty. Tier is generic on purpose — personal, team, enterprise with a
data agreement — because real tier names differ per vendor and would be wrong for most of them.
The training-agreement column is yes / no / don't know.

### Legal research — Module B

| # | key | Question | Type |
|---|---|---|---|
| 10 | `research_tools` | Which AI-assisted legal research tools does the firm use? | multi-select, req |

Options: CoCounsel, Lexis+ AI, Vincent AI, Ask Practical Law, Westlaw Edge, general-purpose LLMs,
none.

### Case management — Module C

| # | key | Question | Type |
|---|---|---|---|
| 11 | `case_mgmt` | What case or practice management platforms does the firm use? | multi-select + other, req |
| 12 | `case_mgmt_ai` | Are the platform's built-in AI features switched on? | yes / no / not sure, shown if Q11 ≠ none |

Q11 options: Clio, MyCase, PracticePanther, Smokeball, Filevine, Actionstep, Litify, Rocket Matter,
CosmoLex, Neos, Monday.com, none, other.

`not sure` is deliberate here and is not a hedge: it is a real state that puts an instruction in the
policy to have someone confirm and document the setting.

### Confidentiality — Module H

| # | key | Question | Type |
|---|---|---|---|
| 13 | `comms_platforms` | What does the firm use for internal communication? | multi-select + other, req |
| 14 | `regulatory_regimes` | Does the firm handle data under any regime beyond state bar rules? | multi-select / none, req |

Q13 options: Microsoft Teams, Slack, Telegram, Signal, email only, other.
Q14 options: HIPAA, GDPR, GLBA, CCPA/CPRA, FERPA, none.

### Document review — Modules K and L

| # | key | Question | Type |
|---|---|---|---|
| 15 | `doc_review` | Does the firm use AI to review discovery or documents, or to summarise long records? | yes/no, req |
| 16 | `doc_review_scale` | Roughly what scale? | single-select, shown if Q15 yes |
| 17 | `tar` | Does the litigation practice use technology-assisted review or predictive coding? | yes/no, shown if Q15 yes |

Q16 options are described rather than numeric, because a numeric threshold nobody defined produces
noise: occasional, a few matters a year · regular, most matters · large-scale e-discovery.

### Notetakers — Module M

| # | key | Question | Type |
|---|---|---|---|
| 18 | `notetaker_stance` | The firm's position on AI notetakers. | single-select, req |
| 19 | `notetaker_scope` | Where are they used? | multi-select, shown if Q18 ≠ not permitted |
| 20 | `notetaker_tools` | Which notetaker is approved? | text, shown if Q18 ≠ not permitted |

Q18 options: not permitted at all · permitted only with everyone's consent, whatever the state
allows · permitted per the consent law of the state involved.
Q19 options: internal meetings · client meetings · depositions or hearings where permitted.

### Hiring — Module N

| # | key | Question | Type |
|---|---|---|---|
| 21 | `hiring_ai` | Does the firm use, or want to use, AI to screen job applicants? | yes/no, req |
| 22 | `hiring_states` | Where might applicants be based? | state multi-select + outside the US, shown if Q21 yes |

A yes routes to separate compliance counsel rather than a drafted clause. The policy draft is
explicit that no standard policy can be provided here.

### Billing — Module P

| # | key | Question | Type |
|---|---|---|---|
| 23 | `bill_ai_costs` | Does the firm want to bill clients directly for the cost of AI tools? | yes/no, req |

### Discipline — Module S

| # | key | Question | Type |
|---|---|---|---|
| 24 | `discipline` | How should violations of this policy be handled? | text or "not decided yet", req |

### Client use of AI — Module T

| # | key | Question | Type |
|---|---|---|---|
| 25 | `client_ai` | Should the policy address clients using AI to second-guess the firm's work? | yes/no, req |
| 26 | `client_ai_approach` | How would the firm like that handled? | text or "not decided yet", shown if Q25 yes |

### Sensitive — Katy's eyes only

Stored in `intake_sensitive`, which has no row-level policy at all, so nothing but a service-role
route can read it. Never rendered in a firm-facing screen, never in the dashboard, never in any
export except Katy's.

| # | key | Question | Type | Module |
|---|---|---|---|---|
| S1 | `prior_ai_error` | Has the firm had an incident involving AI-generated error in a filing? | yes/no, req, sens | O |
| S2 | `carrier_notified` | Has the malpractice carrier been told the firm uses AI tools, where the application asks? | yes / no / not sure, req, sens | R |

**Known and accepted:** restricted access controls who can read these. It does not make them
privileged, and it does not put them beyond a subpoena. Raised 2026-08-26, Katy chose to keep them.

### Upload

| key | When | Notes |
|---|---|---|
| `existing_policy_file` | Q5 yes | Private bucket. A human reads it. It is never parsed. Same lifecycle as the answers: purged with them. |

**The bucket is `Intake-uploads`** — capital I, and Storage bucket ids are case-sensitive. It was
created that way on staging and **cannot be renamed**, so the casing is a fact to work around, not a
typo to fix. It lives in exactly one exported constant (`lib/intake/uploads.ts`); the string literal
must not be scattered through routes, or the first person who types `intake-uploads` gets a silent
404 from Storage rather than an error that names the problem.

Private, 10 MB per file, PDF and Word only.

🔴 **The bucket does not exist on production yet.** Staging only, as of 2026-08-26. Creating it is a
Storage action in the CF/Supabase dashboard, not something a migration can do, and it has to happen
before the intake ships.

---

## Lifecycle: promote, retain, purge

The intake is a form, not a permanent record. At submit, the parts the platform genuinely needs are
**promoted into the real tables**, where they live like any other data. Everything else is transient.

**Promoted at submit**

| From | To |
|---|---|
| `firm_name` | `firms.name` |
| `roster` rows | an auth user each (created or resolved), `user_metadata.full_name` **stamped from the roster**, plus a `firm_members` row carrying `is_attorney` |
| count of non-attorney roster rows | the seat count, via `firm_members.occupies_seat` |

Invites are deliberately not sent here. The roster feeds a dashboard action the admin fires when
they are ready, which reuses the existing bulk-invite path rather than replacing it.

**The roster is not a plain insert.** `app/api/invite/bulk/route.ts` accepts `{ name, email }` and
**discards the name** — it creates the auth user from the email alone and never writes
`user_metadata.full_name`. Certificates read `full_name` and fall back to the **email address**
(`app/api/certs/generate/route.ts:102`). So promote must create or resolve the auth user
(`public.find_user_id_by_email` from 0018 for one that already exists) and stamp the roster name
into `user_metadata.full_name`. The name field is removed from the password-set screen in the same
change — staff no longer type their own name.

**How the seat count is reached, and what is deliberately NOT touched.** Attorneys get
`occupies_seat = false` and non-attorneys `true` on the `firm_members` row. The existing
`sync_used_seats` trigger from 0015 then counts exactly the non-attorney rows, so `used_seats` ends
up equal to the roster's non-attorney count **without changing the trigger or `lib/seats.ts` at
all**.

🔴 `seats.max_seats` is **not** rewritten from the roster. It is what Stripe sold, and this build
explicitly defers pushing a changed quantity to Stripe. Rewriting it here would either hand a firm
capacity it never paid for or shrink capacity it did. A roster larger than the seats purchased is
flagged and never blocked, so a firm can legitimately finish an intake over its seat count and be
over-subscribed until somebody settles it.

**Promote is not one Postgres transaction, and cannot be.** Auth users are created through GoTrue's
admin API, which no `BEGIN` can enclose. What it is instead: every step idempotent, and the session
flipped to `submitted` **last**. A promote that fails halfway leaves the intake open, the firm
presses Send again, and the second run skips what already exists and finishes the rest.

**Retained after purge, as a receipt**

`intake_sessions` keeps `submitted_at`, `started_by`, `policy_delivered_at` and `purged_at`. That is
enough to say a firm completed an intake and received a policy on a date, without keeping anything
about what they answered.

**Purged**

Every row in `intake_answers` and `intake_sensitive`, and the uploaded file.

**What triggers it**

Katy tells Max the policy is delivered. Max marks it delivered and runs the purge from the same
screen he exported from. The action names the firm, lists what will go, requires a confirmation, and
writes an audit row. If nobody presses it, a backstop purges automatically **30 days** after
`policy_delivered_at`.

Manual-only deletion was the original proposal and was rejected: it depends on somebody remembering,
an ad-hoc script matching on a firm name can hit the wrong firm, and nothing would record that the
deletion happened.

---

## Not in this build

Listed so nobody assumes they were forgotten:

- The attorney/seat split in `lib/seats.ts` and the `sync_used_seats` trigger from migration 0015.
  `is_attorney` lands here; making it change what a seat costs is its own batch, because access and
  billing currently derive from one predicate on purpose.
- Automatic invite sending from the roster.
- Firm-level accreditation state.
- E-signed attestation of the policy.
- Pushing a changed seat quantity to Stripe.
- Privacy §2 and §5 have no category covering intake answers. New copy is needed and it is Katy's
  to approve.
