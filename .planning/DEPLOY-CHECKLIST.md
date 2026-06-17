# Deploy Checklist — Cloudflare Workers
**Prepared:** 2026-06-17 | **For:** Rob + Max morning session 2026-06-18

This deploys the Next.js app to Cloudflare Workers so it's accessible at a live URL instead of localhost.

---

## Step 1 — Set all secrets on the CF Worker

Each secret must be set via the Wrangler CLI or the CF dashboard. These are the env vars from `.env.local` that need to be on the Worker.

Run once per secret (from the `bsbr-attytraining` directory):

```bash
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put NEXT_PUBLIC_APP_URL
wrangler secret put RESEND_API_KEY
wrangler secret put CERT_WEBHOOK_SECRET
```

Each command will prompt you to paste the value.

**Important values to confirm with Rob:**
- `STRIPE_SECRET_KEY` → must be `sk_test_51ThDpr...` (sandbox key from AI Staff Compliance & Training account)
- `STRIPE_WEBHOOK_SECRET` → this is NOT the `whsec_` from `stripe listen`. For a deployed app, you register a real webhook endpoint in the Stripe dashboard and get a permanent webhook secret from there (see Step 3).
- `NEXT_PUBLIC_APP_URL` → will be your `*.workers.dev` URL once deployed (update after Step 2)
- `RESEND_API_KEY` → Rob's Resend account key
- `CERT_WEBHOOK_SECRET` → any secure random string; must match what you set in the Supabase DB webhook header

---

## Step 2 — Deploy the app

```bash
pnpm run deploy
```

This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`. It will output a `*.workers.dev` URL when done.

**Verify:** Open the URL in a browser — landing page should load.

---

## Step 3 — Register webhook endpoint in Stripe dashboard

`stripe listen` is only for local dev. For the deployed app, Stripe needs to know where to send events.

1. Go to **Stripe Dashboard → Developers → Webhooks → Add destination**
2. Endpoint URL: `https://YOUR-WORKERS-URL.workers.dev/api/webhooks/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. After creating, Stripe shows a **Signing secret** (`whsec_...`) — copy this
5. Update `STRIPE_WEBHOOK_SECRET` on the Worker:
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
   Paste the new signing secret from the Stripe dashboard.

---

## Step 4 — Update NEXT_PUBLIC_APP_URL

Now that you have the real `*.workers.dev` URL:

```bash
wrangler secret put NEXT_PUBLIC_APP_URL
```

Enter: `https://YOUR-WORKERS-URL.workers.dev`

Then redeploy so the app picks up the new value:

```bash
pnpm run deploy
```

---

## Step 5 — Set up Supabase Storage bucket (if not done yet)

1. Supabase Dashboard → Storage → New bucket
2. Name: `certificates`
3. Make it **private** (not public)

---

## Step 6 — Set up Supabase Database Webhook for cert generation

This replaces the local tunnel from dev testing.

1. Supabase Dashboard → Database → Webhooks → Create webhook
2. Name: `cert-generation`
3. Table: `cert_generation_queue`, Event: `INSERT`
4. URL: `https://YOUR-WORKERS-URL.workers.dev/api/certs/generate`
5. HTTP Headers: `x-webhook-secret: <your CERT_WEBHOOK_SECRET value>`

---

## Step 7 — Run the end-to-end test on the live URL

Same 8 steps as the local test, but now using the `*.workers.dev` URL:

1. Go to `https://YOUR-WORKERS-URL.workers.dev`
2. Click subscribe → Stripe checkout → complete with test card `4242 4242 4242 4242`
3. Land on `/onboarding` → enter firm name → submit
4. Click magic link from email (or from Supabase dashboard in sandbox)
5. Reach dashboard → invite employee
6. Employee clicks invite link → lands on update-password page
7. Set password → go to training
8. Mark pass → "certificate generating" shown

---

## Open Questions for Rob + Max Morning Meeting

- [ ] Should the `*.workers.dev` URL be the permanent staging URL, or do we set up `training.aistaffcompliance.com` now?
- [ ] Confirm Rob has the Resend API key ready
- [ ] Confirm `CERT_WEBHOOK_SECRET` value to use (Rob or Max generates a random string)
- [ ] Supabase prod project — still under Max's account? Move to Rob's before launch?
- [ ] `pdf-lib` → ilovepdf API swap — when does Rob want this done? (Decision from Session 8: before launch)
