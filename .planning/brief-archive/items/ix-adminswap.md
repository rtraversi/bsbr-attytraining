# `ix-adminswap`

**Owner:** Terminal · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,436 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

DECIDED 07-31: admins can swap a seat, guarded at 80%. ✅ The lock already exists and matches Max's number exactly (reassign/route.ts blocks at 4 of 5 lessons, keyed on highest lesson reached, fails closed). 🔴 What is missing is THE APPEAL: there is no way for Rob or Max to grant an override. Build three things: a refusal that explains itself in-product rather than a bare 409, an appeal path, and an actual override.

---

## Full text, captured 2026-08-06

DECIDED — YES, admins can swap a seat. LOGGED 2026-07-31 13:30 MST (Max): “yes of course they can. the reassign function is there in case a stale employee or even a fired employee can be swapped and the firm remain certified.” HIS GUARD, verbatim: “if the firm is trying to be sneaky and share the training, they will be able to by assigning and reassigning without ever clearing the checks. so if they have seen at least 80 of the content then they cannot reassign and we will notify them with a pop up or a prompt or something. but they can still appeal. so that functionality also has to be built in. imagine an employee left just about 80% done. that doesnt mean foul play, and so they can appeal it, contact rob or me, and then we can approve.” ✅ THE 80% LOCK ALREADY EXISTS AND MATCHES — reassign/route.ts blocks at REASSIGN_BLOCK_LESSON, keyed on the HIGHEST lesson reached from lesson_location_changed events. 4 of 5 lessons = 80%, so Max's number and the shipped threshold are the same. It fails CLOSED on a lookup error, deliberately. 🔴 WHAT IS MISSING IS THE APPEAL. P0 shipped this with “escalation via support, no override mechanism” — there is NO way for Rob or Max to approve a legitimate case. Max's example is the real one: someone who left at 80% is not foul play. NEEDS BUILDING: the refusal must explain itself in-product (not just a 409), offer an appeal path, and give Rob/Max a way to actually grant the override
