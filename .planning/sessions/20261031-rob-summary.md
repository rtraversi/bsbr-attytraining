# 2026-10-31 — Rob (terminal): Higgsfield clips in the pillar flip cards — LIVE

## What was done

**The four pillar flip cards on the homepage ("The standard") now each play a short clip on hover.**
Live in production (run `41196587506`, commit `aa00de5`), after Rob reviewed the preview
(`https://5ec5fe40-bsbr-attytraining.aistaffcompliance.workers.dev`).

- **Policy:** a brass stamp presses a rose-gold wax seal onto a sheet, then lifts away.
- **Training:** five steel figurines; a rose-gold line runs beneath them and each fills with teal.
- **Attestation:** a rose-gold-nibbed pen writes a teal flourish and lifts out.
- **Monitoring:** a relief map of the US; a light sweeps west to east and points light up across it.

How it works:
- `app/_components/motion/pillar-clip.tsx`; CSS `.pillar-clip*` in `app/globals.css`; assets in
  `public/brand/pillars/<name>.mp4` + `<name>.webp`.
- Plays on hover or keyboard focus, front face up; stops when the pointer leaves.
- **Touch screens and reduced motion get the clip's last frame as a still, never the video** (Rob's call).
- The clips are shot on a pale mint-white ground. CSS brightens each until that ground clips to white
  and `mix-blend-mode: multiply`s it into the card, so only the subject and its shadow show. Brightness
  is tuned per clip.
- **The roman numerals (I–IV) came off both faces** of the pillar cards (Rob).
- **Case cards (the three 2026 rulings) are deliberately unchanged** — Rob: no animation there.

Decisions along the way:
- Started with CSS hover animations on the line icons; Rob then asked for Higgsfield clips in the cards'
  open space and for the icon animations to go once the clips were in. They were removed;
  `homepage-icons.tsx` is untouched.
- **480p is the final resolution** — 992 px wide already covers a ~370 px strip at 2x, so no 720p renders.
- Re-encoded with ffmpeg (x264 CRF 28): 50–92 KB per clip, ~310 KB total with stills. There's no system
  ffmpeg on Rob's machine; `ffmpeg-static` was used from a scratch folder, not added to the project.

Higgsfield lessons (details in `.planning/quick/261031-pi-pillar-icon-motion/261031-pi-SUMMARY.md`):
- Cream-on-cream subjects vanish under the multiply blend. The ground must be cool mint-white and the
  subject must contrast with it.
- The seal took three tries before the stamp visibly pressed rather than the seal popping in.
- Jobs: `scripts/higgsfield/jobs/pillar-{policy,training,attestation,monitoring}.json`.

**Spend:** 8 test renders at ~$0.58 = ~$4.60, plus possibly ~$0.58 for a map request that dropped with
ECONNRESET. Running total roughly **$9.40–10.00 of $115**.

Repo housekeeping: local `main` had diverged from origin (Rob's unpushed 10-30 wrap-up vs Max's 10-29
wrap-up). Rebased; `session_handoff.md` conflict resolved by keeping both sections.

Process: GSD isn't installed on Rob's machine, so edits were made directly, as on 2026-10-20.

## Status

- Production: live and verified (homepage 200, all four clips in the page, assets served).
- Working tree: `supabase/grants/` is still untracked. It predates this session and was left alone.

## Next steps

1. Optional tweaks: the policy sheet mostly fades out at the current brightness (`.pillar-clip-policy`;
   lower it to show more paper, at the cost of a faint warm haze). The map clip opens mid-sweep.
2. Higgsfield discount window ends ~2026-11-05: the queued "paste" training-scenario clip is still waiting.
3. Next.js 16 upgrade (still the priority from 2026-10-29), then remove the deploy stopgap flag.

## Open questions

- Was the dropped map request billed? Check open.higgsfield.ai/billing.
- Rob set up Cloudflare MCPs this session; not used yet.

## Follow-up (same day): Firefox flip fix — LIVE

Rob found that in **Firefox** a flipped pillar card showed its front mirrored instead of its back. The clips'
`mix-blend-mode` made `.flip-card-inner` the blend group; Firefox isolates that and flattens its
`preserve-3d`, so `backface-visibility` stopped working. Chrome was unaffected, which is why the preview
review missed it. Fix: `isolation: isolate` on `.flip-face` (`app/globals.css`), commit `3d6250a`.
Reproduced and verified fixed in Playwright Firefox (live before, preview after, live after). Production
run `41206420277`, success. **Lesson: test flip/3D changes in Firefox as well as Chrome.**
