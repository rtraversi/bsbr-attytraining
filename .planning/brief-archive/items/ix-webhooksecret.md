# `ix-webhooksecret`

**Owner:** Rob · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **510 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

The webhook shared secret sits in plaintext inside the Database Webhook trigger definitions, readable by anyone who can query pg_trigger. Inherent to how they work, not a mistake. Staging's value has been there since June; PROD should get a fresh one, matching WEBHOOK_SECRET / CERT_WEBHOOK_SECRET on both Workers.

---

## Full text, captured 2026-08-06

THE WEBHOOK SHARED SECRET SITS IN PLAINTEXT inside the Database Webhook trigger definitions, readable by anyone who can query pg_trigger. That is inherent to how Supabase Database Webhooks work, not a mistake we made. Staging’s value has been sitting there since June. PROD should get a fresh one rather than inheriting it, and whatever is chosen has to match WEBHOOK_SECRET / CERT_WEBHOOK_SECRET on BOTH Workers or cert generation stops. Part of ix-prodcutover, tracked separately so it is not lost inside it.

---

## Board text as of 2026-08-12

> The board text moved on after the capture above. Recorded here verbatim before the row was
> reduced to a single imperative sentence.

🟡 HALF DONE 2026-08-06. A fresh PROD-only secret was generated and is live in both PROD Database Webhook headers, replacing staging's bsbr3344-* value which had been in plaintext since June. 🔴 REMAINING: the same value still has to reach WEBHOOK_SECRET and CERT_WEBHOOK_SECRET on the cert-worker and CERT_WEBHOOK_SECRET on the app Worker. Until then PROD's webhooks would 401 against the live app. One secret, four places. Closes with ix-prodcutover.
