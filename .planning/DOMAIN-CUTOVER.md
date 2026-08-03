# Domain Cutover Runbook — `iurixaccreditation.com` → `bsbr-attytraining` Worker

**Written:** 2026-07-28 | **For:** Max | **Supersedes:** `.planning/DEPLOY-CHECKLIST.md` (2026-06-17,
written for the first deploy and now stale)

Moves the app + marketing site from `bsbr-attytraining.aistaffcompliance.workers.dev` to
`iurixaccreditation.com` on the existing `bsbr-attytraining` Worker. **No new Worker is created.**

**Who does what:** Rob owns the registrar, the Cloudflare dashboard, and the external accounts
(Resend / Stripe / Supabase dashboards). Max owns the repo and the CLI. Marked per step.

---

## ⚠️ Two traps that will silently waste a day

**1. `NEXT_PUBLIC_APP_URL` is baked in at BUILD time, and NOT from `wrangler.jsonc`.** Next.js
inlines every `NEXT_PUBLIC_*` var into the client bundle during `next build`, reading it from
**`.env.local` and `.env.production`**. `wrangler.jsonc` vars are **runtime-only — they never reach
the browser.** Changing the value in the Cloudflare dashboard or in `wrangler.jsonc` **does nothing
to already-built assets**, and neither does rebuilding if the env files still hold the old value.

> 🔴 This cost several hours on 2026-07-29. Three consecutive deploys produced an **identical chunk
> hash** because only `wrangler.jsonc` had been edited. It reads exactly like a caching bug.

