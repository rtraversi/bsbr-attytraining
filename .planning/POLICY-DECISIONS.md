# Policy decisions — source material for the legal pages

**Purpose:** Max's decisions, captured verbatim with dates, so the Privacy / Terms / Cookies / DPA
drafts are written from what he actually decided rather than plausible-sounding filler. If a clause
in those documents is not traceable to a decision here or to `.planning/DATA-INVENTORY.md`, it is
invented and should be challenged.

---

## Refunds

### Decided 2026-08-04 07:51 CST (Max)

**1. The window reopens on renewal.**
> *"the window reopens on renewal yes."*

An annual renewal is a new charge and starts a fresh 14-day window. The currently published text
says "within 14 days of purchase" and is silent on renewals, so it needs this added.

**2. Eligibility is per seat, not per firm.**
> *"but its also per case, per seat. if 30 seats of the firm out of 40 have not gone through the
> training, but 10 have, we will offer 30 refunds. the 10 that did take, we can't offer it. its our
> safety net."*

**3. Training consumption disqualifies a seat, not just certification.**
> *"we check wether they've gone through the training. that they've viewed 80% if i remember
> correctly of the training. if so then we do not offer a refund even if its within the time window."*

**4. Charged and received nothing is not a refund request at all.**
> *"that is an immediate flag for me and rob and no window applies because it is an immediate
> refund."*

No window, no eligibility test, no discretion. The money goes back because the product was never
delivered. This is a **failed transaction**, and the refund policy must say so explicitly rather
than leaving it to be read into the general rule.

**5. Tone toward someone in that position.**
> *"we should be more kind to someone in that position so more than. not we're reviewing, it is, we
> are reviewing and if you did not receive access--rest assured we will issue a full refund. a
> member of our staff has been advised."*

Supersedes the earlier "no promises" instruction for **this case specifically**. The two are
consistent once the cases are separated: a genuine refund *request* gets no promise, a failed
*delivery* gets an unconditional one.

---

## ⚠️ Conflicts with what is currently published

The live pricing page and Terms both say:

> *"Refunds are available within 14 days of purchase **and** only if no certificate has yet been
> issued. Once any certificate is issued, the purchase is non-refundable."*

**That is all-or-nothing at the firm level and it contradicts decisions 2 and 3.** Under the
published rule, one certificate out of forty seats makes the entire purchase non-refundable. Under
Max's rule, you refund thirty-nine. It also uses **certificate issued** as the trigger, while Max
uses **training consumed**, which fires earlier.

No customer has ever bought, so changing it costs nothing today. It must be changed deliberately,
in both places, before launch.

---

## ⚠️ Open — must be settled before the Terms clause can be written

**A. What exactly does "80% of the training" mean?**

The number is not arbitrary and already exists in the product, but not quite as described.
`REASSIGN_BLOCK_LESSON = 4` in `app/api/firm/member/reassign/route.ts:20` blocks seat reassignment
once someone's **highest lesson reached** is 4 of 5. Reusing that same predicate for refunds is
attractive: one definition, one query, and it is already justified.

But "reached lesson 4 of 5" is not 80% consumed. It means they finished lessons 1 to 3 (60%) and
**opened** the fourth. If the Terms say "80% of the training" while the code tests "opened lesson
4", the published policy describes behaviour the product does not have. Either restate the clause in
the product's own terms, or move the trigger.

**B. How are the remaining seats priced after a partial refund?**

Pricing is volume-banded: $35 (1–9), $32 (10–24), $28 (25+), with every seat at the band rate. A
firm buys 40 seats at $28 and refunds 30. The 10 they keep would normally price at $32.

- *Refund at the rate paid* (30 × $28): simpler, more generous, easy to explain. Leaves a small
  arbitrage where a firm buys into a cheaper band and refunds down out of it.
- *Reprice the remainder into the correct band*: strictly correct, but means telling a customer
  their refund shrank because they now hold fewer seats, which reads as punitive.

**Recommendation: refund at the rate paid.** The arbitrage is immaterial at this scale and the
alternative is hard to explain to someone who is already unhappy.

**C. How would we know someone was charged and received nothing?**

Max asked this directly and it deserves a precise answer, because the policy promises an immediate
refund and a promise with no detection mechanism is worthless.

- **Classified failures: known automatically, within seconds.** As of 2026-08-03 the Stripe webhook
  writes a `provisioning_failures` row and fires an operator alert for all three known causes
  (`duplicate`, `email_in_use`, `unresolved`). This is built and live in code, though not deployed.
- **Silent failures: we would NOT know.** If Stripe never delivers the webhook, or the handler
  throws before writing anything, no row exists and no alert fires. The only symptom is a customer
  sitting on `/onboarding`.
- **The only complete answer is reconciliation.** A periodic job comparing active Stripe
  subscriptions against `firms` rows. Any subscription with no matching firm means someone paid and
  received nothing, whatever the cause. **Not built.** This is the true safety net behind decision 4
  and should exist before the clause promising an immediate refund is published.

**D. Is there any way for a customer to request a refund?**

No. There is no refund request path in the product; they email support. `app/terms/page.tsx:35`
carries a placeholder asking for exactly this procedure. The review queue Max described (flag,
classify against the policy, human approves) cannot be built until a request channel exists.

---

## Retention contradiction — resolved 2026-08-04 (Max)

