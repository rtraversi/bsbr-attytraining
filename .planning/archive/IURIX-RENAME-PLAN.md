> **ARCHIVED 2026-08-27.** Executed. See RENAME-IURIX.md alongside this file.
> Historical record only. Do not cite it for current status: that lives in `.planning/STATE.md`.

---

# Plan — Rename the training platform to IURIX

## Context
The training platform (repo `bsbr-attytraining`) has carried many working names — Athena, "Built
Smart by Rob", "AI Staff Compliance Training", aegix. The name is now finalized: **IURIX**. This
plan renames the product everywhere it appears in the **live app code and infrastructure**, so the
product presents as IURIX consistently.

**Decisions (Max, this session):**
- **Just IURIX everywhere** — IURIX replaces Athena, the "AI Staff Compliance Training" descriptor,
  AND the "Built Smart by Rob" publisher line. No descriptor/publisher kept.
- **Scope = display text + infrastructure** (worker name, deployed URL, package.json).
- **Landing/marketing page is OUT of scope** — handled separately (redesign + logo pending).
- **Wordmark casing = `IURIX`** (all caps).

**Out of scope:** the homepage/landing components; the missing IURIX logo (Athena mark stays as a
placeholder for now); historical `.planning/sessions/*` notes (a record — leave them).

**Naming caution (distinct from "IURIX vs IurisIQ"):** IURIX is one letter off from **IurisIQ**, the
separate immigration-portal project. Keep them distinct in copy.

---

## How to execute (workflow)
This is a guided, go-one-by-one rename — **not a blind global find/replace**, because (a) some
strings are descriptive sentences, not the brand, and (b) infra + legal strings carry risk. Terminal
works the groups below in order, commits per group, Max verifies. Desktop explains any doubt.

**Descriptive-vs-name nuance:** where a string *names* the product/title (`title: "Pricing —
Athena"`, `© Athena`), use **IURIX**. Where "AI staff compliance training" is a *common-noun phrase*
in a sentence (`"enrolled you in AI Staff Compliance Training"`), rewrite for readability
(e.g. `"enrolled you in IURIX"` reads as a product, so prefer `"enrolled you in IURIX compliance
training"` / `"the IURIX course"`). Judgment per string — that's why it's one-by-one.

---

## PHASE A — Display text (safe; no redeploy needed). Do first, deploy, verify.

Work these groups; representative files listed (grep `-riE "athena|built smart|aegix|AI Staff
Compliance"` to catch stragglers in each area). **Exclude `app/_components/*` and the homepage —
that's the landing page.**

1. **Global metadata + app chrome**
   - `app/layout.tsx:55` root title → `IURIX`
   - `app/dashboard/_components/dashboard-footer.tsx:21` `© Athena` → `© IURIX`

2. **Auth / account page titles** — `app/login`, `app/onboarding`, `app/forgot-password`,
   `app/update-password` (`"— Athena"` → `"— IURIX"`).
   - `app/pricing/page.tsx:8` — **borderline (pricing reads as marketing).** Default: rename the
     title to IURIX; flag to Max if pricing should be treated as landing instead.

3. **Dashboard page titles** — `app/dashboard/{page,settings,training,support,quizzes,overview}`
   (`"— AI Staff Compliance Training"` → `"— IURIX"`), and
   `app/dashboard/training/_components/scorm-content.tsx:298` iframe title.

4. **Emails** — `emails/*.tsx` (cert-earned-admin, training-reminder, cert-delivery,
   employee-invite, admin-magic-link) body copy; `emails/_components/email-shell.tsx` (`alt="Athena"`,
   `© Athena`, and the **logo image**, see Logo note). Apply the descriptive-vs-name nuance.

5. **Transactional API copy** — `app/api/certs/generate/route.ts` (cert email subjects),
   `app/api/onboarding/complete/route.ts:80,147` (course title + subject),
   `app/api/webhooks/stripe/route.ts:129,365` (email footer).

6. **Certificate PDF** — `lib/cert-pdf.ts:65` header label; `:196` `"Authorized by Built Smart by
   Rob"`. **⚠ Legal-entity check (see below) before changing the "Authorized by" line.**

