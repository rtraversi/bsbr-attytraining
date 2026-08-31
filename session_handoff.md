# Session Handoff

**Date:** 2026-08-31
**Who:** Max, with desktop-Claude, terminal-Claude and Codex

> 🔴 **Deploy status is only ever answered by the workflow list**, never by commits or timestamps:
> ```bash
> gh run list --workflow=deploy.yml --limit 15 \
>   --json event,conclusion,createdAt,headSha,displayTitle
> ```
> A `push` run is a **preview**. Only a `workflow_dispatch` whose "Deploy to production" step
> succeeded actually shipped. **Nothing has shipped since 2026-08-24T19:34:58Z.**

---

## What happened today

**The policy generator went from an idea to a tested engine.** Katy's policy was dissected clause
by clause, mapped to the intake's real question keys, ratified as a 22-section spine, and built.
All 20 vendor platforms researched.

```
main               4837632  D8 — Katy's 08-31 reversals, locked and not built   ← pushed
policy-assembler   3317db7  P2 truncates cleanly, vendor blocks deliver facts   ← pushed
```

**371 tests**, clean `tsc` and `eslint`. Working tree clean, nothing uncommitted anywhere.

**Full detail:** `.planning/sessions/20260831-max-summary.md`.
**The artifact:** `.planning/POLICY-ENGINE-MAP.md` — the dissection, the spine, D1–D8, the gaps.

---

## Read these three first

**1. Katy reversed three things this morning and none of them are built.** Answers are **kept**, not
purged. Editable **indefinitely**, including after the policy is delivered. Retained for the life of
the paid subscription plus a renewal grace period, which she wants pitched as a reason to renew.
Output is **`.docx`**, never a static PDF. Three of these contradict shipped code — map §13.1.
**Migration `0030` is not wasted**: only the lock moves, `reopened_count` still does its job.

**2. `lib/policy/vendor-block.ts` has not been legally reviewed and should not ship.** It is the only
place in `lib/policy` where text is generated rather than transcribed. For the **15 vendors whose
terms are unclear**, the generated clause bars client-confidential information from the platform
until the firm obtains written no-training confirmation. That follows from Katy's baseline, but it
is a **reading** of her rule, not her words. Show her.

**3. The committed `.txt` had never contained the actual policy.** It carried the modules, the prose,
the ethics catalogue and the full glossary, and **zero** hits for `ARTIFICIAL INTELLIGENCE POLICY
FOR`. The operative draft existed only in `~/Downloads`. The complete `.md` is now committed.

---

## Status

| Thing | State |
|---|---|
| Policy engine | built, 371 tests, **not merged to `main`** |
| §5–§22 block text | TODO. Most is transcription; **P3, P7, P8, P24, P26, P27, P28 need drafting** |
| Vendor research | **20/20 rows**, every one with source URL, verbatim quote and date |
| D8 (Katy's reversals) | **locked, not built** |
| Privacy §2/§5 intake-answer category | ❌ still unwritten, now also needs the retention rule |
| `0028`+`0029`+`0030` on PROD | ❌ none of them |
| `Intake-uploads` bucket on PROD | ❌ does not exist |
| Resend | ❌ still 403 `domain is not verified` |
| Deployed? | ❌ no `workflow_dispatch` since 2026-08-24 |

---

## Next steps

1. **Katy reviews `vendor-block.ts`**, the 15-unclear restriction clause especially.
2. **Build D8** — reopen after delivery, kill the purge, a subscription-scoped retention clock, a
   `.docx` renderer.
3. **Transcribe §5–§22.** Mechanical for most; the seven listed above need real drafting.
4. **Privacy §2/§5.** Katy's copy. Carried since the intake's first batch.
5. Carried: PROD migrations + the bucket, Resend, the two nav-pill AA failures.

---

## Open questions

1. 🔴 **Do the 15 `unclear` vendor blocks earn their keep?** They cannot settle the training
   question, but they do name the feature, say whether it is on by default, and give the opt-out
   path. Kept on that basis; Katy may disagree.
2. **Slack.** Verified against slack.com: it trains models on customer messages by default, and
   opting out is an email from an Org Owner rather than a setting. It does **not** train generative
   AI on customer data. A firm on stock Slack is offside Katy's baseline until that email is sent.
3. **`general_llms`** is an option on `research_tools` but is a category, not a vendor. P12 covers
   it. Confirm nothing else is expected there.
4. Carried: `/api/invite/bulk` still discards the `name`; nothing sends invites from the intake
   roster; the purge does not exist — **and per D8 it now never should**.
