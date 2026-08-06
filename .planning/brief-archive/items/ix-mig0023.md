# `ix-mig0023`

**Owner:** Terminal · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **901 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🔴 Armed trap. 0023_remove_avatars.sql cannot run: storage.protect_delete() now blocks SQL deletes from storage tables. It is DDL inside a transaction, so the next supabase db push fails AND rolls back whatever else was pending, on work unrelated to avatars. Rewrite it against the Storage API.

---

## Full text, captured 2026-08-06

🔴 ARMED BOOBY TRAP, RECLASSIFIED 2026-08-05 FROM HOUSEKEEPING. 0023_remove_avatars.sql CANNOT RUN. It fails with: ERROR 42501: Direct deletion from storage tables is not allowed. Use the Storage API instead. CONTEXT: PL/pgSQL function storage.protect_delete(). Supabase added a guard blocking delete from storage.objects / storage.buckets in SQL, and 0023 does exactly that. It is the ONLY migration unapplied in EVERY environment, and because it is DDL inside a transaction IT TAKES THE WHOLE BATCH DOWN WITH IT: the next person to run supabase db push gets a failure that also rolls back anything else pending, on work unrelated to avatars. Until it is rewritten it is deliberately NOT recorded in IURIX PROD’s migration history, matching staging. FIX: rewrite it to drop the bucket through the Storage API rather than SQL. Cheap, and it disarms the trap. Split out of ix-avatarsgone on 2026-08-06.
