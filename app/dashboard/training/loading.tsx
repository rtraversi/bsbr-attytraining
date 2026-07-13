// Simple centered spinner (matches app/dashboard/loading.tsx). Replaces the stale
// dark-zinc skeleton that no longer matched the design system.
export default function TrainingLoading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#E5EEF5] border-t-[#0094FF] dark:border-[#1F2429] dark:border-t-[#32C7FF]" />
    </div>
  )
}
