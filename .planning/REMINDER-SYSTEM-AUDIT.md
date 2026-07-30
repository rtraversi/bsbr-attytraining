# Reminder system audit — 2026-07-30

P1 Task 5. **Investigation only — no behaviour was changed.** Findings are ordered by severity;
each open question needs a decision, not a quick fix.

## The two mechanisms

### 1. `bsbr-cert-worker` cron

`workers/cert-worker/wrangler.toml` → `crons = ["*/5 * * * *", "0 9 * * *"]`.
The 5-minute trigger drains the cert queue. The daily 09:00 UTC trigger runs three reminder jobs
concurrently (`Promise.all`, failures isolated per job).

| Job | Fires | Recipient | Dedupe key | Lookback |
|---|---|---|---|---|
| `runExpiryReminders` | 90/30/7 days before **cert** expiry | employee **and** firm admin | `expiry_reminder_sent`, `cert_id\|bucket` | 8 days |
| `runInactivityReminders` | invited-not-activated, or enrolled-not-passed, older than `reminder_days` | employee only | `inactivity_reminder_sent`, `firm_member_id` | `reminder_days` |
| `runRenewalReminders` | 30/14/3 days before `current_period_end` | firm admin (owner) | `renewal_reminder_sent`, `days_remaining` | **24 hours** |

All three match buckets with `Math.abs(days - bucket) <= 1`, so **each bucket is eligible on three
consecutive daily runs**. Dedupe is the only thing preventing repeats.

### 2. Settings toggles

| Setting | Column | Who reads it |
|---|---|---|
| "Auto-reminder emails" (3/7/14 days) | `firms.reminder_days` | ✅ the cron — `runInactivityReminders` only |
| "Team member certified" | `firms.notify_cert_earned` | `app/api/certs/generate/route.ts:190` — **not a reminder** |
| *(no UI row)* | `firms.notify_weekly_summary` | **nothing** |

### 3. A third path the plan didn't mention

`app/api/invite/remind` → `lib/invite/send-training-reminder.ts` — the admin's manual **"Remind"**
button on the team table. Same audience as the cron's inactivity reminder.

---

## Does the toggle agree with the cron?

**Partially, and the gap is by omission rather than conflict.**

- `reminder_days` **is** read by the cron and does exactly what its label says. No conflict.
- `notify_cert_earned` is never read by the cron. That is correct scoping — it gates the
  cert-issued notification, not a reminder — so despite sitting under the same "Notifications"
  heading, the two systems do not overlap here.

🔴 **There is no way to turn reminders off.** `reminder_days` changes only the *interval*
(3/7/14). Expiry and renewal reminders have **no toggle and no interval** — they are entirely
unconfigurable. An admin who finds them excessive has no control short of asking support.

---

## Can a reminder fire twice?

### 🔴 Renewal reminders — yes, plausibly, on consecutive days

The dedupe window is 24 hours and the cron period is 24 hours. Those being equal makes the check a
boundary condition:

```
cutoff24h = now - 24h
... event_timestamp >= cutoff24h
```

Day 1's event is written a moment *after* that run begins. If Day 2's run reaches the same firm even
slightly later in its cycle — Cloudflare cron jitter, or a slower pass through the firm loop — then
`cutoff24h` advances past Day 1's event and the dedupe misses. A bucket is eligible on three
consecutive days (`±1`), so the ceiling is **three sends of the same renewal notice**.

The other two jobs are safe by comparison and show what the correct margin looks like: expiry uses an
**8-day** lookback for a 3-day-wide bucket, inactivity uses `reminder_days` (≥3 days). Renewal's 24h
is the outlier, and it is the one aimed at the paying admin.

**Decision needed:** widen the renewal lookback (48h would already be sufficient; 8 days would match
expiry). Not changed here.

### 🟡 The manual "Remind" button writes no event

`sendTrainingReminder` sends the email and records nothing. Two consequences:

1. **No dedupe or rate limit.** Every click sends. Nothing stops an admin sending ten.
2. **The cron cannot see it.** The inactivity job dedupes on `inactivity_reminder_sent` rows, which a
   manual send never creates — so an employee can receive a manual reminder and the cron's automated
   one on the same day. This is the clearest *cross-system* double-send.

It is also **invisible in the audit log**, which matters more than the duplication: every other
reminder writes a `training_events` row, and `api/firm/audit-log/export` is the firm's Rule 5.3
paper trail. "We reminded this employee" is exactly the kind of supervision evidence that export
exists to produce, and the manual path is the one an admin actually initiates.

**Decision needed:** write a `training_events` row on manual reminders (event type would need adding
to the `training_events_event_type_check` constraint — see `0004`), and decide whether it should also
feed the cron's dedupe.

### 🟡 Lowering `reminder_days` shortens the dedupe window retroactively

The inactivity lookback *is* `reminder_days`. Changing 14 → 3 shrinks the window, so someone reminded
4 days ago is immediately eligible again. Working as coded, surprising as configured.

---

## Can a reminder be silently suppressed?

### 🟡 Expiry reminders ignore firm status

`runInactivityReminders` and `runRenewalReminders` both filter `firms.status = 'active'`.
`runExpiryReminders` does **not** — it queries `certificates` by date and looks the firm up by id
with no status check. So a lapsed or cancelled firm's employees keep receiving
"your certificate expires in N days" emails.

Whether that is wrong depends on intent: certificates remain valid records after a subscription
lapses, so warning the holder may be correct. But it is an *inconsistency between the three jobs*
that looks accidental rather than decided.

### 🟢 `notify_weekly_summary` accepts a value nothing reads

`api/firm/settings` validates and persists it; no digest job exists. The UI deliberately hides the
row (`notification-settings.tsx:79-81` documents this), so it is only reachable by calling the API
directly. Correctly handled already — noted for completeness.

### 🟢 Redacted and reassigned users are skipped correctly

All cron jobs skip `@redacted.invalid` addresses, and the inactivity job excludes `deleted` /
`reassigned` members. No suppression bug found here.

---

## Summary

| # | Finding | Severity |
|---|---|---|
| 1 | Renewal dedupe window (24h) equals the cron period — same notice can send up to 3× | 🔴 |
| 2 | No toggle can switch any reminder off; expiry and renewal are wholly unconfigurable | 🔴 |
| 3 | Manual "Remind" writes no `training_events` row — no dedupe, no rate limit, absent from the audit export | 🟡 |
| 4 | Lowering `reminder_days` retroactively shrinks the inactivity dedupe window | 🟡 |
| 5 | Expiry reminders ignore `firms.status` where the other two jobs filter on it | 🟡 |
| 6 | `notify_weekly_summary` is settable via API but read by nothing | 🟢 |

**No conflict was found between the Settings toggle and the cron** — the toggle the cron reads
(`reminder_days`) behaves as labelled. The real gaps are the missing off-switch, the renewal dedupe
margin, and the manual reminder's absence from the audit trail.
