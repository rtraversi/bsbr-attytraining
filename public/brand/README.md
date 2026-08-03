# Iurix brand assets

Staged from Rob's originals so Max has access. Updated 2026-07-27 after Rob supplied a **vector**
and a full-res raster of the primary mark.

## Use these

| File | Size | Background | Use for |
|---|---|---|---|
| **`iurix-logo.svg`** | 1095×1095 viewBox, 3.4 MB | ✅ **Transparent** | **Primary web asset**: nav, favicon, site. Optimize before shipping — see #4. |
| **`iurix-logo-2048-white.png`** | 2048×2048, 1.5 MB | **Solid white** (not alpha) | Cert PDF and email — anywhere the backdrop is already white |

> **`iurix-logo.svg` was prepared here, not supplied as-is.** Rob provided two auto-trace exports;
> the second (`...no background(1).svg`, 29 paths) was the cleaner one — it had already dropped a
> stray `#eaede9` marble band present in the first. Both still carried a full-canvas white plate as
> path 1 (`fill="#ffffff"`, `M0.25 0.25 … 1094.75 1094.75`) despite the "no background" filename.
> That single line was removed. Result: **28 paths, first fill `#eafbf5`, valid XML, transparent.**
> Reproduce with `sed '3d' "<source>.svg"`.

## Archive / reference only

| File | Size | Background | Note |
|---|---|---|---|
| `iurix-logo-primary.png` | 1024×1024 | Opaque marble | Rob's originally designated primary; superseded by the two above |
| `iurix-logo-source-hires.png` | 2154×1952 | Opaque marble | The *no-certified* variant — **different artwork** from the primary |

*(The earlier 525×475 `-INTERIM` remove.bg preview has been deleted — superseded and misleading.)*

## ✅ Resolved 2026-07-27

- **The variant mismatch is closed.** The new SVG (1095×1095) and PNG (2048×2048) are both **square**,
  matching the designated primary (`iurix logo - small.png`, 1024×1024) rather than the non-square
  *no-certified* variant (1024×928 / 2154×1952). These are full-res versions of the right artwork.
- **A true vector exists.** `iurix-logo.svg` is genuine vector — 30 `<path>` elements, zero
  `<image>`, zero embedded base64. Not a raster wrapped in an SVG shell.

## ⚠️ Still to handle

1. **The PNG is white-matted, not transparent.** Despite the filename ("no background"), it has
   **no alpha anywhere** — 16,384 sampled pixels returned zero transparent and zero partially
   transparent; the corner is pure `#ffffff` at `A=255`. It works on white backgrounds (email,
   light-mode pages, a white certificate) and **will show a white box on dark mode** or over any
   colored panel.

2. ~~The SVG has a white background plate.~~ ✅ **Removed** — see the note above.

3. **Render transparent PNGs from the SVG at whatever sizes are needed** — cert PDF, email,
   favicon, OG. This closes the dark-mode and cert gaps without another asset request to Rob.

4. **The SVG is 3.4 MB — far too large to ship as-is.** It's an auto-trace: 28 flat-filled paths
   with very dense node counts and no gradients. Run SVGO (same approach as the nav-shell pattern,
   702 KB → 229 KB) *and* simplify paths. At nav size (~32px) most of those 30 colour bands are
   invisible anyway — a hand-built 2–4 colour version will look better and weigh almost nothing.

5. **The trace is flat, not metallic.** No `linearGradient` anywhere; the brushed-metal look is
   posterized into 30 flat bands (whites/greys, teals, and the rose-gold crescents). Good for small
   sizes, but the SVG will **not** match the raster's metallic finish at large sizes. Use the PNG
   where the full rendering matters and the SVG where crispness matters.

6. **No wordmark — ⏸ PARKED 2026-07-28 (Rob), pending LLC approval.** This is a mark only. The
   component it replaces (`app/_components/atc-logo.tsx`) is a *lockup* — mark + wordmark. **Do not
   chase this or design around its absence.** Until the entity is approved and in place, the
   shipping lockup is **type-set**: the mark plus "Iurix Accreditation" set in a font already
   self-hosted in `public/fonts/`. Treat that as the real design, not a placeholder — it may end up
   permanent.

   Knock-on: the 2026-07-28 handoff's "once a real wordmark asset lands, the email shell and cert
   header want a second pass" is parked with it. Max's interim text wordmarks in
   `emails/_components/email-shell.tsx` and the cert PDF header **stay as they are** for now.

7. **Dark mode unverified.** The soft white outer glow may halo against dark backgrounds.

## Where these get used

| Target | Current placeholder | Needs |
|---|---|---|
| `lib/cert-pdf.ts:18` `LOGO_B64` | base64 JPEG placeholder | `iurix-logo-2048-white.png` base64-encoded (fine if the cert backdrop is white), else a transparent render from the SVG |
| `public/athena-logo-email.png` | Athena email header | White-matted PNG is fine here; must be served from an absolute URL on `iurixaccreditation.com` |
| `public/atc-athena-logo.svg` | "atc" monogram vector | `iurix-logo.svg`, plate removed + optimized |
| `app/_components/atc-logo.tsx` | mark + "athena." wordmark | Full Iurix lockup (mark + wordmark) |
| favicon / OG images | — | Simplified small-size variant rendered from the SVG |
