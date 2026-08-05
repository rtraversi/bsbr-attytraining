# Session summary — 2026-08-05 (Rob, terminal) — second session of the day

Three blocks: a **homepage redesign** (shipped to production), a **Stripe lookup-key change**
(built, verified, **not deployed**), and the **PROD database cutover** (staged, not switched over).

Runs alongside `20260805-max-summary.md`. Max's covers the nine pre-launch tasks and the merge; this
one starts after production was already carrying the redesign.

---

## 1 · Homepage redesign — live

**The diagnosis.** The page had exactly one contrast event, the closing panel. `marble #f7f7f6` →
`marble-deep #edf3f1` is a ~3% value shift, so five of six sections read as one continuous field and
the page never changed register.

**The fix came from the asset, not from taste.** The mark is brushed metal — teal edge-light,
rose-gold crescents, specular highlights — and it was rendered for a dark ground. The palette comment
in `globals.css` already recorded the cost of ignoring that: the sampled hues *"read as washed
out … a flat page has none of that to lift it"*, so the chroma was raised to compensate. That treated
the symptom. The hero now gives the metal the ground it was drawn for, and the page runs **dark →
light (the whole argument) → dark**. Two events, bookending.

`teal-ink` became a rule rather than a decoration: it marks the four things that carry authority —
the seal, the rulings, the price, the sign-off. Hence the dark header bar on the 2026 docket and the
dark price plate, which also makes $35 the most emphatic object on the light half of the page.

**A real bug fell out of it.** Every mark `<img>` carries `width={326} height={326}`. Those map to
CSS presentational hints, so anything that sizes only one axis leaves the other in force. In a
plain-CSS build the closing mark rendered **68px wide by 326px tall**. Tailwind preflight supplies
`height:auto`, so the shipped site was never affected — but `h-auto` is now explicit on both marks
rather than relied upon, with a comment saying why.

**Dropped deliberately:** the scroll-triggered reveal from the mockup. It needs an
`IntersectionObserver`, which means `"use client"` on sections that are server components today. Not
worth a client boundary for a fade. The hero load sequence survived — pure CSS, and
`prefers-reduced-motion` disables it.

Deployed via CI. Production version `54206300-7fc4-4f69-b98e-0714f56b951b`.

> **The handoff's deploy facts were already stale before this session started.** It named production
> as `2c8bf062` and rollback as `a0323ac4`. Live was actually `61b5a5fe` — `418f079` (the cert email
> fix) went out at 19:29, after the handoff was written. Always re-check with
> `wrangler deployments list` rather than trusting the document.

## 2 · Stripe price by lookup key — built, **not deployed**

Branch `stripe-lookup-key`, preview `5e7c5507-bsbr-attytraining.aistaffcompliance.workers.dev`.

`app/api/checkout/route.ts` carried `price_1TjNHc6ZCSojEKRrKs79ToJ0` as a constant. That ID is
`livemode: false`, so going live meant editing source, rebuilding and redeploying **in the middle of
the key-and-webhook cutover** — the worst possible moment to need a deploy, and a step easy to forget
until a real customer hits a card error.

It now resolves by `lookup_key` at runtime. The fallback is **gated on the secret key being a test
key**, which is the whole design:

- **Sandbox today:** no price carries the key (verified live — 0 matches), so it falls back and
  nothing changes.
- **Live mode:** the fallback is unreachable and the code **refuses**. A live key cannot use a test
  price anyway, so falling back would only turn a clear *"no price carries this lookup key"* into a
  confusing *"no such price"*. Refusing is also the safer default — never charge against a price
  nobody chose. It fails at the operator's first test purchase, not at a customer's.

Self-retiring: inert the instant the live key is in place, with nobody needing to remember to delete
it. Ambiguity throws rather than guessing. The decision is a pure function in `lib/stripe-price.ts`
with 12 tests; the network round trip is deliberately untested rather than mocked.

Verified end to end on the deployed preview, not just in unit tests: checkout created real sandbox
Stripe sessions at 1 seat and at the 10-seat band boundary, and the non-US guard still returned 403.

## 3 · PROD database cutover — staged, not switched

Full detail in **`.planning/PROD-CUTOVER.md`**. The headline:

**Unpausing PROD did not make it usable.** It had zero migrations, zero tables, zero buckets.

**And migrations alone would not have made it work either.** Four objects were created by hand in the
dashboard and exist nowhere in source: the `certificates` bucket, the `courses` row, and **two
Database Webhooks that are the entire certificate pipeline**. A project built only from migrations
looks complete and then silently never issues a certificate.

They were found by comparing **triggers**, not tables. Tables, columns, policies, functions and
indexes all matched staging exactly (13 / 107 / 18 / 9 / 44); triggers were 2 against 4. A schema
diff that stops at the usual four axes misses this entirely.

Also found:

- **`0023_remove_avatars.sql` cannot run.** `storage.protect_delete()` now blocks SQL deletes from
  storage tables. It is the only migration unapplied everywhere, and it takes its whole transaction
  down with it. Needs rewriting against the Storage API.
- **The credential swap is four places, not three.** `workers/cert-worker` is a separate Worker with
  its own `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Every prior doc says three.
- **The quiz runs on 8 `PLACEHOLDER` questions and zero real ones**, on both databases. The seed's
  own comment says to replace them before launch; `BACKLOG.md` wants 24–32.
- **The webhook shared secret sits in plaintext** in the trigger definitions, readable by anyone who
  can query `pg_trigger`.

## 4 · Corrections to the backlog

- **`BACKLOG.md` #2 (webhook re-purchase safety net) is DONE**, not open as `OPEN-ISSUES.md` says.
  The webhook resolves identity via `find_user_id_by_email`, classifies
  duplicate / email_in_use / unresolved / non_us_billing, cancels the duplicate subscription and
  files a `provisioning_failures` row.
- **#1 (pre-Stripe duplicate check) is genuinely still open.** `/api/checkout` performs no identity
  check, so a returning customer can still reach Stripe and be charged before the net catches them.
- **The refund promise is specifically the non-US billing path** (`route.ts:630`), not the duplicate
  path. The duplicate case only alerts the operator to decide. `refunds.create` appears **zero
  times** in the codebase, by design. Sandbox money makes this harmless today; live money does not.
- **CLAUDE.md says Postgres 15.** Both projects run 17.6.1.
