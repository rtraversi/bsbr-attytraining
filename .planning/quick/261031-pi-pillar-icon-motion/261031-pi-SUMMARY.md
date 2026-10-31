# 261031-pi — Pillar card clips

**Date:** 2026-10-31 · **Who:** Rob (with Claude) · **Status:** built, previewed locally, not committed or deployed

## Why

Rob wanted a small 2–4 s animation in each homepage flip tile, relevant to the tile, played on hover so
they don't all run at once. Decided with Rob: **the four pillar cards only** (not the three case cards),
**no animation on touch screens**, the roman numerals off the cards, and Higgsfield for the animation.

## What changed

- **Roman numerals removed** from both faces of the pillar cards (`app/_components/standard-section.tsx`).
- **A clip in each card's open space** (`app/_components/motion/pillar-clip.tsx`, CSS `.pillar-clip` in
  `app/globals.css`), played while the card is hovered or keyboard-focused, front face up:
  - **Policy:** a brass stamp presses a rose-gold wax seal onto a sheet, then lifts away.
  - **Training:** five steel figurines; a rose-gold line runs beneath them and each fills with teal.
  - **Attestation:** a rose-gold-nibbed pen writes a teal flourish and lifts out.
  - **Monitoring:** a relief map of the US; a light sweeps west to east and points light up across it.
- **At rest, on touch screens and under reduced motion** the clip's last frame shows as a still
  (`public/brand/pillars/<name>.webp`); the video (`<name>.mp4`) loads only for hover-capable pointers.
- **How they blend in:** the clips are shot on a pale mint-white ground; CSS brightens each until that
  ground clips to white and multiplies it into the card, so only the subject and its shadow show. A
  radial mask softens the edges; the box keeps the 21:9 shape so the mask fits at every width.

An earlier pass this session animated the line icons on hover (CSS only). Rob asked for them to come
out once the clips were in; that change was reverted and `homepage-icons.tsx` is untouched.

## Higgsfield

- Seedance 2.5 text-to-video, **480p, 4 s, 21:9**, no audio. 480p (992 px wide) is already enough for
  a ~370 px strip at 2x, so no 720p finals were rendered. Jobs: `scripts/higgsfield/jobs/pillar-*.json`.
- Re-encoded with ffmpeg (x264, CRF 28, faststart): **50–92 KB per clip**, ~310 KB for all four plus stills.
- Lessons: cream-on-cream subjects vanish under the blend (v1 seal and map); the ground has to be
  cool mint-white to match the card, and the subject needs contrast against it. The seal took three
  tries before the stamp visibly pressed rather than the seal popping in.
- **Spend:** 8 test renders at ~$0.58 = ~$4.60 (plus possibly ~$0.58 for a map request that dropped
  with ECONNRESET; confirm on billing). Running total roughly **$9.40–10.00 of $115**.

## Not done / possible tweaks

- The policy sheet nearly disappears at the current brightness; lower it (`.pillar-clip-policy`) to
  show more paper, at the cost of a faint warm haze.
- The map clip opens with the light sweep already started and one point lit.

## Process

GSD (`/gsd:quick`) isn't installed on Rob's machine (see `.planning/sessions/20260731-max-summary.md`),
so this was edited directly, as on 2026-10-20.
