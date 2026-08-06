# `ix-lessoncounter`

**Owner:** Terminal · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,455 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🔴 Bug found by Max 08-05. Using the final-review skip leaves three widgets on one page disagreeing: the header says all done with the certificate issued, checks say 5/5 cleared, the LESSONS pill says 3/5. Almost certainly the display half of ix-skipcascade, which was fixed in the data layer only (a21aa59). The counter must derive from the engine that grants completion, not from lessons walked.

---

## Full text, captured 2026-08-06

🔴 BUG FOUND BY MAX 2026-08-05 — THE LESSON COUNTER DOES NOT UPDATE WHEN THE FINAL-REVIEW SKIP IS USED INSTEAD OF THE NORMAL GO. Screenshot evidence: header reads “Hi, you're all done!” with the certificate issued and Lesson checks showing 5/5 CLEARED, while the LESSONS pill on the same screen reads 3/5 and the course outline still shows Lesson 4 as current. Three widgets on one page disagreeing about the same fact. 🟡 THIS IS ALMOST CERTAINLY THE DISPLAY HALF OF ix-skipcascade. Terminal fixed that bug in the DATA layer (commit a21aa59) and said explicitly it had NOT touched the display, flagging that if what Max saw on 07-30 was “the screen lying rather than the record” then that half was still open. Max chose to re-test rather than guess. This is the re-test, and it says the display half is still broken. The lesson-5 test-out shortcut is a DELIBERATE feature (lib/training/progress.ts: pass lesson 5 directly, skip 1-4, receive full completion), so the counter needs to derive from the same engine that grants completion rather than counting lessons walked. ⚠ WHY IT MATTERS MORE THAN IT LOOKS: this is the learner-facing progress display on a compliance product. Someone who has genuinely finished and holds a certificate is being told they are on 3 of 5. Related but distinct from the dashboard certificates bug fixed in 95c040e, which was the ADMIN side showing recertified staff as Expired. Same family: state derived twice, two answers.
