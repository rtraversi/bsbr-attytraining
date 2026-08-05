# Session Handoff

**Date:** 2026-08-03 (**Rob**, terminal). Three commits on `redesign-iurix`: a sync-prep commit,
the merge of Max's 74 commits, and the marketing rebuild. **Nothing pushed yet — see Next steps.**

## 🔴 Read this first — the repo was 74 commits behind

`main` and `redesign-iurix` were both parked at `5e173b8` (07-28) while `origin/main` had moved to
`d99aeff` (07-31). A fetch had run on 08-03 but nothing was ever merged, so Max's Iurix rebrand,
billing pages, seat enforcement and login fixes were all absent locally. Resolved this session.

Two collisions that came out of it:

1. **Migration numbering.** The uncommitted `0014_remove_avatars.sql` collided with Max's
   `0014_iurix_cert_number_format.sql`. Renumbered to **`0018_remove_avatars.sql`**. It only
   touches `storage.buckets`/`storage.objects`, so Max's `0017` warning about rebuilding
   `training_events_event_type_check` from a stale definition does not apply to it.
   **`0018` has NOT been pushed to the DB yet** — `supabase db push` still to run.
2. **One merge conflict**, in `certification-forecast.tsx`, where both sides edited the same block:
   our side dropped the avatar `<img>`, Max's removed the dead "View who's left" link. Kept both.

## 🟢 What shipped

**The marketing surface is rebuilt** on the design-handoff pack in `.planning/design-handoff/`
(which was also uncommitted until this session — it is now in git). Light "marble & rule"
direction: marble ground, mint hairlines, teal ink, Gyrotrope display over Host Grotesk body.
Teal and steel carry the design; rose gold appears only as a seal accent.

- **Homepage** — Katy's copy as the spine, five numbered sections: the standard / reduce your
  exposure / document your best efforts / why Rule 5.3 changed / the details. The Rule 5.3
  evidence (Mata, Crabill, Wadsworth, the four statistics, the Florida Bar pull quote) is kept
  from the previously reviewed `03-copy.md` rather than rewritten — those are checked claims.
- **Shared header + footer** rebuilt light. Footer carries the disclaimer verbatim.
- **`/pricing`** moved to light. `PricingSlider` is **restyled only** — rate maths, the checkout
  call and the auto-renewal disclosure block are byte-for-byte untouched.
- **Legal pages** (`/privacy`, `/terms`, `/dpa`) now share one container, `legal-page.tsx`,
  instead of three copies of the same `Section` helper. It also ships `LegalCallout`,
  `LegalDisclaimer` (for the all-caps conspicuousness blocks) and `LegalTable` (scrolls on
  mobile) ready for when the real drafts land.
- **Dead code removed**: `custom-cursor`, `current-state-section`, `features-section`,
  `spiro-pattern`, and the whole `.athena-*` CSS block. All were unreferenced once the homepage
  stopped importing them.

## ⚖️ Two decisions that were made, and should be revisited deliberately

**1. Price — the live Stripe bands won.** Katy's draft says a flat **$39** in one place and a flat
**$35** in another. The live Price (`price_1ThbLNCzT2268ei9nkadS8kD`, `tiers_mode=volume`) is
**$35 / $32 / $28**, and the slider hardcodes the same maths. The page ships the live bands.
Advertising a number the checkout does not charge is a billing problem, not a copy problem.
**If $39 is the real intent, it changes in Stripe first**, then in `included-section.tsx` and
`pricing-slider.tsx`.

**2. Four features are advertised before they exist** — Rob's call, to publish the full programme
and build to match. They are flagged in code comments where they appear:

| Promised on the page | Reality |
|---|---|
| A written policy, tailored to your firm | Not built — no policy generator anywhere |
| A yearly Iurix Accredited website token | Not built — no badge/embed |
| Members-only page of sanction summaries | Not built — no such route |
| Ongoing nationwide sanction monitoring | Operational commitment, not software |
| Individually signed attestations | **Partial** — quiz captures identity attestation and `/api/firm/attestation` emits a firm-level PDF; there is no per-staff signed attestation document |

This is now a committed backlog. Every day it stays unbuilt is a day the page overstates.

