interface Props {
  score: number
  total: number
}

/**
 * Certification progress block.
 *
 * The number is `certified / invited`, NOT `certified / seats purchased` — a
 * firm that bought 10 seats, invited 2 and certified both sits at 100% here
 * while eight seats are still empty. The arithmetic is honest; the old label
 * ("Certified") was not, because it implied the whole firm. Hence the explicit
 * "of invited staff" qualifier under the band: the denominator is now stated on
 * the card rather than left to be inferred.
 *
 * Band and colour come from ONE lookup, so the words and the colour cannot
 * disagree. Both sit on the same 25% boundaries. The 100% state keeps its flat
 * light gold over a subtle warm radial (locked in the sketch: no gradient
 * number, no animation — the dark-green and shimmer variants were tried and
 * rejected).
 */

// Ordered high → low; the first match wins. Every boundary is a 25% line, and
// 0 is its own band — "Not started" must mean nobody, never a rounded-down 1.
const BANDS = [
  { min: 100, label: 'Fully certified', color: 'text-[#D9AE4E]' },
  { min: 75, label: 'Almost certified', color: 'text-[#16A34A]' },
  { min: 50, label: 'Halfway', color: 'text-[#16A34A]' },
  { min: 25, label: 'A quarter there', color: 'text-[#CA8A04]' },
  { min: 1, label: 'Just started', color: 'text-[#CA8A04]' },
  { min: 0, label: 'Not started', color: 'text-[#8A8A8A] dark:text-[#7A8189]' },
] as const

export function ComplianceScore({ score, total }: Props) {
  const band = BANDS.find(b => score >= b.min) ?? BANDS[BANDS.length - 1]

  // Big and notorious: sized against the CARD's width (cqw via the @container
  // on the card div), not the viewport, so even "100%" (~2.1em wide) can never
  // overflow — 42cqw × 2.1 ≈ 88% of the card. leading-none keeps the tall glyph
  // inside the padding. The % sign scales with it (em).
  const NUMBER = 'mb-2 text-[clamp(4.5rem,42cqw,14rem)] font-extralight leading-none'

  // Warm radial celebration backdrop, 100% only. dark:bg-none drops the white
  // gradient in dark mode so the card falls back to the standard dark surface.
  const goldBg =
    total > 0 && score === 100
      ? 'bg-[radial-gradient(circle_at_50%_35%,#FFFBF0_0%,#ffffff_72%)] dark:bg-none'
      : ''

  return (
    <div
      className={`@container flex flex-col items-center justify-center rounded-3xl bg-white px-4 py-5 text-center dark:border dark:border-[#1F2429] dark:bg-[#0D0F12] ${goldBg}`}
    >
      {/* "No members yet" and "0% certified" are different facts. The em dash is
          what distinguishes them, so it stays — and the band beneath says why
          there is no number rather than reading "Not started", which a firm at a
          real 0% would also show. The "of invited staff" qualifier is suppressed
          here: nobody has been invited, so there is no denominator to qualify. */}
      {total === 0 ? (
        <>
          <p className={`${NUMBER} text-[#8A8A8A] dark:text-[#7A8189]`}>—</p>
          <span className="text-xl font-extralight text-[#8A8A8A] dark:text-[#7A8189]">
            No staff invited yet
          </span>
        </>
      ) : (
        <>
          <p className={`${NUMBER} ${band.color}`}>
            {score}
            <span className="text-[0.45em]">%</span>
          </p>
          <span className={`text-xl font-extralight ${band.color}`}>{band.label}</span>
          <span className="mt-0.5 text-xs font-extralight text-[#8A8A8A] dark:text-[#7A8189]">
            of invited staff
          </span>
        </>
      )}
    </div>
  )
}
