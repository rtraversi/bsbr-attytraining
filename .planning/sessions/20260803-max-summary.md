# Session summary — 2026-08-03 (Max, desktop + terminal)

11 commits. Three blocks: a documentation-accuracy pass, the `ix-doublebill` build, and the start of
the pre-marketing work Katy asked for. Everything pushed. **Nothing deployed.**

---

## 1 · The record was wrong in four documents (`d99aeff`)

Friday's own accuracy pass had gone stale within hours of being written.

- **Commit count.** Actual is **24** commits dated 2026-07-31. The handoff and session summary said
  22, the brief said 23. The "22" was already wrong when written: the file was committed at
  `7f65a19`, the 23rd commit of that day.
- **`session_handoff.md` contradicted itself.** Its opening said "17 pushed, 5 not" while its own
  Status block below said everything was pushed. That is the file Rob reads first.
- **`STATE.md` was the stalest file in the repo.** Written at `5370fc3` (07:13), *before* all three
  of Friday's batches. It claimed migrations `0001–0016` when `0017` was applied, and its Session
  Continuity entry said **"no app code changed"** for a 24-commit day.
- **`CLAUDE.md` named Stripe objects on a retired account.** Corrected by reading the **Stripe API**
  rather than copying another document, which surfaced four further deltas (below).

## 2 · What reading the Stripe API actually found

Sandbox `acct_1ThDpr6ZCSojEKRr` has exactly one active product and one active price.

| Field | Every doc claimed | Reality |
|---|---|---|
| Product | `prod_UgzKT3NrGNAvDA` | `prod_UiovBHrxJSDVpf` |
| Price | `price_1ThbLNCzT2268ei9nkadS8kD` | `price_1TjNHc6ZCSojEKRrKs79ToJ0` |
| `lookup_key` | `per_seat_annual` | **not set** |
| `tax_behavior` | `exclusive` | **`unspecified`** |
| product `tax_code` | `txcd_20060058` | **not set** |

Three feed `ix-stripeaudit` directly: `automatic_tax` is already enabled at
`checkout/route.ts:68` while `tax_behavior` is unspecified; there is no `tax_code`; and "scriptable
via `per_seat_annual`" was never true.

**Also customer-visible:** the Stripe **product name still reads "AI Staff Compliance Training"**,
the retired course name. It renders on the hosted Checkout page and on every invoice. No grep could
ever have caught it because it is not a source string. Dashboard fix, not code.

---

## 3 · `ix-doublebill` — the brief's diagnosis was partly wrong

**A plan already existed and had already shipped**: `.planning/quick/260709-aeh-*`, by Rob on 07-09
(`52d0a98`, `52cf9f5`). The brief called it "the 2026-07-06 fix" and claimed it *"cancels and
refunds a legitimate paying customer."* **It does not and never did** — that plan explicitly forbids
auto-cancel and auto-refund.

The real defect, verified end to end: a returning customer is charged, `createUser` fails on the
existing email, one operator email is sent, and the handler returns. The customer polls `/onboarding`
ten times over 15 seconds and gets *"setup is taking a moment, please refresh"* forever.

**Three things nobody had written down:**

1. **The alert reached nobody.** `OPERATOR_ALERT_EMAIL` was unset in every location, so the fallback
   mailed `info@aistaffcompliance.com`, a retired domain. The whole safety net of the 07-09 fix had
   been inert since the domain move. Fixed live at **15:07Z** (`Source: Secret Change`), which took
   effect **without a deploy** because the fallback only fires when the secret is missing.
2. **The event was burned.** `processed_stripe_events` is inserted *before* dispatch, so replaying
   the event from the Stripe dashboard is a no-op. There was no recovery path at all.
3. **Any transient `createUser` fault was misread as a re-purchase**, silently dropping a paying
   customer.

### What was built

`0018` adds `find_user_id_by_email` (SECURITY DEFINER, service-role only) and a
`provisioning_failures` ledger. `resolveBuyer` then branches four ways, **owner before member,
active before non-active**. Case 2 reactivates the existing firm — updating `stripe_customer_id`,
which is load-bearing because `/api/onboarding/status` finds the firm by it.

### Terminal caught three errors in the plan

1. **`revoke ... from anon, authenticated` was insufficient.** Postgres grants EXECUTE on new
   functions to `PUBLIC` by default and both roles inherit it. Without `revoke ... from public` the
   function would have stayed callable by exactly the roles the plan meant to exclude — an
   account-enumeration oracle over `auth.users`.
2. **"Throw and let Stripe retry" was theatre.** The retry hits the duplicate guard at `route.ts:62`
   and returns 200 without re-running the handler. Fixed with a compensating delete scoped to the
   pre-write region only.
3. **The Case 3 amendment contradicted the plan's own constraints** — see below.

