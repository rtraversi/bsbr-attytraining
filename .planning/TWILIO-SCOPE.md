# Twilio phone line — scope

**Written:** 2026-10-20 (Rob + Claude). **Supersedes the design in `BACKLOG.md` #7**, which was
voicemail-only and hosted in a separate Worker. Target: 2026-11-20.

## What this is for

Phone is not a big channel for this business. Buyers are self-serve; most contact will be email.
The line exists so the site can show a real number, and so a prospect who texts or calls gets
answered instead of hitting a dead end. **Text is the likelier channel; voicemail is the fallback.**
Nothing ever rings a cell — there is no `<Dial>` anywhere in this design.

Volume assumption: a handful of messages a month. Every choice below is sized for that.

## What gets built

| Piece | What it does |
|---|---|
| `POST /api/twilio/sms` | Inbound text → `phone_messages` row → operator alert email |
| `POST /api/twilio/voice` | Inbound call → TwiML: greeting + `<Record>` |
| `POST /api/twilio/recording` | Recording finished → copy audio to Storage → `voicemails` row → alert email → delete from Twilio |
| `POST /api/twilio/transcription` | Transcript arrives (async, later) → update the `voicemails` row |
| `/ops/phone` | Operator inbox: SMS threads by number, voicemails with player + transcript, mark handled, **reply** (phase 2) |

### Host: route handlers in the main app, not a separate Worker

`BACKLOG.md` #7 said to copy the `workers/cert-worker` pattern. That made sense for voicemail
alone. With an admin page added, the main app is the better home:

- It already **is** a Cloudflare Worker (OpenNext), so this is not a stack deviation.
- The inbox page needs the same Supabase tables the webhooks write; one codebase, one set of types.
- `lib/resend.ts`, `lib/operator-alert.ts`, `lib/secret-compare.ts` and the service-role client are
  already there.
- `/api/*` is already **outside** the middleware matcher, so the webhooks skip the session
  round-trip with no change to `middleware.ts`.
- `/ops/*` is already behind HTTP Basic auth (`METRICS_DASHBOARD_PASSWORD`), so `/ops/phone`
  inherits the operator gate for free. Firm admins can never reach it.

### No Twilio SDK

The `twilio` npm package is large and Node-flavoured. We need two things from it, both small:

- **Signature validation** — HMAC-SHA1 of the full URL + sorted POST params, keyed with the auth
  token, compared to `X-Twilio-Signature`. ~30 lines with Web Crypto, in `lib/twilio/signature.ts`,
  unit-tested against Twilio's documented example. **Every `/api/twilio/*` route validates first
  and returns 403 on mismatch** — these are public URLs.
- **REST calls** (send SMS, fetch/delete a recording) — plain `fetch` with Basic auth
  (`AccountSid:AuthToken`), same style as the Resend calls.

Gotcha: the signature is computed over the URL **exactly as Twilio requested it**. Build it from
a configured `TWILIO_WEBHOOK_BASE` (`https://iurixaccreditation.com`), not from `request.url`,
which can differ behind Cloudflare.

### Data — migration `0034_phone_line.sql`

```
phone_messages
  id uuid pk, twilio_sid text unique,          -- unique = idempotent on Twilio retries
  direction text check (in ('inbound','outbound')),
  from_number text, to_number text, body text,
  status text,                                  -- Twilio status for outbound
  handled_at timestamptz null, created_at timestamptz default now()

voicemails
  id uuid pk, recording_sid text unique, call_sid text,
  from_number text, duration_seconds int,
  storage_path text,                            -- voicemails/{yyyy}/{recording_sid}.mp3
  transcript text null, transcript_status text,
  handled_at timestamptz null, created_at timestamptz default now()
```

RLS **on, no policies** — only the service-role client touches these. They hold no firm data and
no firm member should ever read them.

### Recordings: copy out of Twilio, then delete there

Recommended: on the recording callback, download the MP3, put it in a **private** Supabase
Storage bucket `voicemails`, then `DELETE` the recording in Twilio. One copy, in a place we already
govern, with retention we control. `/ops/phone` plays it via a short-lived signed URL.