⚠️ **`.env.local` and `.env.production` are gitignored** — the edit does not travel with a commit.
**Every machine that deploys needs it made locally** (Rob's included). To confirm the value actually
landed in the bundle, grep the built client chunks for the new host rather than trusting the deploy
output.

**2. A Worker *secret* silently overrides a `vars` entry.** `NEXT_PUBLIC_APP_URL` is declared in
`wrangler.jsonc:9` as a plain var, but `DEPLOY-CHECKLIST.md` step 4 told Rob to also
`wrangler secret put NEXT_PUBLIC_APP_URL`. If that secret exists, it wins and your `wrangler.jsonc`
edit is ignored. **Check first:**

```bash
wrangler secret list --name bsbr-attytraining
```

If `NEXT_PUBLIC_APP_URL` appears in that list, either delete it
(`wrangler secret delete NEXT_PUBLIC_APP_URL --name bsbr-attytraining`) and rely on `vars`, or keep
it as the single source of truth and update it there. **Pick one — do not maintain both.**

---

## Phase A — Zone setup  *(Rob)*

1. Register `iurixaccreditation.com`.
2. Cloudflare dashboard → **Add a site** → `iurixaccreditation.com` → pick a plan (Free is fine).
3. Cloudflare issues two nameservers. Set them at the registrar, replacing whatever is there.
4. Wait for the zone to show **Active** in Cloudflare (usually minutes; can be hours).

```bash
# verify — should return Cloudflare nameservers, not the registrar's
nslookup -type=NS iurixaccreditation.com
```

> **Start Phase E1 (Resend) as soon as the zone is Active** — DKIM propagation is the slowest
> external step and it runs fine in parallel with everything below.

---

## Phase B — Attach the custom domain  *(Rob, dashboard)*

Cloudflare dashboard → **Workers & Pages** → `bsbr-attytraining` → **Settings** → **Domains & Routes**
→ **Add** → **Custom Domain** → `iurixaccreditation.com`.

Repeat for `www.iurixaccreditation.com` if you want the www variant.

- Use **Custom Domain**, *not* Route. Custom Domain auto-creates the DNS record and provisions the
  TLS cert. Routes require you to manage the DNS record yourself and are for path-level control.
- The `*.workers.dev` URL keeps working. Don't turn it off — branch preview URLs still use it.
- The **cert worker needs no custom domain.** It is cron-driven; only its `APP_URL` var changes.

```bash
# verify — expect HTTP 200 and Server: cloudflare
curl -sS -o /dev/null -D - https://iurixaccreditation.com | head -5
```

---

## Phase C — Repo config  *(Max)*

### C1. Worker config

| File | Line | Change |
|---|---|---|
| `wrangler.jsonc` | 9 | `NEXT_PUBLIC_APP_URL` → `https://iurixaccreditation.com` — **runtime only** |
| `.env.local` | — | `NEXT_PUBLIC_APP_URL` → `https://iurixaccreditation.com` — **gitignored** |
| `.env.production` | — | `NEXT_PUBLIC_APP_URL` → `https://iurixaccreditation.com` — **gitignored** |
| `workers/cert-worker/wrangler.toml` | 14 | `APP_URL` → `https://iurixaccreditation.com` |

⚠️ **All three of the first rows, not just `wrangler.jsonc`.** The `wrangler.jsonc` entry is what
server code reads at runtime; the two env files are what Next inlines into the **client bundle** at
build time. Editing only the jsonc changes the runtime value and leaves the browser on the old host
— see trap 1. The env files are gitignored, so this edit has to be repeated on every machine that
deploys.

### C2. Hardcoded absolute URLs — these do NOT derive from `NEXT_PUBLIC_APP_URL`

| File | Line | What |
|---|---|---|
| `emails/_components/email-shell.tsx` | 86, 90, 94 | Footer links → `/privacy`, `/terms`, `/dpa` |
| `lib/cert-pdf.ts` | 208 | `const domain = 'aistaffcompliance.com'` — **printed on the certificate** |

### C3. From-addresses — only after Resend verification (E1) passes

| File | Line | Current |
|---|---|---|
| `lib/resend.ts` | 5 | `'IURIX <info@aistaffcompliance.com>'` |
| `workers/cert-worker/src/index.ts` | 151 | `'IURIX <info@aistaffcompliance.com>'` |

> Both carry a comment saying the old address stays until the new domain is verified. **Sending
> from an unverified domain fails silently or lands in spam** — do not change these ahead of E1.

### C4. Contact addresses — needs Rob's new address first

`app/api/webhooks/stripe/route.ts:116` (`OPERATOR_ALERT_EMAIL` fallback), `app/dpa/page.tsx:80-81`,
`app/privacy/page.tsx:65-66`, `app/terms/page.tsx:78-79`, `app/login/page.tsx:62`.

---

## Phase D — Deploy  *(Max)*

```bash
pnpm run deploy                          # app: opennextjs-cloudflare build && deploy
cd workers/cert-worker && wrangler deploy --config wrangler.toml && cd ../..
```

Both must be redeployed — the cert worker has its own `APP_URL` and its own deploy step, and will
otherwise keep calling the old URL from cron.

⚠️ **`--config wrangler.toml` is required.** A bare `wrangler deploy` from `workers/cert-worker/`
walks up and picks up the **root `wrangler.jsonc`**, redeploying the main app over itself while
reporting success — and the cert worker never ships.

---

## Phase E — External services

### E1. Resend  *(Rob)* — start early, DKIM is slow

Add `iurixaccreditation.com` as a sending domain → add the SPF / DKIM / DMARC records to the
Cloudflare zone → wait for **Verified**. Only then do C3 + redeploy.

### E2. Supabase Database Webhooks  *(Rob, dashboard)* — ⚠️ **the silent one**

Supabase → Database → Webhooks. ⚠️ **There are TWO hooks here, not one.** Earlier revisions of this
runbook described a single `cert-generation` hook, which sent people looking for something that
doesn't exist under that name.

| Hook | Target | Status |
|---|---|---|
| `cert-queue-generate` | the **app** → `/api/certs/generate` | ✅ the live one — repoint this |
| `cert-worker-quiz-pass` | `bsbr-cert-worker` | 💤 **known-inert — leave it alone** |

**Repoint `cert-queue-generate` to:**

```
https://iurixaccreditation.com/api/certs/generate
```

Header stays `x-webhook-secret: <CERT_WEBHOOK_SECRET>`.

⚠️ **It must target the APP, not the cert worker.** `bsbr-cert-worker`'s `fetch` handler validates
the secret, parses the payload, then `void`s the fields and returns 200 without generating anything
(there is a `// TODO: implement full cert generation pipeline` where the work would go) — so a hook
aimed at the worker means **certificates silently never generate and every delivery looks
successful.**

**On `cert-worker-quiz-pass`:** it is permanently inert for exactly that reason — it posts to the
worker's no-op `fetch` handler. Documented here so nobody deletes it blind, and so nobody re-verifies
it a third time hunting a cert bug. It is **not** the reason certificates would fail; the real
generation path is the in-app `after()` call at `app/api/quiz/attempt/route.ts` plus
`cert-queue-generate`. Note the cert worker's **cron** handler is real and load-bearing (expiry /
inactivity / renewal reminders + the queue drain) — inertness applies to its HTTP handler only.

