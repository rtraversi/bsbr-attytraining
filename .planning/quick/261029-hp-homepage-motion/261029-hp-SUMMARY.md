# 261029-hp — Homepage motion layer

**Date:** 2026-10-29 · **Who:** Rob (with Claude) · **Status:** built, previewed, shipped on Rob's go

## Why

Rob saw mystudyguide.ai (a friend's site, built from one written brief with Claude Code, art and film
from Higgsfield) and liked three of its techniques: hand-drawn arrows, flip cards and scroll animation.
Not its look — that page is a student's sketchbook; this one is a standard. Each technique was re-drawn
for the brand and reviewed as a standalone demo before being ported here.

## What changed (homepage only, all copy unchanged)

- **Brushed-metal hero** (`.hero-metal` in `app/globals.css`): faint horizontal grain, soft banding, a
  faded two-weight gridline, and a slow sheen every ~11s. Rob asked twice for less grain; keep it faint.
- **Margin notes** (`app/_components/motion/margin-note.tsx`, font Cedarville Cursive as `--font-pen`):
  pen-written annotations that write themselves in. "Click here" on the hero CTA (plays on load, then
  nudges), plus four notes that only restate what the page already says. Do not add a note that makes a
  new claim.
- **Flip cards** (`motion/flip-card.tsx`): the four pillars (icon + title on a light mint wash, Katy's
  description on the dark back) and the three 2026 rulings (citation front, holding back).
- **Ribbon** (`motion/page-ribbon.tsx`): one rose-gold line from the hero seal down the page, drawn by
  scroll, routed by `<i data-ribbon>` markers in each section (side gutters, crossing only in section
  padding). It wraps the closing seal, which then presses (`.is-sealed`).
- **Included list**: line icons (`app/_components/homepage-icons.tsx`) and bold lead phrases.
- **Buttons**: homepage and header CTAs rounded to 7px (were 1–2px).
- Every animation has a `prefers-reduced-motion` rule.

## Not done / next

- Higgsfield (stills + a seal-and-ribbon hero film) — Rob is setting up the account; budget-gated.
- Icons are hand-drawn SVG; Rob may swap in a sourced set (keep component names, replace paths).
