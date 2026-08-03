# 02 — Brand

## The mark

`assets/iurix-logo.svg` — scales of justice fused with a column, rendered in brushed metal with
teal edge-lighting and two rose-gold crescents enclosing it, over a marble-white field.

Two files are provided:

| File | Use |
|---|---|
| `assets/iurix-logo.svg` | 1095×1095 viewBox, **transparent**. The web asset. Crisp at any size |
| `assets/iurix-logo-2048-white.png` | 2048×2048, **solid white background — no alpha anywhere** |

### Known issues you should plan around

1. **The SVG is 3.4 MB.** It's an auto-trace: 28 flat-filled paths with very dense node counts.
   It must be optimised (SVGO + path simplification) before it ships. If you can produce a
   hand-built simplified version, that is a welcome deliverable.
2. **The trace is flat, not metallic.** There are no gradients in the SVG — the brushed-metal
   finish is posterised into 28 flat bands. The SVG will **not** match the raster's finish at
   large display sizes. Use the raster where the full rendering matters.
3. **The mark is unreadable below roughly 32 px.** A simplified 2–4 colour small-size variant is
   needed for nav and favicon. Also a welcome deliverable.
4. **The PNG will show a white box on any dark or coloured background.** It is white-matted, not
   transparent. If you need a transparent raster, render one from the SVG.

## ⚠️ The one hard constraint: there is no wordmark

**A wordmark does not exist and will not exist during this engagement.** It is deliberately parked
pending a corporate filing. Do not wait for it, do not design around a gap where it will go, and do
not deliver a lockup that only works once it arrives.

**The lockup is type-set.** Mark plus the words "Iurix Accreditation" set in one of the typefaces
below. Treat this as the real, permanent design. Choosing *how* to set it — weight, spacing, case,
stacked vs. inline, whether the descriptor "Accreditation" is present at nav size — **is part of
what you are being asked to design.** The three reference mockups each solve it differently, on
purpose, to show the range.

## Naming

- **"Iurix"** — the company.
- **"Iurix Accreditation"** — the product. Use the full form on first appearance and in the footer.
- Legal attribution line: **"BSBR Holdings, LLC d/b/a Iurix"** — appears in the footer and on the
  legal pages. *(Client is confirming whether this remains a d/b/a; treat the string as provisional
  but design for a line of roughly this length.)*
- The product was previously called "AI Staff Compliance Training" and internally "Athena." Both
  are **retired**. Neither should appear anywhere.

## Palette

Every colour below is sampled directly from the fills in `assets/iurix-logo.svg`. This is the whole
palette — the brand has no colours outside the mark.

### Teals — the primary family

| Hex | Role |
|---|---|
| `#eafbf5` | Lightest mint — page tints, panel fills |
| `#d0e5e0` | Mint — muted body text on dark, soft fills |
| `#a6cecd` | Light teal — hairlines, borders, highlights |
| `#8cb2b1` | Mid teal |
| `#7d8f8d` | Muted teal |
| `#5a6e6e` | Deep teal — secondary text, accents |
| `#2b3334` | Near-black teal — filled bands, dark surfaces |
| `#1c2223` | Ink — primary text |

### Rose gold — the accent family

Used sparingly. In a compliance product this reads as *seal*, *issued*, *authorised* — so reserve
it for the primary action and for certificate/seal moments. It should not become a general-purpose
highlight colour.

| Hex | Role |
|---|---|
| `#d9b5a6` | Pale rose gold — accents on dark backgrounds |
| `#b39082` | Mid rose gold — the workhorse accent |
| `#a27c6e` | Deep rose gold |
| `#88685c` | Darkest — primary buttons on light backgrounds, small text that must pass contrast |

### Neutrals

| Hex | Role |
|---|---|
| `#f7f7f6` | Marble white — page background |
| `#c2c5c3` | Light steel — dividers |
| `#a1a4a1` · `#8f9996` | Steel — muted text |
| `#4c5453` | Soft ink — body text |

### Contrast

Verify WCAG AA (4.5:1 for body text, 3:1 for large text) on whatever you build. Two traps in this
palette: `#8f9996` steel on `#f7f7f6` marble is borderline for small text, and the pale rose golds
are decorative only — never use `#d9b5a6` for text on a light background.

## Typography

All five faces below are **already self-hosted in the production app**, so anything you specify
from this list ships with no new licensing or loading cost.

| Family | File | Character | Suggested role |
|---|---|---|---|
| **Gyrotrope** | `GyrotropeVF.ttf` | Variable serif | Display / headlines. The most "legal instrument" of the set |
| **Host Grotesk** | `HostGrotesk[wght].ttf` (+ italic) | Variable grotesque | Body / UI. Currently the app's default |
| **Stack Sans Headline** | `StackSansHeadline-VariableFont_wght.ttf` | Variable sans, ExtraLight→Bold | Large light-weight display. Reads well very big and very thin |
| **Kapakana** | `Kapakana-VariableFont_wght.ttf` | Variable display, Light→Regular only | Occasional display use |
| **Instrument Serif** | *(Google Fonts, loaded via `next/font`)* | Serif, has a true italic | Italic emphasis words |

**You may propose a different typeface** if it materially improves the design — but flag it, because
it becomes a licensing and performance decision for the client rather than a free swap.

**Font files are not included in this pack by default** — see `assets/fonts/README.md` for why and
for the one command that copies them in.

## Register

The mockups in `reference/` bracket the intended range:

- **A — Marble & Rule:** light, editorial, hairline rules, serif display. Calm authority.
- **B — Deep Water:** dark teal ground, large light display type, glowing metallic mark. Premium software.
- **C — The Record:** systematic and gridded, mono metadata, the certificate itself as the hero object.

Anywhere in or around that range is fair game. What's out of range: playful, rounded, illustrated,
gradient-heavy, mascot-driven, or anything that reads as a generic SaaS template.
