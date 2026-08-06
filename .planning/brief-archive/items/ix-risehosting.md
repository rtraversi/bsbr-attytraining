# `ix-risehosting`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,318 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

📋 TABLED by Max 08-04, kept so it is not lost. The training content is public: rise_embed_url returns 200 with no auth, so Articulate is a sub-processor and anyone with the link can view the courseware. ✅ What is SOLD is still protected, since the quiz is server-scored behind enrollment. 🔴 Self-hosting alone does not fix it: a public R2 bucket reproduces the problem on our own domain. Needs a private bucket plus a session-gated route.

---

## Full text, captured 2026-08-06

📋 TABLED 2026-08-04 by Max — recorded so it is not lost. THE TRAINING CONTENT IS PUBLIC. courses.rise_embed_url is https://share.articulate.com/g5IsRaevWCyhu8oIoRM-m and it returns HTTP 200 with NO authentication (verified). THREE CONSEQUENCES: (1) Articulate Global, LLC is a DPA sub-processor — every employee’s IP and browser reaches them; (2) the courseware is readable by anyone with the link, so an enrolled user can pass it to unlimited colleagues; (3) the “strictly necessary cookies only” claim cannot be made unconditionally while a third-party iframe runs on the training page. ✅ WHAT STILL HOLDS: the certification quiz is server-scored behind the enrollment and seat gates, so someone with the link can VIEW the training but cannot obtain a certificate. What is sold is protected; only the courseware leaks. 🔴 THE STEP PEOPLE SKIP: self-hosting alone does NOT make it private. Dropping the export into public/ or a public R2 bucket reproduces the same problem on your own domain. The fix is three steps — Max exports the Rise web package (his, not Rob’s), it goes in a PRIVATE R2 bucket, and a route validates session + hasTrainingAccess before streaming files. Makes ix-monogram-style branding cleanup irrelevant here; this is about access. Also closes the Articulate row on the DPA sub-processor list.