The earlier table said **both** "null the IP and user-agent, keep the event row" **and** "delete
`training_events` rows" at the same 2-year mark. Terminal caught it, implemented only the unambiguous
rules, and left row deletion behind `PURGE_EVENT_ROWS = false` rather than guessing. Its reasoning
was right and the mistakes are not symmetric: keeping rows too long is a one-line fix, deleting them
wrongly destroys Rule 5.3 evidence behind certificates that are retained indefinitely.

**Max's decision: keep the rows, strip the identifiers.**

At 2 years the `ip_address` and `user_agent` are nulled. **The event row itself is kept.** The row
("this person completed lesson 3 on this date") *is* the evidence the product is sold on, and it is
what a certificate rests on. The IP and user-agent are the sensitive part and the part with no
ongoing purpose once a certificate exists and its year has run.

Consequence for the Privacy Policy: training activity records are kept for as long as the
certificates they support, which is indefinitely. That must be stated rather than implied.

---

## Privacy and DPA — decided 2026-08-04 (Max)

1. **Data subject requests** come via the firm or its admin, never direct from staff. The firm is the
   controller. **Response within 10 business days**, comfortably inside the controller's own clock.
2. **Breach notification: 24 hours from becoming aware.** Confirmed 2026-08-04 after a re-check.
   Max initially said "72 hours is correct"; 72 is the **controller's** deadline to notify a
   regulator, and a processor commitment of 72 would leave the firm zero time to meet its own clock.
   He confirmed 24 on that basis. Clock runs from **awareness**, not occurrence, and the notice
   carries what is known at the time with updates following, so this is not a commitment to a
   complete forensic picture in 24 hours.
3. **Sub-processor changes: 14 days' notice**, with a right to object on reasonable data-protection
   grounds and, if unresolved, terminate with a pro-rata refund. ⚠️ This is a **second refund path**
   and Terms §4 must acknowledge it or the two documents contradict each other.
4. **Audit rights: strictly the minimum only.** Make available the information necessary to
   demonstrate compliance. No questionnaire cadence, no inspection terms, no SOC 2 claim (there is
   none). **Flagged on the brief for review well after launch.**
5. **Deletion on termination.** Retained: certificates and the minimum record needed to **verify**
   them, plus billing records under statutory retention. Deleted or exported at the firm's choice:
   everything else, prioritising the lowest-value and highest-risk data first (IP addresses,
   user-agents, individual quiz answers, profile photos, course position). A firm may still demand
   total deletion, but must be told plainly that this renders their certificates **permanently
   unverifiable**.
6. **International transfers: HARD NO** (Katy, via Max). US law firms only, US sub-processors, no
   adequacy decisions and no standard contractual clauses. **Max's call 2026-08-04: enforce it in the
   product now rather than state a policy the product contradicts.** Added as Task 9 of
   `~/.claude/plans/iurix-prelaunch-batch.md`. The Terms may therefore say "offered only to US law
   firms" rather than the softer "intended for".
7. **Security claims: only what can be backed now or committed to backing.** Encryption at rest and
   in transit is attributed to Supabase and Cloudflare, not claimed as our own implementation.
8. **Privacy Policy scope: one document, three named audiences** — visitors, firm administrators,
   and staff members. Staff are the majority of data subjects and never chose to be here, so they get
   their own section rather than being folded into "users."

---

## Answer retention — decided 2026-09-01 (Max)

**The intake answers are kept for the life of the paid subscription, plus a grace period of
THREE DAYS.**

> *"I said grace period because I was cautious a firm might not renew but come back. however lets
> make it shorter. katy said this could be a seling point of renewing to save their answers. and i
> like it. so have it be three days only."*

**This supersedes the 30-day placeholder.** That figure was not a decision — it was borrowed from
the retention window of the **retired purge** (the model that deleted a firm's answers 30 days after
its policy was delivered, removed on 2026-09-01 as D8-1) on the reasoning that it was the one number
already reviewed in this product. Katy asked for "a renewal grace period" and named no length; Max
named it.

**Why shorter is the point rather than a compromise.** A month of holding a lapsed firm's answers is
indistinguishable from keeping them forever, and it quietly cancels the thing the retention rule is
*for*: Katy's own framing is that keeping the answers is **a selling point of renewing** (D8-4, "so
that is an incentive to renew so they dont lose the work they progressed in making the policy"). If
the work survives a long lapse anyway, not renewing costs the firm nothing. Three days makes renewal
the way a firm keeps its answers.

**Consequences for the Privacy Policy.** This is one of the two D8 facts that `.planning/
POLICY-ENGINE-MAP.md` §13.2 says must be disclosed, and the section covering intake answers **still
does not exist** — open since the intake's first batch. It must state:

1. Intake answers are retained for the life of the paid subscription, **not** deleted on delivery of
   the policy. The previously drafted "deleted after delivery" language is withdrawn.
2. On cancellation they are retained for **three days** and then removed.
3. `payment_failed` is **not** cancellation for this purpose — Stripe's retries are still running
   and nothing is deleted.

⚠️ **A three-day window is short enough that the notice matters.** A firm that only learns the
window exists after it closes has been trapped rather than incentivised, so the app states the limit
on the intake read-back screen **while the subscription is still active** — before it can bite —
rather than announcing it at cancellation. The Privacy Policy should not be the first place a firm
could have found this out.

**Implemented as** `RENEWAL_GRACE_DAYS` in `lib/intake/retention.ts` — one exported constant, so the
clock, the on-screen copy and any future sweeper cannot disagree. `tests/intake-retention.test.ts`
pins the value at 3 rather than only referencing the constant, so drifting back up fails as the
product regression it would be.
