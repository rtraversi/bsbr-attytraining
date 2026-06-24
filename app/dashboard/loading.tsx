export default function DashboardLoading() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      {/* Firm header skeleton */}
      <div className="mb-6">
        <div className="h-7 w-48 rounded-lg bg-zinc-800 animate-pulse mb-2" />
        <div className="h-4 w-28 rounded bg-zinc-800/70 animate-pulse" />
      </div>

      {/* Compliance score skeleton */}
      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5">
        <div className="flex items-end gap-3">
          <div className="h-10 w-16 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-4 w-48 rounded bg-zinc-800/70 animate-pulse mb-1" />
        </div>
        <div className="h-3 w-36 rounded bg-zinc-800/50 animate-pulse mt-2" />
      </div>

      {/* Onboarding checklist skeleton */}
      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5">
        <div className="h-3 w-28 rounded bg-zinc-800 animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-zinc-800 animate-pulse shrink-0" />
              <div className="h-4 rounded bg-zinc-800/70 animate-pulse" style={{ width: `${[55, 42, 68][i]}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Invite section skeleton */}
      <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="h-4 w-36 rounded bg-zinc-800 animate-pulse mb-4" />
        <div className="flex gap-3">
          <div className="flex-1 h-10 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="w-28 h-10 rounded-lg bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* CSV upload skeleton */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="h-4 w-40 rounded bg-zinc-800 animate-pulse mb-2" />
        <div className="h-3 w-64 rounded bg-zinc-800/60 animate-pulse mb-4" />
        <div className="h-10 w-36 rounded-lg bg-zinc-800 animate-pulse" />
      </div>

      {/* Team table skeleton */}
      <div>
        <div className="h-3 w-20 rounded bg-zinc-800 animate-pulse mb-3" />
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          {/* Table header */}
          <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 flex gap-6">
            {['w-16', 'w-24', 'w-20', 'w-10', 'w-28', 'w-20', 'w-24'].map((w, i) => (
              <div key={i} className={`h-3 ${w} rounded bg-zinc-800 animate-pulse`} />
            ))}
          </div>

          {/* 4 shimmer rows */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="border-b border-zinc-800 last:border-0 bg-zinc-900 px-4 py-3.5 flex items-center gap-6"
            >
              {/* Name */}
              <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
              {/* Email */}
              <div className="h-4 w-36 rounded bg-zinc-800/70 animate-pulse" />
              {/* Status chip */}
              <div className="h-5 w-20 rounded-full bg-zinc-800 animate-pulse" />
              {/* Score */}
              <div className="h-4 w-8 rounded bg-zinc-800/50 animate-pulse" />
              {/* Completion date */}
              <div className="h-4 w-24 rounded bg-zinc-800/50 animate-pulse" />
              {/* Cert */}
              <div className="h-4 w-12 rounded bg-zinc-800/50 animate-pulse" />
              {/* Actions */}
              <div className="flex gap-2 ml-auto">
                <div className="h-6 w-14 rounded bg-zinc-800 animate-pulse" />
                <div className="h-6 w-14 rounded bg-zinc-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
