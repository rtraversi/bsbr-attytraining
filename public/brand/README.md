# Iurix brand assets

Staged 2026-07-27 from Rob's originals so Max has access. **None of these is production-final yet
— read the gap section before wiring anything up.**

| File | Source | Size | Background |
|---|---|---|---|
| `iurix-logo-primary.png` | `Iurix logo - small.png` | 1024×1024 | ❌ **Opaque marble** |
| `iurix-logo-transparent-INTERIM.png` | `Iurix_logo_no_crtified-removebg-preview.png` | 525×475 | ✅ Transparent |
| `iurix-logo-source-hires.png` | `Iurix logo no crtified.png` | 2154×1952 | ❌ **Opaque marble** |

Rob designated `iurix-logo-primary.png` + the transparent file as the correct logo (2026-07-27).

## ⚠️ Gaps to close before launch

1. **The two designated files are different artwork.** `iurix-logo-primary.png` is the 1024×1024
   *certified* variant; the transparent cutout was made from the *no-certified* variant
   (1024×928 / 2154×1952). **There is currently no transparent version of the designated primary.**
   Resolve which single artwork is canonical, then cut that one out.

2. **The transparent file is a remove.bg free preview** — 525×475, downscaled from a 2154×1952
   original. Too small for the certificate PDF, and remove.bg's edge detection tends to damage
   exactly what this mark has a lot of: the soft outer glow and the thin tapered crescent tips.
   **Re-cut at full resolution** (paid remove.bg, Photoshop, or Affinity) from
   `iurix-logo-source-hires.png` or the certified equivalent.

3. **The three high-res files have the marble baked in.** They report a 32-bit alpha channel, but
   every edge pixel is fully opaque (`A=255`). Dropping them into the nav or the certificate
   produces a visible marble square, not a logo.

4. **A simplified small-size variant is needed.** The brushed-metal gradients, outer glow, and fine
   crescent tapers turn to mush in the nav pill (~32px) and are unreadable as a favicon (16–32px).
   Needs a flatter, higher-contrast reduction — possibly just the scales-and-`I` element without
   the crescents.

5. **No wordmark exists.** This is a mark only. The component it replaces (`app/_components/atc-logo.tsx`)
   is a *lockup* — mark + wordmark — so the nav needs a horizontal "Iurix Accreditation" lockup and
   a typeface decision.

6. **Dark mode unverified.** The app has a dark-mode toggle. The metallic should read on dark, but
   the white outer glow may halo badly. May need a second variant.

**Vector (SVG) would close 1, 3, 4, and 5 at once** if the original design file can produce one. If
the mark was AI-generated with no vector source, raster is workable — `lib/cert-pdf.ts` already
embeds a raster blob — but each variant has to be produced separately.

## Where these get used

| Target | Current placeholder | Needs |
|---|---|---|
| `lib/cert-pdf.ts:18` `LOGO_B64` | base64 JPEG placeholder | Full-res transparent PNG, base64-encoded |
| `public/athena-logo-email.png` | Athena email header | Transparent or solid-bg PNG, served from an absolute URL on `iurixaccreditation.com` |
| `public/atc-athena-logo.svg` | "atc" monogram vector | Primary site mark |
| `app/_components/atc-logo.tsx` | mark + "athena." wordmark | Full Iurix lockup |
| favicon / OG images | — | Simplified small-size variant |
