# Session Handoff

**Date:** 2026-08-27
**Who:** Rob, with terminal-Claude

> ✅ **The 2026-08-24 deploy warning is gone for good.** It was wrong when written, was corrected
> on 08-27, and is not repeated here. **Deploy status is only ever answered by
> `gh run list --workflow=deploy.yml`**, checking for a `workflow_dispatch` run whose "Deploy to
> production" step succeeded. See `.planning/STATE.md` §1.

---

## What happened today

Entity, EIN and Stripe. **No application code was touched.** Full detail, with every identifier:
**`.planning/sessions/20260827-rob-summary.md`**.

**BSBR Holdings, LLC is approved, the EIN is issued, and Stripe is registered to it** as a
**multi-member LLC — Rob and Katy**. Requirements completed; charges and payouts stayed enabled
throughout. That resolves open question #3 in `.planning/legal/README.md`: the entity is
"BSBR Holdings, LLC d/b/a Iurix", Iurix is not becoming its own LLC, and the seven places in the
app and legal docs already say exactly that. **No code change.**

---

## 🔴 The thing to read first: Stripe has been live since 2026-08-19

Every planning doc said sandbox. **It has been taking real money for over a week.** Live account
`acct_1ThDpU5md3Gcv1Z1`, live product and volume price with `lookup_key: per_seat_annual`, Stripe
Tax active with an NC registration, live webhook on `iurixaccreditation.com`. A real card was
charged **$37.54** on 08-19 and refunded.

Three of four `ix-stripeaudit` deltas were already closed. The remaining two were applied today
(`tax_code` → `txcd_20060058`, `tax_behavior` → `exclusive`, which is **one-way**).
**`ix-stripeaudit` is closed.**

**Prod is clean.** The one firm in it — "Katy Chavez Law", Rob's own live smoke test — was purged
today after its subscription was cancelled. Zero firms, members, seats and auth users remain. The
"17 firms" the docs worried about are in **staging**.

---

## Three traps that cost time today — do not repeat them

1. **`GET /v1/account` cannot tell you the entity state.** On a standard non-Connect account it
   returns `business_type: individual`, `company.name: "Robert M Traversi"` and
   `requirements: null` no matter what is true. Legacy data. The dashboard's **Account status** tab
   is the only authority. This was misdiagnosed twice, once as far as claiming a duplicate Stripe
   account existed.
2. **No tool can reveal which Stripe key prod holds.** Cloudflare never returns secret *values* —
   `wrangler secret list` gives names only, the CF MCP has no secrets tool. It was settled
   behaviourally instead (webhook → prod → database, twice). The chain is in `CLAUDE.md` §4.
3. **`processed_stripe_events` is 8, not 7.** Cancelling the subscription wrote a row two seconds
   before the purge. It is not drift, and the row is retained deliberately.

---

## Next steps

**Max's, and the real blocker — from `STATE.md` §5, unchanged by today:**

1. 🔴 **Get `0028` and `0029` onto PROD** and create the `Intake-uploads` bucket there. The intake
   code reaches production through CI; the database it lands on does not.
2. **Merge `policy-intake`, deploy, then open `/intake` in a browser.** It has never been seen
   rendering.
3. **The two UI branches are still unmerged** — `ui-polish-batch-a` and `ui-polish-batch-b`
   (stacked). With them, still undecided from 08-25: the Invitations scrollbar (drop the CSV hint
   and take 40px buttons, or accept it), the certification denominator (invited vs seats
   purchased), and the identical `Math.round` → 100% defect at `certification-forecast.tsx:75`.

**Rob's, all dashboard, none blocking:**

4. **Payout bank account** → the LLC's business account.
5. **Statement descriptor** → back to `IURIX ACCREDITATION`. The entity change overwrote it with
   `BSBR HOLDINGS LLC`, which customers will not recognise on a card statement.

**Either:**

6. 🔴 **`app/api/webhooks/stripe/route.ts:630`** — it emails a non-US buyer that their payment is
   being refunded, and `refunds.create` appears **zero times** in the codebase. That was harmless
   on sandbox money. It is not now. Soften the wording or actually issue the refund.
7. **Re-auth wrangler** to `4b2a402334decc9259d7317aaf9782f0`. Blocks local inspection and the
   documented `wrangler rollback`, not shipping.

---

## Open questions

- **Multi-state sales tax.** NC is registered and collecting correctly. The CPA consult is now
  about selling into other states — no longer a launch blocker, but unanswered.
- Still with Katy, unchanged: revision of the training content that teaches the old framing, the
  legal-accuracy review of the 50-question bank, the two guesses in `lib/intake/questions.ts`, and
  Privacy §2/§5 having no category covering intake answers.
