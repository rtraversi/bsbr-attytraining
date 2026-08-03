# 05 — Deliverables

## What to hand back

Whichever route you take, the end state has to be **code that drops into the existing Next.js app**.
Two acceptable paths:

### Path 1 — Design first, then build (preferred for an agency or designer)

1. **A direction concept** — the homepage, one desktop and one mobile frame, enough to judge the
   visual language. Figma, PDF, or static HTML all fine.
2. **After sign-off:** the remaining screens — `/pricing`, the legal-page template, header, footer.
3. **Then:** implementation as React components (see "Code conventions" below).

### Path 2 — Straight to code (v0, Lovable, Bolt, or similar)

Generate the five routes directly, but **submit the homepage first for sign-off** before building
the rest. A full-site generation that misses the register wastes everyone's time.

## Code conventions

If you are delivering code, match the existing codebase or it won't merge cleanly:

- **App Router.** Route files at `app/<route>/page.tsx`. Page-specific components in
  `app/<route>/_components/`; shared ones in `app/_components/`.
- **Server Components by default.** Add `"use client"` only where you genuinely need interactivity
  (the pricing slider needs it; a static hero does not).
- **Tailwind utility classes**, not CSS modules and not styled-components. Shared primitives can go
  in `app/globals.css` — the file already uses this pattern.
- **kebab-case filenames**, named exports: `export function HeroSection()`.
- **TypeScript, no `any`.** The codebase is `tsc --noEmit` clean and must stay that way.
- Must also pass `eslint` clean.

## Acceptance criteria

A delivery is done when all of the following are true:

- [ ] `pnpm build` succeeds
- [ ] `npx tsc --noEmit` reports zero errors
- [ ] `pnpm lint` reports zero errors
- [ ] No `export const runtime = 'edge'` anywhere
- [ ] No horizontal overflow at 390 px, 768 px, 1024 px, 1440 px, or 1920 px — **at any scroll
      position, and with any expandable element open**
- [ ] Body text meets WCAG AA contrast
- [ ] The checkout path works end to end: click → `POST /api/checkout` → redirect to Stripe
- [ ] The pricing slider still calculates correctly at 1, 9, 10, 24, 25, and 100 seats
- [ ] Animations respect `prefers-reduced-motion`
- [ ] The footer disclaimer appears verbatim and is genuinely legible
- [ ] No reference anywhere to "Athena," "AI Staff Compliance Training," "Built Smart by Rob," or
      `aistaffcompliance.com`
- [ ] No waitlist, no "coming soon," no launch countdown
- [ ] `[TBD]` placeholders left visible, not invented

## Welcome extras

Not required, genuinely valuable:

- **An optimised logo SVG.** The supplied file is 3.4 MB of auto-trace. SVGO plus path
  simplification should get it under ~150 KB.
- **A simplified small-size logo variant** that stays legible at 32 px and as a favicon.
- **A favicon set and an Open Graph image.**
- **A recommendation on the type-set lockup** — how "Iurix Accreditation" should be set beside the
  mark, at nav size and at footer size. See the wordmark constraint in `02-brand.md`.

## How it will be judged

In order:

1. **Does a sceptical attorney trust it?** Credibility beats novelty every time.
2. **Is the liability argument landed in the first screen?**
3. **Is the path to checkout obvious and repeated?**
4. **Does it look like this brand** — the mark's own teal and rose gold, used with restraint — and
   not like a template with a logo dropped in?
5. **Is it clean under the hood** — accessible, responsive, typed, and buildable?

## Things that will get a delivery rejected

- Reintroducing a waitlist or "coming soon" framing.
- Inventing feature differences between the three pricing bands.
- Implying tiered (split-rate) pricing, or any renewal discount.
- Copy that contradicts the disclaimer — anything claiming accreditation, bar approval, or
  guaranteed compliance.
- Stock photography of gavels, scales, courthouses, or handshakes. The mark already carries the
  scales; repeating it is redundant and reads as generic.
- AI-generated imagery of people. This is a product about the risks of unsupervised AI output —
  fabricated imagery undercuts the entire proposition.
- Any dependency added without flagging it.
