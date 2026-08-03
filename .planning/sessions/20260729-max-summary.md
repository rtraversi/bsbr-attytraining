# 2026-07-29 — Max, terminal

Two threads: finishing the domain/cert cleanup from 07-28, then the **seat double-count fix**
(billing correctness). A **parallel session (Claude Opus 4.8) landed four more commits** late in the
day — domain cutover Phase C, the Resend from-address, and the three long-untracked files. Those are
recorded here too because they change live behavior and this session did not do them.

## Thread 1 — domain + cert cleanup (2 commits, pushed, deployed)

- **`f3db0c3`** — cert footer contact `accreditation@iurix.com` → `accreditation@iurixaccreditation.com`.
  The change was already sitting uncommitted in the tree at session start; it resolves the 07-28 open
  item about printing a domain the project may not own. ⚠️ **The mailbox still does not exist** —
  it needs creating and verifying before a real certificate ships with it printed on.
- **`a070030`** — `workers/cert-worker/wrangler.toml`: `APP_URL` → `https://iurixaccreditation.com`
  (was the old `bsbr-attytraining.aistaffcompliance.workers.dev`). Feeds reminder-email links and the
  cron `POST ${APP_URL}/api/certs/drain`. The empty `[env.staging.vars]` entry was left alone.

**Deployed and verified** (not assumed): main app `bc3ac499` → **`ab58a544`** @ 13:47:48Z;
cert-worker `c70f4de6` (last shipped 06-24) → **`28238ebc`** @ 13:48:27Z. Both post-dated the commit.
The cert-worker deploy used `--config wrangler.toml`; without it, plain `wrangler deploy` from that
directory picks up the root `wrangler.jsonc` and redeploys the main app instead.

**Finding: `iurixaccreditation.com` is live.** `/api/health` returned `{"status":"ok","db":"ok"}` —
Rob's Phase A zone setup had landed. Confirmed before pointing anything at it.

**Confirmed the cert-worker `fetch` handler is a no-op stub** — it validates the secret, parses the
payload, reaches `// TODO: implement full cert generation pipeline`, `void`s the fields and returns
200. A Supabase webhook aimed there would silently never generate certificates.

## Thread 2 — seat double-count fix (3 commits, pushed, deployed)

Billing correctness: every employee consumed **two** seats, and an admin who declined training
silently consumed one. Seats are the Stripe billing unit, so this under-delivered paid capacity.

- **`21c6ae9`** — migration `0015_fix_seat_double_count.sql` + regenerated `types/supabase.ts`.
  New column `firm_members.occupies_seat`. `sync_used_seats()` rewritten around one predicate:
  a row occupies a seat when `occupies_seat AND status IN ('invited','active')`. A pending invite
  reserves a seat, so `invited → active` is occupying→occupying and stays silent — that silence is
  what removes the double count. Backfill releases admins with no enrollment row, then every firm's
  count is recomputed from scratch.
  - ⚠️ The trigger **had** to be recreated as `after insert or update of status, occupies_seat or
    delete`. It previously watched `status` alone; under that declaration flipping `occupies_seat`
    would not fire it and the admin opt-in could never register a seat.
  - Added `set search_path = public` to the `security definer` function (matches the `0014`
    precedent). Small deviation from the plan, flagged at the time.
- **`c78df3d`** — removed the three manual `used_seats` increments (`invite`, `invite/bulk`,
  `onboarding/complete`). Also kills a read-then-write race the manual writes had; the trigger's
  in-place increment is atomic.
  - **`initialUsedSeats` in `invite/bulk` is NOT unused** — the plan warned to check, and it was
    right. It seeds `seatsAvailable` (`:66`), the per-row capacity guard at `:77` that decrements at
    `:105`. Only the trailing write was deleted; the guard is intact.
  - `reassign` and `delete` deliberately untouched — already trigger-only and correct.
- **`1e3814e`** — admin seat opt-in. Stripe webhook creates the admin with `occupies_seat: false`;
  `onboarding/complete` flips it to `true` only inside the `enrollSelf` branch. Placed at the **top**
  of that branch rather than inside the `if (!existing)` enrollment guard, so a retry after a partial
  failure still reserves the seat; naturally idempotent because `true → true` is ignored by the
  trigger.

### Verification done

- Applied with `supabase db push` (never `db reset`). Confirmed linked project = `ndmzvtuywcufvkxtkjhg`
  = **IURIX STAGING** (PROD is a different ref, `ttqthtzdjacrhjtrcmmy`). `migration list` showed only
  `0015` pending.
- Reconciliation: **14 firms, 0 mismatches** between `used_seats` and a recomputed count. Re-checked
  after testing — still clean.
- **Trigger test, 11/11**, against a throwaway firm on staging (created + fully removed, 0 rows
  remaining, 2 auth users deleted): invite `+1`; activation **no change**; soft delete `−1`; restore
  `+1`; hard delete `−1`; admin insert `occupies=false` → `0`; admin status flip without opt-in → `0`;
  opt-in `false→true` → `+1`; re-run `true→true` → no change; opt-out → `−1`.
- `npx tsc --noEmit` and `eslint` clean on all four touched files.

Max deployed the seat fix: version **`29fe33b0`** @ 16:31:28Z, post-dating commit `1e3814e` @ 16:08Z.