Also: enable **"Enforce HTTP Auth on media URLs"** in Twilio Voice settings, so the Twilio-side
URL is never publicly fetchable even in the seconds before deletion.

Retention: auto-delete voicemails after **12 months** (a monthly cron in the cert Worker, which
already runs crons). Adjust if Katy wants otherwise.

## The one gate: outbound texting needs A2P 10DLC

**Receiving texts works today.** **Sending** any text to a US number from a regular 10-digit
number — including replying from `/ops/phone` — requires **A2P 10DLC registration**: a Brand
(BSBR Holdings LLC, EIN) and a Campaign (use case: customer care / account notifications).
Unregistered outbound is blocked by the carriers.

- Registration is done in the Twilio console. Approval typically takes days to a few weeks.
- Costs are small one-time + monthly fees (brand + campaign vetting, then a monthly campaign fee).
  **Check current figures on Twilio's pricing page** before submitting — they change.
- The campaign needs a sample message, an opt-in description ("customer texts us first") and
  STOP/HELP handling. Twilio's default Advanced Opt-Out handles STOP/HELP automatically.
- If the Twilio number turns out to be **toll-free**, the path is Toll-Free Verification instead
  — usually simpler.

So the build is phased around that approval rather than blocked on it.

## Phases

**Phase 0 — account (Rob, ~1 hour, no code).** This is the "learning Twilio" part.
1. Confirm the number is active, note its area code and type (local vs toll-free), and which
   project/subaccount holds it — the backlog says it was bought for KCL. Move it if it's KCL-scoped.
2. Point the number's Voice URL at a **TwiML Bin** (`<Say>` + `<Record>`), call it, and find the
   recording in the console. Text it and find the message in the logs. That is the whole
   request/response model, seen end to end.
3. **Submit A2P 10DLC (or toll-free verification) now** — it's the long pole, and it runs while
   phase 1 is built.

**Phase 1 — inbound (code).** SMS + voicemail webhooks, signature validation, the two tables,
Storage copy, alert emails, `/ops/phone` read-only inbox with "mark handled".
Done when: a text and a voicemail from a real phone both show up in the inbox and in email.

**Phase 2 — reply (after 10DLC approval).** Reply box on each SMS thread → `POST` to Twilio
Messages API → `outbound` row. Delivery status via a status callback.

**Phase 3 — cut over.** Put the number on the site and Facebook (see the decision below), update
the Privacy Policy, delete the TwiML Bin.

## Must change elsewhere

- **Privacy Policy §4 sub-processor table** (`app/privacy/page.tsx`): add **Twilio** — phone
  number, message content and voicemail audio of anyone who contacts us. Katy should review the
  wording; it's a legal page.
- **Secrets** (`wrangler secret put` on the app Worker): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
  Var: `TWILIO_WEBHOOK_BASE`. Never in source.
- **Footer + Facebook**: number changes at cut-over unless the GV number is ported (below).

## Decisions for Rob

1. **Which number goes public?**
   (a) Switch to the existing Twilio number — simplest, but the site and Facebook change a
   second time.
   (b) **Port 919-446-1819 from Google Voice into Twilio** — the printed number never changes.
   Google charges a small unlock fee; confirm Twilio accepts the port before relying on it.
   Then the old Twilio number can be released.
2. **Reply by text at all?** If yes, start 10DLC in phase 0. If replies will always go by email
   or a call back from your cell, skip phase 2 and the registration entirely.
3. **Greeting:** text-to-speech `<Say>` (free, instant) or a recorded MP3 `<Play>` (reads more
   like a serious firm). Can start with `<Say>` and swap later.
4. **Transcription:** Twilio's built-in `transcribe` on `<Record>` is the cheap, simple option,
   with limits (short messages, English). Verify it's still offered on the account; if not,
   voicemails ship audio-only and a transcript is a later add.
5. **Retention:** 12 months for voicemails and texts — OK?