## ⚠️ Open questions

- **"Accredited" vs the brief.** `01-brief.md` says avoid "accredited" and "guarantee" entirely for
  legal reasons; Katy's copy makes "Iurix Accredited" the central promise. Shipped as Katy wrote
  it, with the footer disclaimer drawing the line ("not CLE-accredited... does not constitute bar
  accreditation"). **Katy and Rob should confirm the two are reconciled on purpose.**
- **Contact email and phone are still `[TBD]`** and render as visible placeholders in the footer
  and on all three legal pages. This is what the brief asks for, but it **must not ship to
  production** as-is. The old `info@aistaffcompliance.com` (dead domain) was removed.
- **`/about` and `/contact` do not exist.** Katy's page structure calls for both. No copy for
  either, and Contact has nowhere to point until the email is decided. Nav uses in-page anchors
  meanwhile. `/ai-policy` is specced in the brief and also unbuilt.
- **Katy's typo** "Reduce Your Exposure**q**" — corrected to "Reduce your exposure".

## ✅ Status

- `tsc --noEmit` clean. `next build` passes. All of `/`, `/pricing`, `/privacy`, `/terms`, `/dpa`,
  `/login` return 200 with no console errors.
- Homepage and footer visually verified in Chrome at desktop width; `/pricing`'s restyle verified
  by computed style (teal CTA, gold active band, mint hairlines, no leftover dark classes).
- **Not verified: the 390px mobile rendering.** The browser extension would not actually change
  the viewport. Statically, every grid is mobile-first and every width is `max-w-*`; the only
  `min-w` is the legal table, deliberately inside an `overflow-x-auto` wrapper. Worth one pass in
  the DevTools device toolbar before deploy.

## 🔴 Production blocker — the case citations are unverified

The "Reduce your exposure" exhibit now cites three **2026** decisions, taken from
`builtsmartbyrob.com/ai-confidentiality` and not checked against the dockets:

| Case | Cited as |
|---|---|
| Morgan v. V2X, Inc. | No. 25-1991 · D. Colo. · Mar 30 2026 |
| Warner v. Gilbarco, Inc. | No. 2:2024-cv-12333 · E.D. Mich. · Feb 2026 |
| United States v. Heppner | S.D.N.Y. · Feb 2026 — **the source's docket reads `25-cr-XXX`, a placeholder** |

No docket number is printed for Heppner and none should be invented. **Verify all
three against the real records before this page is public.** Case citations on a
commercial page aimed at attorneys are the single most checkable thing on it, and
a wrong one costs more credibility than the section earns.

Also note these are **civil privilege / work-product rulings, not bar discipline** —
two of the three came out in the firm's favour. The exhibit is labelled and framed
accordingly. Do not relabel them as sanctions.

**The COPRAC pull quote beside them IS verified.** It was extracted from the source
PDF (`calbar.ca.gov/.../Generative-AI-Practical-Guidance.pdf`) and string-matched
verbatim against it — State Bar of California, Committee on Professional
Responsibility and Conduct, *Practical Guidance for the Use of Generative AI in the
Practice of Law*, 2026 revision, which replaces the November 2023 version at the
California Supreme Court's request. The quote is attributed to California by name
and framed as one state's guidance, deliberately: Iurix is sold nationally with no
state-specific accreditation claim, and this must never read as a California
endorsement of the product.

## 🔴 This machine cannot produce a working Cloudflare build (2026-08-05)

The redesign is built, pushed and uploaded as a **preview version** — and it 500s on every
route. **Production is untouched and healthy**, which is exactly why we uploaded a preview
instead of deploying.

- Preview: `https://d5cbb723-bsbr-attytraining.aistaffcompliance.workers.dev` — every route 500,
  `x-opennext: 1`, static assets serve fine. **Do not promote this version.**
- Live production version is still `0cd156ef-1b0e-4b5d-a43a-3a95f0e63039` (2026-07-30), serving 200.

**It is the Windows build, not the code and not the config.** Evidence:

1. Reproduced locally in workerd (`opennextjs-cloudflare preview`) — 500 with no Cloudflare
   involved, so it is the bundle.
2. All ten env vars the code reads exist as Worker secrets; nothing is missing.
3. `.open-next/server-functions/default/.next/required-server-files.json` contained real Windows
   paths — `C:\Sites\attytraining`, `.next\routes-manifest.json`, `.next\server\pages-manifest.json`.
   In workerd those do not resolve, so the Next server cannot load its own manifests.
4. OpenNext prints the warning itself on every run: *"not fully compatible with Windows… could
   encounter unpredictable failures during runtime."*

Rewriting those 22 paths to POSIX was **not sufficient** — `handler.mjs.meta.json` carries 88 more
and the contamination is spread through the bundle. Hand-patching a bundle that fronts Stripe and
Supabase is the wrong answer; do not go further down that road.

### ✅ Resolution: deploys move to CI — `.github/workflows/deploy.yml`

Max builds on a Mac, which is why 07-30 worked (macOS is Unix, not Linux, but the two things that
matter here are identical: forward-slash paths and symlinks without elevation). That made **Max
the only person who could ship**, which is not an acceptable bus factor for a product taking
payments. So deploys move to a Linux CI runner instead.

**Nothing is wrong with the code.** Native Windows simply cannot build this — it is not a setting.

**Setup, one time — Rob (needs GitHub repo admin):**

Settings → Secrets and variables → Actions → *New repository secret*, five of them:

| Secret | Where it comes from |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → **Edit Cloudflare Workers** template |
| `CLOUDFLARE_ACCOUNT_ID` | `4b2a402334decc9259d7317aaf9782f0` |
| `NEXT_PUBLIC_APP_URL` | same value as `.env.local` |
| `NEXT_PUBLIC_SUPABASE_URL` | same value as `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same value as `.env.local` |

The three `NEXT_PUBLIC_*` are **not optional and not redundant** with the Worker secrets of the
same name. They are inlined into the client bundle at *build* time; the Worker secrets only cover
server-side reads. Omit them in CI and the browser Supabase client ships `undefined` and sign-in
breaks silently — the build still goes green.

**Then:**

- Any push to `main` or `redesign-iurix` → builds and uploads a **preview** version. Production is
  never touched automatically.
- To go live: Actions → *Build & deploy* → **Run workflow** → `target: production`. It deploys,
  then smoke-tests `/`, `/pricing` and `/login` and fails loudly if any is not 200.

The workflow also asserts the bundle contains no Windows paths before uploading anything. That
check was tested against both the real broken Windows manifest (caught) and a clean one (passed),
so the 500-on-every-route failure cannot silently recur.

**Before promoting to production, read the unverified-citations blocker above.** Rollback is
`wrangler rollback --name bsbr-attytraining`; last known-good version is
`0cd156ef-1b0e-4b5d-a43a-3a95f0e63039`.

Note for whoever picks this up: local builds also need symlink permission on Windows, which is a
*separate* issue from the above. Developer Mode is off and the shell must be elevated, or
`next build` fails at "Collecting build traces" with `EPERM … symlink`. Rob ran the successful
build in an elevated PowerShell.

## Next steps

1. **Push.** Three commits sit unpushed on `redesign-iurix`; `main` is still behind origin.
2. **`supabase db push`** for `0018_remove_avatars.sql`.
3. Decide the contact email, then replace the `[TBD]` placeholders (footer + three legal pages).
4. Decide $35 vs $39 — Stripe first if it changes.
5. Get About / Contact copy from Katy; add `/ai-policy`.
6. Mobile pass at 390px, then deploy. The Cloudflare MCP is connected to this project if that
   helps with the deploy.
7. **Business voicemail line (Twilio)** — added to `.planning/BACKLOG.md` item 7 on 08-03.
   Voicemail-only, no `<Dial>`, three signature-validated endpoints on a Cloudflare Worker
   following the `workers/cert-worker` pattern. Reuses the already-paid KCL number. The spec's
   "Netlify vs Cloudflare" question is closed — this stack has no Netlify site. Note it ties to
   two open items above: the notification address is probably the same address that settles the
   `[CONTACT EMAIL — TBD]` placeholder, and the phone number fills the footer's `[PHONE — TBD]`.
   Retaining voicemails would also add Twilio to the DPA's sub-processor list.
