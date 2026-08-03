# 04 — Technical constraints

You are redesigning **five routes inside an existing, deployed Next.js application** — not building
a standalone site. The constraints below are not preferences; breaking them breaks a live product
that takes real payments.

## The stack

| Layer | What it is |
|---|---|
| Framework | **Next.js 15.5.19, App Router** (`app/` directory). No Pages Router |
| React | **19.1.0** |
| Language | **TypeScript 5.x**, strict |
| Styling | **Tailwind CSS v4** — CSS-first config via `@theme` in `app/globals.css`. No `tailwind.config.js` |
| Hosting | **Cloudflare Workers** via `@opennextjs/cloudflare` (the OpenNext adapter) |
| Payments | **Stripe** (`stripe` v22), hosted Checkout |
| Backend | **Supabase** — auth, Postgres, storage |

### Libraries already installed — prefer these over adding new ones

`framer-motion` 12 · `lucide-react` 1.18 · `radix-ui` 1.5 · `shadcn` 4 · `class-variance-authority` ·
`clsx` · `tailwind-merge` · `geist` (fonts) · `tw-animate-css`

Adding a dependency is possible but must be flagged — every kilobyte ships to a Cloudflare Worker.

## 🚫 Hard rules — do not break these

1. **Never add `export const runtime = 'edge'`** to any file. The OpenNext adapter runs the Node.js
   runtime via `nodejs_compat`. An edge export will break the build. This is the single most common
   mistake people make on this stack.
2. **No file in `public/` may exceed 25 MiB.** Cloudflare's per-asset cap. A background video once
   broke the build at 28 MiB. The current logo SVG is 3.4 MB and is already considered too heavy.
3. **Load fonts through `next/font`** — `next/font/local` for self-hosted files, `next/font/google`
   for Google-hosted. Do not add `<link>` tags to Google Fonts or any external font CDN.
4. **Do not modify `app/layout.tsx`'s `suppressHydrationWarning` on `<html>`.** A theme script
   stamps a class before paint; removing it produces hydration errors across the whole app.
5. **`fetch` is not cached by default in Next.js 15.** If you rely on caching, set it explicitly.
6. **Do not touch anything under `app/dashboard/`, `app/login/`, `app/onboarding/`,
   `app/update-password/`, `app/forgot-password/`, `app/auth/`, `app/api/`, `emails/`, or
   `workers/`.** All live, all out of scope.

## Integration points you must preserve

### `/api/checkout` — the revenue path

Every "Buy seats" / "Get started" action ultimately performs:

```ts
const res = await fetch("/api/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ seats }),          // integer, 1–500
});
const { url } = await res.json();
window.location.href = url;                  // redirect to Stripe Checkout
```

Notes:

- `seats` must be an **integer between 1 and 500**. The server validates and rejects otherwise.
- The response is `{ url: string }`. Redirect the browser to it — do not try to render it.
- Handle the failure case with a visible inline error. The current copy is
  *"Could not start checkout. Please try again."*
- Show a loading state — the round-trip to Stripe is not instant.
- **A logged-in admin who already has an active subscription is redirected to the billing portal
  instead of a second checkout.** This is a deliberate double-billing guard. From the client side it
  just looks like a different `url` coming back, so the code above handles it unchanged — but don't
  add logic that assumes the URL is always Stripe Checkout.

### `PricingSlider` — `/pricing`

`app/pricing/_components/pricing-slider.tsx` is a working client component. **Restyle it; do not
re-architect it.** Behaviour that must survive:

- A range input for seat count, default `5`, max `100`.
- Live rate calculation: `seats >= 25 ? 28 : seats >= 10 ? 32 : 35`.
- The active volume band highlights as the slider moves.
- A live total (`seats × rate`) rendered prominently.
- The checkout call above.

Two correctness points the design must not contradict:

- **Volume pricing, not tiered pricing.** *All* seats bill at the band rate the headcount lands in.
  12 seats = 12 × $32. Never show a blended or per-tier split.
- **The renewal rate is flat.** No renewal discount, no introductory pricing. Don't imply either.

### Shared components

| File | Used by | Notes |
|---|---|---|
| `app/_components/site-header.tsx` | `/`, `/pricing` | Nav. Yours to redesign |
| `app/_components/footer.tsx` | `/`, `/pricing`, all three legal pages | Yours to redesign. **Currently still carries retired branding — replacing it is part of the job** |
| `app/_components/custom-cursor.tsx` | `/`, `/pricing` | A custom cursor from the retired design. **Assume it is being removed** unless you deliberately keep it |

Because the footer is shared with the legal pages, its design has to work on both a marketing page
and a long-form document page.

### Metadata

Each route exports a `metadata` object (title + description) for SEO. Keep them, update the copy.
Titles currently follow the pattern `"Pricing — IURIX"`.

## Responsive and accessibility

- **Mobile-first.** A meaningful share of visitors are on phones. Every layout must work at 390 px
  wide with no horizontal overflow at any scroll position.
- Breakpoints in use: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280. Wide desktop matters — the app
  side uses layouts up to 1600 px.
- **WCAG AA** contrast minimum. See the contrast warnings in `02-brand.md`.
- Respect `prefers-reduced-motion` for any animation. The existing codebase does this consistently.
- Semantic HTML, real focus states, keyboard-operable controls. The audience includes people who
  will notice.

## Dark mode

The authenticated app has a full light/dark system with a manual toggle (a `.dark` class on
`<html>`). **The marketing pages currently do not participate** — the retired design was
dark-only.

Whether the new marketing site is light, dark, or theme-aware is **your recommendation to make**.
If you go theme-aware, use the `@custom-variant dark (&:is(.dark *))` pattern already defined in
`globals.css`. If you commit to a single treatment, say so explicitly so it doesn't read as an
oversight.

## Known issues in the current code, for context

Not your job to fix, but useful to know the ground isn't perfectly clean:

- `app/_components/footer.tsx` still renders the retired "athena." wordmark and a
  "Built Smart by Rob" copyright line. Both are wrong and are being removed.
- `app/privacy/page.tsx` has a hardcoded `info@aistaffcompliance.com` — a retired domain. It gets
  replaced once the new contact address is decided.
- The legal pages are styled to the old dark palette (`bg-zinc-950`, `text-zinc-400`) and are
  effectively unstyled relative to the new brand.
