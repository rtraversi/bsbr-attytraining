# One website, two databases — what's changing, and what it means for you

**For Rob and Katy · written 2026-08-06 · plain English, no setup required**

## The short version

`iurixaccreditation.com` is **one website**. Behind it sit **two separate databases**, and the
website only ever talks to one of them at a time.

Think of the website as the office and the databases as filing cabinets. There are two cabinets:
a **practice** one and the **real** one. Same office either way — we just change which cabinet
the office files into.

- **Right now:** the office files into the **practice** cabinet.
- **After the cutover (a short, planned window):** it files into the **real** one.

## Why there are two

The practice cabinet is where everything so far has landed: every test firm, every trial run,
every "let's see what happens if I click this." There are **17 test firms** in there. None of it
is real, and none of it ever should have been treated as real.

The real cabinet is new and deliberately empty. Nothing is in it that we didn't put there on
purpose.

## The one thing that surprised us

Nobody chose to test against the practice cabinet. **It happened by accident of how things were
set up**, and it just happened to be the safe outcome. There has never been a separate "practice
website" to go to — there's only ever been the one address, quietly wired to the practice cabinet.

That's fine. It's also about to stop being true.

## What it means for you, in one line each

**After the cutover, anything you do on `iurixaccreditation.com` is real.**

- **Katy** — if you want to click through the product, see the training flow, or try a purchase to
  review the experience, **tell Max first**. He'll point you at a safe way to do it. Casually
  clicking around afterwards creates real records in the real cabinet.
- **Rob** — the daily reconciliation email becomes meaningful the moment Stripe goes live. It
  compares real payments against real accounts. Test accounts sitting in the real cabinet would
  show up as discrepancies and make that report untrustworthy on exactly the day you need to
  trust it. That's the whole reason we're moving to a clean cabinet instead of reusing the old one.
- **Both** — nothing you've done so far is affected, and nothing needs undoing. This is about
  what happens next, not what happened already.

## What is NOT changing

- The address stays `iurixaccreditation.com`. Nothing about the site's appearance or behaviour
  changes.
- No customer data moves. There are no customers yet.
- Stripe stays in test mode. **This cutover does not make the product able to take real money** —
  that's a separate decision, with its own checks, still ahead of us.

## When

Waiting on Rob for one two-minute step (two values pasted into a GitHub settings page — Max has
sent the exact instructions). After that it's a short window with checks either side.

---

*Detail for whoever needs it: `.planning/PROD-CUTOVER.md`.*