It also caught its own bug mid-task: the compensating delete was keyed on `session.id` (`cs_…`) when
the row is keyed on `event.id` (`evt_…`), which would have matched zero rows.

### 🔴 The refund promise, unresolved

The Case 3 amendment told terminal the customer email should say **"a refund is coming"**, while the
same plan forbids any refund call and makes it Rob's manual act. Terminal implemented it as written
and flagged it. The operator alert now carries a 🔴 REFUND line stating the customer has been told in
writing. **If Rob does not act on that alert, we have lied to a customer about money.** Must be
resolved before deploy. The email also takes a `cancelled` prop so it can never claim billing stopped
when the cancel call actually failed.

---

## 4 · Pre-marketing work (Katy's steer)

Katy: *"triage what is a priority to fix before we can market. Any billing issues can be fixed later.
The priorities are the marketing and sign up pages."*

These are two different gates and never competed: you cannot take real money until Stripe live mode
is on, which is owner-gated on Rob regardless.

**Two blockers found that were in nobody's list:**

- **`[ATTORNEY TO COMPLETE]` renders on production** — 20× `/dpa`, 16× `/privacy`, 20× `/terms`.
- **Zero Open Graph tags.** Sharing the site produces a bare URL. New brief row `ix-ogimage`.

**Brand.** Palette locked: `#5CC6C3` (PANTONE 14-4912 Rinsing Rivulet), `#D5D5D8` (13-4108 Nimbus
Cloud), `#9C9EA0` (16-4402 Drizzle, mirrored cooler at Max's direction). Max hand-traced the mark;
cleaned to 7 paths / 2.2 KB against Rob's 3.4 MB, 28-path auto-trace. The **1.1px black stroke on
every path** was the real defect — it was silently fattening the artwork at small sizes.

**The brand splits at the seam.** The app runs on `#0094FF`/`#32C7FF`, the marketing and legal pages
on `teal-300/400` over `zinc-950`, and the mark contains **no blue at all**. Rob's redesign is
teal and rose-gold, so it will match the mark and not the app. The dashboard palette decision is
**deferred, logged verbatim** in `STATE.md`.

**Tokenisation** was done first precisely because it does not need the palette decision: today's
exact values behind tokens now, so the swap later is one file.

⚠️ **Terminal's honest disclosure:** tokenising opacity modifiers is *not* a pure indirection.
Tailwind bakes a static colour's alpha into an `oklab()` literal but cannot resolve a `var()`, so
~35 sites emit an opaque fallback plus an `@supports`-guarded `color-mix()`. Below Chrome 111 /
Safari 16.2 / Firefox 113 they render at **full opacity**. It verified the baked literal matches
`oklab(#32C7FF)` to 1e-6, and that its first two comparison attempts were wrong before trusting the
third.

**Data inventory** (`.planning/DATA-INVENTORY.md`) built from the live schema. Notable findings: the
`avatars` bucket is **public** (`getPublicUrl`) unlike certificates (60-second signed URLs);
`quiz_attempts.answers` stores every individual answer, not just the score; IP and user-agent are
captured at four points; and there is **zero analytics and zero custom cookies**, which likely means
no consent banner is needed — until someone adds analytics.

---

## 5 · Email routing, checked against live DNS

The apex has **zero MX and zero TXT records**. Resend's SPF lives on
`send.iurixaccreditation.com` (`v=spf1 include:amazonses.com ~all`, MX `feedback-smtp.us-east-1.amazonses.com`).

So the commonly-cited risk — that Cloudflare Email Routing would create a second, conflicting apex
SPF — **does not apply to this zone.** There is nothing at the apex to collide with.

Separately: DMARC is at `p=quarantine` with `rua=mailto:dmarc_rua@onsecureserver.net`, the
registrar's collector. Enforcement with zero visibility. Repoint once a real mailbox exists.

---

## Status

| | |
|---|---|
| commits | 11, all pushed |
| deployed | **nothing** — live is still `0c4e7ff8` (2026-07-31T21:01:39Z) |
| migration `0018` | applied to the live DB (DB ahead of code, correct order) |
| `tsc` / `eslint` / `next build` | clean, verified independently after each commit |
| billing cases tested | **zero of four** — static verification only |
| Stripe sandbox | untouched. Friday's "all restored" claim **verified**: 30 subs, all active, zero `cancel_at_period_end` |

## Next

1. Resolve the refund wording, then deploy (**app only** — zero cert-worker paths in the batch).
2. Exercise all four cases with `stripe listen` + `pnpm dev`. Case 3 now cancels, so it is a new case.
3. Max: Terms first (no inventory dependency), then Privacy → Cookies → DPA.
4. Max: the **Why** and **How long** columns of the data inventory.
5. Cloudflare Email Routing — closes `ix-certmailbox` and `ix-supportdest`, unblocks `ix-contactc4`.
6. Ask Rob: final legal entity name, and where the Rise course is served from.
