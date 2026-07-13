interface Props {
  score: number
  certified: number
  total: number
}

/**
 * Certified block. The number's colour tiers by score — a firm sitting at 40%
 * should not read the same as one at 100%.
 */
export function ComplianceScore({ score, certified, total }: Props) {
  const scoreColor =
    score === 100
      ? 'text-[#16A34A]'
      : score >= 50
        ? 'text-[#B45309]'
        : 'text-[#DC2626]'

  // Big and notorious: fluid clamp so it fills the card's width, leading-none +
  // tighter padding so the taller glyph can't overflow. The % scales with it (em).
  const NUMBER = 'mb-2 text-[clamp(3.5rem,9vw,6rem)] font-normal leading-none'

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-4 py-5 text-center dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]">
      {total === 0 ? (
        <p className={`${NUMBER} text-[#8A8A8A] dark:text-[#7A8189]`}>—</p>
      ) : (
        <p className={`${NUMBER} ${scoreColor}`}>
          {score}
          <span className="text-[0.45em]">%</span>
        </p>
      )}
      <span className="text-xs font-bold uppercase tracking-wide text-[#8A8A8A] dark:text-[#7A8189]">
        Certified
      </span>
      {total > 0 && (
        <p className="mt-1.5 text-[11px] text-[#8A8A8A] dark:text-[#7A8189]">
          {certified} of {total} hold a valid certificate
        </p>
      )}
    </div>
  )
}
