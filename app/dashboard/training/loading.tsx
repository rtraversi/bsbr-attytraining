export default function TrainingLoading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Course header skeleton */}
      <div className="mb-8">
        <div className="h-3 w-24 rounded bg-zinc-800 animate-pulse mb-2" />
        <div className="h-7 w-72 rounded-lg bg-zinc-800 animate-pulse" />
      </div>

      {/* Rise iframe placeholder skeleton */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 aspect-video flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-800 animate-pulse" />
          <div className="h-3 w-36 rounded bg-zinc-800/70 animate-pulse" />
          <div className="h-3 w-52 rounded bg-zinc-800/50 animate-pulse" />
        </div>
      </div>

      {/* Content area skeleton */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="h-4 w-40 rounded bg-zinc-800 animate-pulse mb-2" />
        <div className="h-3 w-72 rounded bg-zinc-800/70 animate-pulse mb-5" />
        <div className="h-10 w-56 rounded-lg bg-zinc-800 animate-pulse" />
      </div>
    </div>
  )
}
