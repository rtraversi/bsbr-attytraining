interface Props {
  score: number
  certified: number
  total: number
}

export function ComplianceScore({ score, certified, total }: Props) {
  const scoreColor =
    score === 100
      ? 'text-teal-400'
      : score >= 50
        ? 'text-amber-400'
        : 'text-red-400'

  return (
    <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5">
      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold leading-none ${total === 0 ? 'text-zinc-600' : scoreColor}`}>
          {total === 0 ? '—' : `${score}%`}
        </span>
        <span className="text-sm text-zinc-400 pb-0.5">of your team is currently certified</span>
      </div>
      {total > 0 && (
        <p className="mt-1.5 text-xs text-zinc-600">
          {certified} of {total} employee{total !== 1 ? 's' : ''} hold a valid certificate
        </p>
      )}
    </div>
  )
}
