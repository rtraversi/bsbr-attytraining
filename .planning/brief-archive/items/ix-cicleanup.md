# `ix-cicleanup`

**Owner:** Terminal · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **918 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

Four one-liners. deploy.yml never prints the preview URL (its grep expects a string wrangler does not emit). DEPLOY-RUNBOOK step 2 still says copy NEXT_PUBLIC_APP_URL from .env.local, which holds localhost. DEPLOY-CHECKLIST still says pnpm run deploy, unsafe off macOS/Linux. CI actions warn on Node 20.

---

## Full text, captured 2026-08-06

SMALL CI AND DOC CLEANUPS, GROUPED BECAUSE THEY ARE ALL ONE-LINERS WITH THE SAME OWNER. (1) deploy.yml NEVER PRINTS THE PREVIEW URL: its grep expects a workers.dev string that opennextjs-cloudflare upload does not emit, so the run summary shows ‘Preview uploaded’ over a blank line. Build it from the version ID meanwhile: first 8 characters + -bsbr-attytraining.aistaffcompliance.workers.dev. (2) .planning/DEPLOY-RUNBOOK.md step 2 still tells you to copy NEXT_PUBLIC_APP_URL from .env.local, which holds localhost:3000. See ix-cisecrets for why that ships broken password-reset links from a green build. (3) .planning/DEPLOY-CHECKLIST.md (June) still says pnpm run deploy; that predates the Windows discovery and is safe only on macOS/Linux. (4) actions/checkout@v4, actions/setup-node@v4 and pnpm/action-setup@v4 warn about Node 20 deprecation and are being forced onto Node 24. Harmless today, will not be forever.

---

## Board text as of 2026-08-12

> The board text moved on after the capture above. Recorded here verbatim before the row was
> reduced to a single imperative sentence.

Small cleanups, grouped. (1) deploy.yml never prints the preview URL — its grep expects a string wrangler does not emit. (2) DEPLOY-RUNBOOK step 2 still says copy NEXT_PUBLIC_APP_URL from .env.local, which holds localhost. (3) DEPLOY-CHECKLIST still says pnpm run deploy, unsafe off macOS/Linux. (4) CI actions warn on Node 20. (5) NEW 2026-08-06: supabase/migrations/0023_remove_avatars.sql references scripts/remove-avatars-bucket.ts twice (lines 21, 44) but the file is .mjs — desktop wrote the comment and created the script with different extensions in the same change. Found by Codex.
