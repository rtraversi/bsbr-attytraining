# Session — 2026-07-28 (Rob, terminal)

> Planning + infrastructure audit. **No app code written this session.** All app-code changes on
> `main` today are Max's rebrand sweep, landed in parallel.

## Deliverable

**`.planning/DOMAIN-CUTOVER.md`** — full step-by-step runbook for putting `iurixaccreditation.com`
on the existing `bsbr-attytraining` Worker. Supersedes `DEPLOY-CHECKLIST.md` (2026-06-17, written
for the first deploy). Split by owner, with exact `file:line` edits, verification commands, and a
rollback path.

## Decisions locked (Rob)

1. **Design fresh for Iurix.** The Netlify site is a **content and structure reference only** — its
   visual identity is *not* inherited. Build around the Iurix logo's palette (teal + rose-gold
   metallics), not the Netlify site's editorial treatment (Fraunces/Newsreader serif, brick red
   `#912d1f`, "5.3" seal favicon). **This also retires the app's Athena landing design — neither
   existing identity survives.** *(Supersedes the 07-27 note that the Netlify design was canonical.)*
2. **Rob owns the redesign**, in a new session, working in `C:\sites\attytraining`.
   *(Supersedes the 07-27 handoff item assigning the marketing site to Max.)*
3. **The Netlify waitlist is empty** — nothing to export, no irreversible step in the cutover.

## Findings

### Marketing source located

**`rtraversi/aistaffcompliance`** (private; local clone `C:\sites\aistaffcompliance`). Three files:
`index.html`, `thanks.html`, `README.md`. `index.html` is **434 lines / 24 KB of plain HTML with a
single inline `<style>` block** — no framework, no build step, no Tailwind, semantic class names
(`hero`, `wrap`, `seal-mark`, `cta`). Since the design isn't being inherited, only the copy and
section structure are needed from it.

⚠️ **Max may not have access** — private repo, collaborator invite outstanding since June.

### The waitlist form is Netlify-specific

`data-netlify="true"`, `netlify-honeypot="bot-field"`, POST → `/thanks.html`. No Cloudflare
equivalent. Moot — it's empty and being replaced by the real checkout.

### Two cutover traps that would each cost a day

1. **`NEXT_PUBLIC_APP_URL` is inlined at build time.** Next.js bakes `NEXT_PUBLIC_*` into client
   bundles during `next build`. Changing the var in the dashboard or `wrangler.jsonc` does nothing
   to already-built assets — it presents as a caching bug. Requires a rebuild.
2. **A Worker secret silently overrides a `vars` entry.** `NEXT_PUBLIC_APP_URL` is declared at
   `wrangler.jsonc:9`, but `DEPLOY-CHECKLIST.md` step 4 also instructed
   `wrangler secret put NEXT_PUBLIC_APP_URL`. If that secret exists it wins. Runbook opens with
   `wrangler secret list --name bsbr-attytraining`.

### Local dev environment verified (Rob's machine)

Node 24.15.0, pnpm 11.9.0, wrangler 4.99.0, `node_modules` present, `.env.local` present.
`pnpm dev` will run. **`.dev.vars` is MISSING** — so `pnpm run preview` (workerd) won't run until
Max supplies those values. Not needed for design work.

Runtime model, for the record: `pnpm dev` = localhost/Node; `pnpm run preview` = workerd locally;
`pnpm run deploy` = the live Worker. There is no "developing on Cloudflare" — you develop locally
and deploy.

## Brand assets

Rob supplied a **true vector** (`iurix-logo.svg` — 28 paths, no `<image>`, no base64) plus a
2048×2048 raster. Both square, matching the designated primary artwork, which closed the earlier
certified-vs-no-certified variant mismatch.

Two filename/content mismatches corrected:
- The PNG named "no background" has **no alpha anywhere** — 16,384 sampled pixels, zero transparent;
  corner is pure `#ffffff`. White-matted, not transparent. Fine on white; shows a box on dark.
- Both SVG exports carried a **full-canvas white plate as path 1**. Used the cleaner `(1)` export
  (which had already dropped a stray `#eaede9` marble band) and removed the plate line.

Still open: SVG is 3.4 MB of auto-trace and needs SVGO + path simplification; the trace is flat (no
gradients) so it won't match the raster's metallic finish at large sizes; **no wordmark exists**.
Detail in `public/brand/README.md`.

## ⚠️ For the next session — resolve before writing redesign code

**Rob and Max are on the same branch.** `branching_strategy = none`, and Max landed 10+ rebrand
commits to `main` today touching `app/layout.tsx`, `app/_components/footer.tsx`, page titles, and
`emails/_components/email-shell.tsx`. The redesign will touch those same files plus `globals.css`.

Recommended: **work the redesign on a branch** (`redesign-iurix`). `preview_urls: true` is already
set in `wrangler.jsonc`, so if Workers Builds is connected to the repo the branch gets its own
preview URL — worth confirming. Alternative: split by file ownership, with Max staying out of
`app/_components/*` and `globals.css`.

Also note: Max's sweep swapped **text wordmarks** in where the Athena logo used to be (email shell,
cert header). Once a real Iurix wordmark asset exists, those spots want a second pass.
