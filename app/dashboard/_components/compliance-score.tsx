interface Props {
  score: number
  total: number
}

/**
 * Certified block. The number's colour tiers by score — a firm sitting at 40%
 * should not read the same as one at 100%. The 100% state is a flat, light
 * gold over a subtle warm radial (locked in the sketch: no gradient number,
 * no animation — the dark-green and shimmer variants were tried and rejected).
 */
export function ComplianceScore({ score, total }: Props) {
  const scoreColor =
    score === 100
      ? 'text-[#D9AE4E]'
      : score >= 50
        ? 'text-[#16A34A]'
        : score >= 1
          ? 'text-[#CA8A04]'
          : 'text-[#8A8A8A] dark:text-[#7A8189]'

  // Big and notorious: fluid clamp so it fills the card's width, leading-none +
  // tighter padding so the taller glyph can't overflow. The % scales with it (em).
  const NUMBER = 'mb-2 text-[clamp(4rem,8vw,10rem)] font-light leading-none'

  // Warm radial celebration backdrop, 100% only. dark:bg-none drops the white
  // gradient in dark mode so the card falls back to the standard dark surface.
  const goldBg =
    total > 0 && score === 100
      ? 'bg-[radial-gradient(circle_at_50%_35%,#FFFBF0_0%,#ffffff_72%)] dark:bg-none'
      : ''

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl bg-white px-4 py-5 text-center dark:border dark:border-[#1F2429] dark:bg-[#0D0F12] ${goldBg}`}
    >
      {total === 0 ? (
        <p className={`${NUMBER} text-[#8A8A8A] dark:text-[#7A8189]`}>—</p>
      ) : (
        <p className={`${NUMBER} ${scoreColor}`}>
          {score}
          <span className="text-[0.45em]">%</span>
        </p>
      )}
      <span className="text-xl font-extralight text-[#8A8A8A] dark:text-[#7A8189]">
        Certified
      </span>
    </div>
  )
}