7. **Legal pages** — `app/privacy`, `app/dpa`, `app/terms` (publisher line "Built Smart by Rob" +
   descriptor). **⚠ Legal-entity check — do NOT blind-replace; see below.**

8. **Active docs** — `CLAUDE.md` product-name references, the 1 `aegix` mention. Leave
   `.planning/sessions/*` (historical).

### ⚠ Legal-entity check (Group 6 & 7) — confirm with Rob/Katy before changing
`app/dpa/page.tsx` names "Built Smart by Rob (as data processor)"; the cert says "Authorized by Built
Smart by Rob". These name the **contracting/authorizing legal entity**, which may still be the
registered LLC "Built Smart by Rob" even though the public brand is now IURIX. Swapping the entity
name in binding legal text is a legal decision, not a copy edit. **Hold these two spots for Rob/Katy
sign-off**; the rest of Phase A can proceed without them.

### Logo note (Group 4)
Athena logo assets exist (`public/atc-athena-logo.svg`, `public/athena-logo-email.png`); the IURIX
logo does not exist yet. Emails render `athena-logo-email.png` via `email-shell.tsx` `LOGO_URL`. Since
there's no IURIX image, **replace the email logo image with a text `IURIX` wordmark** until the real
logo lands (keeping the Athena image would show the old brand). The landing-page logo component
(`app/_components/atc-logo.tsx`) is out of scope.

---

## PHASE B — Infrastructure (high-risk; separate, coordinated step AFTER Phase A is deployed & verified)

Renaming the worker changes the **live URL**, which several external services point at. Doing this
half-way breaks auth, payments, and emails. Sequence carefully.

**Code changes:**
- `package.json` `"name": "bsbr-attytraining"` → `iurix` (or `iurix-app`).
- `wrangler.jsonc` `"name"` + `NEXT_PUBLIC_APP_URL`.
- `workers/cert-worker/wrangler.toml` name + `APP_URL`.
- `email-shell.tsx` `LOGO_URL` host + any other hardcoded `bsbr-attytraining.aistaffcompliance.workers.dev`.

**External / manual steps (cannot be done in code — need Rob in the dashboards):**
- **Cloudflare** — deploying the renamed worker creates a **new URL** (`iurix.aistaffcompliance.
  workers.dev`). Note: `aistaffcompliance` is the account-level workers.dev subdomain (shared by all
  workers) — changing that is a bigger move; better path is a **custom domain** (e.g. `app.iurix.com`)
  if/when the domain exists.
- **Supabase** — update Site URL + redirect URLs to the new domain, or magic links / auth break.
- **Stripe** — update the webhook endpoint URL to the new domain, or provisioning breaks.
- Update the `NEXT_PUBLIC_APP_URL` worker secret/var to match.
- **GitHub repo rename** (optional) `bsbr-attytraining` → `iurix` — breaks local remotes + Workers
  Builds connection until reconnected.

**Safety:** keep the old worker/URL live during transition if possible; deploy to a preview first;
verify auth + a test Stripe webhook + email links on the new URL before cutting over.

---

## Verification
**After Phase A (before deploy):**
- `pnpm build` / `tsc --noEmit` clean.
- `grep -riE "athena|built smart|aegix" app emails lib CLAUDE.md` returns only intentional leftovers
  (landing `app/_components/*`, held legal-entity spots, historical `.planning`).
- `pnpm dev` (or `pnpm run preview`): browser tab titles read IURIX; dashboard footer © IURIX; a
  react-email preview of each template shows IURIX + the text wordmark; generate a test cert PDF and
  confirm the header (and "Authorized by", if cleared) read IURIX.

**After Phase B (on a preview/deploy):**
- New URL loads the app; sign-in + magic link round-trip works (Supabase redirect correct); a test
  Stripe webhook reaches the new endpoint and provisions; email logo + links resolve; cert-worker
  crons still fire.

---

## First step for Terminal
Start Phase A, Group 1 (global metadata + dashboard footer), commit, then walk Groups 2→8 in order —
holding the two legal-entity spots for Rob/Katy. Do **not** start Phase B until Phase A is deployed
and Max confirms the app looks right.
