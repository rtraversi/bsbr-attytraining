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

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-6 text-center dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]">
      {total === 0 ? (
        <p className="mb-2 text-6xl font-normal text-[#8A8A8A] dark:text-[#7A8189]">—</p>
      ) : (
        <p className={`mb-2 text-6xl font-normal ${scoreColor}`}>
          {score}
          <span className="text-3xl">%</span>
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
