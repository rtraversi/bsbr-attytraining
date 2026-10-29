# 2026-10-29 — Rob (terminal-Claude) — homepage motion layer, deploy unblocked, Higgsfield

## What was done

**Homepage redesign, motion layer — LIVE in production** (commit `c07205a`, production run
`40938593577`). Inspired by a friend's site, mystudyguide.ai, built from a single written brief
with Claude Code plus Higgsfield for art and film (his guide was in Rob's Downloads as
`landing-page-guide.md`). Rob liked its arrows, flip cards and animation, but not its "school"
look, so each technique was re-drawn for the brand, reviewed as a standalone demo artifact
(claude.ai/artifact/9yrsSRm55qSZiNXJRE9mYA, private), iterated with Rob, then ported. Copy is
unchanged throughout.
- **Brushed-metal hero** (`.hero-metal`, `app/globals.css`): faint grain (Rob asked twice for less),
  banding, a faded two-weight gridline, and a sheen every ~11s.
- **Margin notes** (`app/_components/motion/margin-note.tsx`, Cedarville Cursive as `--font-pen`):
  "Click here" on the hero CTA, which writes in on load and then nudges, plus four annotations that
  only restate what the page already says.
- **Flip cards** (`motion/flip-card.tsx`): the four pillars (icon on a light mint wash; Rob asked for
  that) and the three 2026 rulings (citation on the front, holding on the back).
- **Ribbon** (`motion/page-ribbon.tsx`): a rose-gold line from the hero seal, drawn by scroll and
  routed through the side gutters by `<i data-ribbon>` markers. It wraps the closing seal, which
  then "presses".
- **Included list**: line icons (`app/_components/homepage-icons.tsx`, hand-drawn; Rob may supply
  his own) and bold lead phrases. CTAs rounded to 7px, header included.
- The California State Bar pull quote was kept. Rob flagged it as important; its wording is
  "should ensure … periodic training", not a requirement for a written policy. Leave it verbatim.
- Every animation has a reduced-motion rule. Checked: no sideways scroll at 375px or desktop.
- Detail: `.planning/quick/261029-hp-homepage-motion/261029-hp-SUMMARY.md`.

**Also went live with this deploy:** the 2026-10-20 footer phone number **919-446-1819**, which
had been committed but never deployed. It is now on the production site.

**Deploys were broken, and are unblocked with a stopgap** (commit `91c459e`, made by Rob by hand).
OpenNext now refuses Next.js 15 because it is more than two years past release (since
2026-10-21), so every build failed. `--dangerouslyUseUnsupportedNextVersion` was added to the build
step in `.github/workflows/deploy.yml`. It skips only that check. **The `preview`/`deploy` scripts
in package.json were NOT changed**, so a Mac deploy via `pnpm run deploy` would still fail.
Claude Code's auto-mode blocked Claude from adding the flag and from triggering the production
deploy, so Rob did both.

**Higgsfield**: the CLI is installed (`@higgsfield/cli` 1.2.2) and signed in. Claude selected the
"Private" workspace (until then every command failed with "No workspace selected"). It is on the
**free plan with 10 credits**. The companion skills are **not installed**: the auto-mode classifier
blocked that. Rob runs `npx skills add higgsfield-ai/skills -g -a claude-code -y`, then restarts.

## Status

- Production: the homepage changes are live, and `/`, `/pricing`, `/login` and `/verify` return 200.
- Working tree: `supabase/grants/` is still untracked. It predates this session and was left alone.

## Next steps

1. **Upgrade to Next.js 16 (priority), then remove the flag.** OpenNext 1.20.12 needs Next
   >=16.4.1. React is already on 19.1. The known work:
   - the custom `webpack()` in `next.config.ts`: Next 16 builds with Turbopack, so pass `--webpack`
     or drop the DefinePlugin;
   - keep `middleware.ts` until OpenNext's `proxy.ts` support is confirmed;
   - do it on a branch, with a manually dispatched preview;
   - `.env.local` points at prod, so no DB-backed tests against it.
2. **Higgsfield art.** Write a brief for stills and an ~18s seal-and-ribbon hero film: no text in
   the frame, a seamless loop, and stills approved before the film. It needs a paid plan or credits;
   the friend's run was ~236 credits. Check the live prices and get Rob's OK before any spend.
3. Rob to review the live homepage on his phone, and possibly swap in his own icons.

## Open questions

- Does Katy or Max want to weigh in on the motion layer? It went live on Rob's call.
- Should the package.json scripts also get the flag, for Max's Mac?