### E3. Supabase Auth  *(Rob, dashboard)*

- Authentication → URL Configuration → **Site URL** → `https://iurixaccreditation.com`
- **Redirect allow-list** → add `https://iurixaccreditation.com/**`
- Authentication → Email Templates → update any hardcoded links

> Miss this and invite links, magic links, and password resets all still point at the old host.

### E4. Stripe  *(Rob)*

Still **test mode** until the LLC clears. When registering the live webhook:

```
https://iurixaccreditation.com/api/webhooks/stripe
```

Events: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`.
New signing secret → `wrangler secret put STRIPE_WEBHOOK_SECRET --name bsbr-attytraining`.

**Do this AFTER Phase B** so the endpoint is registered once, on the final hostname.

### E5. Old domain  *(Rob)*

301 `aistaffcompliance.com` → `iurixaccreditation.com`. It can stay on Netlify purely as a
redirect at no cost, or be dropped entirely.

> ✅ **The Netlify Forms waitlist is empty** (Rob confirmed 2026-07-28) — nothing to export, and
> no irreversible step here. Tear the old site down whenever convenient.

---

## Phase F — Verify

```bash
curl -sS -o /dev/null -D - https://iurixaccreditation.com | head -3        # 200
curl -sS https://iurixaccreditation.com/api/health                        # deep health
curl -sS -o /dev/null -w "%{http_code}\n" https://iurixaccreditation.com/pricing
```

Then walk it as a human:

- [ ] Marketing homepage + `/pricing` render on the new domain
- [ ] Sign in as an **admin** — dashboard, team status, Settings, Support all load
- [ ] Sign in as an **employee** — training loads, SCORM content plays, quiz submits
- [ ] Invite a test employee → **the invite email link points at the new domain**
- [ ] Complete a quiz pass → **a certificate actually generates** (this exercises E2)
- [ ] Download the cert → confirm the footer domain reads `iurixaccreditation.com` (C2)
- [ ] Stripe test checkout → lands on `/onboarding` on the new domain
- [ ] Support contact form sends

---

## Rollback

Nothing here is destructive. If the new domain misbehaves, the `*.workers.dev` URL still serves the
same Worker — revert `wrangler.jsonc:9` and `workers/cert-worker/wrangler.toml:14`, redeploy both,
and repoint E2/E3/E4 back. The only one-way step is the registrar nameserver change, and even that
is reversible by pointing the nameservers back.

---

## Not covered here

- **Stripe live mode** — blocked on the LLC. See `.planning/RENAME-IURIX.md` Layer 6.
- **The marketing redesign** — Rob is doing this. See `RENAME-IURIX.md` Layer 8.
- **Supabase Pro upgrade** — separate pre-launch item; free tier pauses after 7 days idle.
