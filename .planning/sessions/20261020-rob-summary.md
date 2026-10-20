# 2026-10-20 — Rob (terminal-Claude) — Facebook page, phone number, Twilio scope

## What was done

**Facebook page "Iurix Accreditation"** (`facebook.com/profile.php?id=61595546073342`, now with a
custom username — Rob set it). Copy written with the framing correction in force: **the AI policy
first, the training second, no Rule 5.3.**
- Bio (240 chars) is live: "Iurix gives solo and small law firms a written AI use policy tailored
  to the firm: what staff may use AI for, what they may not, and how client confidences are
  protected. Then we train your staff to follow it, with certificates to prove it."
- Rob completed: action button → `/pricing`, username, category → Legal, PO Box address hidden,
  hours. Service area left blank — Facebook only accepts cities/states/ZIPs, not "United States".
- A first post was drafted in chat (not saved in repo); not yet published.
- Still to do on the page: **cover photo (1640×624)** and **profile picture = the seal alone**
  (the wordmark is unreadable in the circle); publish the first post with the seal image before
  inviting anyone; reviews stay off until there are happy firms; **swap the old 919-609-2808 in
  Contact info for 919-446-1819.**

**Phone number on the site.** The site had no phone number (footer deliberately omitted it). Added
**919-446-1819** (Google Voice) as a `tel:` link under the email in `app/_components/footer.tsx`
(shared by home, /pricing, legal pages). **Committed, not deployed.**

**Google Voice is interim.** BACKLOG #7 had rejected GV in August because free numbers are
reclaimed. Google's wording: reclaimed if not "placing calls or sending text messages for a period
of 3 months" — **outgoing only**, so an automated inbound ping (the cron Rob asked about) would not
keep it alive and was not built. Rob will send one text from the GV app monthly (calendar reminder).

**Twilio scoped** → `.planning/TWILIO-SCOPE.md` (supersedes BACKLOG #7's design; target
2026-11-20). SMS + voicemail + an `/ops/phone` operator inbox, built as route handlers in the main
app (not a separate Worker), no Twilio SDK, recordings copied to a private Storage bucket and
deleted from Twilio. Outbound SMS (replies) gated on A2P 10DLC registration — phased around it.

## Status
- Footer change committed + pushed (push = preview only). **Production does not show the number
  until** `gh workflow run deploy.yml --ref main -f target=production`.
- Twilio: nothing built. Phase 0 (Rob, console, no code) is next.

## Open questions (Rob)
1. Port 919-446-1819 from GV into Twilio (number never changes) vs. switch to the existing Twilio number.
2. Reply by text at all? If not, skip 10DLC and phase 2.
3. Greeting: TTS `<Say>` vs recorded MP3.
4. Retention: 12 months for voicemails/texts?
- Process note: CLAUDE.md asks for `/gsd:quick` before edits; it was not available in this session,
  so the footer/doc edits were made directly.