### 🔴 The E2E walkthrough was designed but NEVER RUN

A live walkthrough through the real routes was planned and then not executed — the session wrapped
first. **The two predictions remain untested against the app:**

1. `used_seats = 0` after onboarding with **enroll-self unticked**
2. `used_seats` **does not change** when an invited employee sets their password

A read-only reporting query was built and smoke-tested for this
(`<scratchpad>/seat-report.mjs` — takes a firm name fragment or uuid, prints `used_seats`/`max_seats`,
a recomputed count, and every member row with `role`/`status`/`occupies_seat`). Worth moving into the
repo if seat work continues. **No test firms were created**, so there is nothing to clean up —
verified: no firm matching `SEATTEST` or `ZZ `.

**Two traps for whoever runs it:**
- **Inviting alone cannot detect the bug.** The old double fired at *activation*, not invite. Invite
  5 people without any of them setting a password and buggy and fixed code both read 5.
- **The seat arithmetic.** If the admin takes a seat, a 5-seat firm is admin + **4** employees, so the
  5th employee is *correctly* refused — which looks exactly like the bug. Onboarding with enroll-self
  unticked avoids this and tests the admin half for free.

## Thread 3 — parallel session (Claude Opus 4.8), 19:07–19:08Z, NOT this session

- **`d593123`** — `wrangler.jsonc` + `emails/_components/email-shell.tsx` → `iurixaccreditation.com`.
  This is the Phase C work this session had pre-validated and was holding on Rob's E3 confirmation.
  ⚠️ **New trap beyond the runbook:** `NEXT_PUBLIC_APP_URL` is *also* inlined at build time from
  `.env.local` and `.env.production` (**both gitignored**) — editing `wrangler.jsonc` alone changes the
  runtime value but not the client bundle, which is why three deploys produced an identical chunk hash.
  Both env files were updated locally; **other machines (Rob's) need the same edit.**
- **`fda2b70`** — Resend from-address → `noreply@iurixaccreditation.com` (`lib/resend.ts` +
  `workers/cert-worker/src/index.ts`). Resend had been returning **403 on every send** — onboarding,
  invites, cert delivery and reminders were all silently down. Rob verified the new domain (DKIM/SPF/
  DMARC). ⚠️ **The cert-worker keeps its own duplicate constant — the two must stay in sync.**
- **`d4acfc4`** — `app/favicon.ico` deleted, `app/icon.png` committed. Mark still too detailed to read
  at favicon size; wants a simplified trace.
- **`2bf56d7`** — `.planning/IURIX-RENAME-PLAN.md` committed as a record; `.planning/RENAME-IURIX.md`
  stays authoritative.

Those first three were the "deliberately excluded from every commit" files carried for days — now
tracked. Working tree is clean for the first time in a while.

## Status

`main` == `origin/main`, everything pushed, **working tree clean**.

⚠️ **Deploy state is uncertain.** The last deploys (main app `da2270b8` @ 18:38:22Z, cert-worker
`32f6fd00` @ 18:39:10Z) **predate the final commits** (`2bf56d7` @ 19:08:24Z) by ~30 minutes. That is
the repo's usual deploy-from-dirty-tree-then-commit pattern, so the deployed build probably does match
HEAD — but it cannot be proven from timestamps. **A fresh `pnpm run deploy` from clean `main` would
settle it**, and the cert-worker needs its own (`fda2b70` changed its source).

## 🔴 Open / next

1. **Run the seat E2E walkthrough** — top item. Both predictions untested through the real routes.
2. **Fresh deploy from clean HEAD** (both workers) to remove the timestamp ambiguity above.
3. **Supabase DB webhook target — still unverified.** Needs the dashboard (Database → Webhooks); no
   `psql` on this machine and the CLI has no arbitrary-SQL command. Lower stakes than it reads: the
   primary cert trigger is the in-app `after()` call at `app/api/quiz/attempt/route.ts:226`, proven by
   `IX-20260728-4289` being issued live, so a misaimed webhook would be a redundant no-op rather than
   a silent outage.
4. **`info@aistaffcompliance.com` is still hardcoded in 5 places** — `app/privacy/page.tsx:65-66`,
   `app/terms/page.tsx:78-79`, `app/dpa/page.tsx:80-81`, `app/login/page.tsx:62`, and as the operator
   fallback at `app/api/webhooks/stripe/route.ts:116`. Live on the deployed `/login` footer. This is
   cutover item C4, blocked on Rob's new contact address. (The earlier sweep missed these because it
   searched only for the `workers.dev` origin, not the bare marketing domain.)
5. **`accreditation@iurixaccreditation.com` mailbox does not exist** — printed on every certificate.
6. Katy's real disclaimer copy; an attorney name for the cert signature line; the decorative half of
   the cert (seal, real QR — the QR also needs a verification endpoint that does not exist).

## Long-carried (unchanged)

Auth perf ~5s/route (diagnosed, ~7 files, **still awaiting Max's go-ahead since 07-17**); real
question pool (Katy/Rob); Stripe live mode (Stripe Tax address → state reg); Storyline "Paul"
false-positive completion gate (Rob/Katy); `certificate_number_seq` now dead and droppable; the 3.4MB
brand SVG still needs SVGO; still no wordmark asset.
