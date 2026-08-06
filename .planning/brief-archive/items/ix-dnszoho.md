# `ix-dnszoho`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,469 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🔴 Read before touching mail. The apex gained Zoho MX and SPF on 08-04, so Cloudflare Email Routing would overwrite them and break inbound mail. DO NOT ENABLE IT. ⚠ Still unverified: nobody has confirmed Resend still sends. DKIM and the send. subdomain look intact, but the API key is send-only and cannot list domains, so the only real test is sending one message. A mail change broke everything for days on 07-29.

---

## Full text, captured 2026-08-06

🔴 THE DNS CHANGED UNDER US ON 2026-08-04 — READ BEFORE TOUCHING MAIL. The apex went from ZERO MX and ZERO TXT (verified by dig 08-03) to ZOHO MX (mx.zoho.com, mx2, mx3) plus v=spf1 include:one.zoho.com and a zoho-verification TXT. Caught by terminal, confirmed by dig. CONSEQUENCE 1: session_handoff.md next-step 5 said Cloudflare Email Routing was “verified safe because the apex is empty”. That is now HARMFUL ADVICE — configuring it would overwrite the Zoho MX and break inbound mail. Corrected in the handoff with a DO NOT DO THIS marker. CONSEQUENCE 2 🔴 UNVERIFIED RISK: nobody has confirmed Resend still sends. DKIM at resend._domainkey is intact, the send. subdomain keeps its own MX and SPF, and DMARC uses relaxed alignment, so it SHOULD be unaffected — but the Resend API key is send-only (restricted_api_key) and cannot list domains, so this cannot be checked from the CLI. The only real test is sending one message. A mail change broke onboarding, invites, cert delivery and reminders for DAYS on 07-29; do not assume. Max: check tomorrow. CONSEQUENCE 3: two code comments now state the opposite of the truth — lib/resend.ts:2-5 and workers/cert-worker/src/index.ts both justify the noreply@ sender with “the zone has no inbound MX, so replies would bounce”. Queued for terminal. CONSEQUENCE 4: info@ and accreditation@ may now be real mailboxes, which changes ix-certmailbox, ix-supportdest and possibly ix-smtp. NOBODY HAS CONFIRMED THE MAILBOXES EXIST.
