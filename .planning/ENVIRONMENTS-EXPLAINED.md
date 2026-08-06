# The database cutover

**For Rob and Katy · 2026-08-06**

## The plan

Move the live site from the practice database to the real one.

`iurixaccreditation.com` is one website, connected to one database at a time. It's currently
connected to a practice database. We're switching it to a clean production database.

## What it does

- Everything the site records — accounts, training progress, certificates — starts going into the
  real database instead of the practice one.
- The 17 test firms stay behind in the practice database and stop mattering.
- Production starts empty, so there's no test data mixed in with real customers later.

## What changes for you

**Katy** — after the switch, anything you do on the site creates a real record. Tell Max before
clicking through the product and he'll set you up somewhere safe.

**Rob** — after the switch, the daily reconciliation email compares real payments against real
accounts. Test accounts sitting in there would show up as false discrepancies, which is why we're
starting clean rather than reusing the practice database.

## What doesn't change

- Same address, same site. Nothing looks or behaves differently.
- No data moves. There are no customers yet.
- **Stripe stays in test mode. This does not enable real payments** — that's a separate decision,
  still ahead of us.

## Timing

Waiting on Rob for one two-minute step: two values pasted into a GitHub settings page. Max has
sent the instructions. After that it's a short window with checks either side.

---

*Technical detail: `.planning/PROD-CUTOVER.md`.*
