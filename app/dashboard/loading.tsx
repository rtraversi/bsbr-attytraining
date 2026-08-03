// Simple centered spinner — shown for any /dashboard/* route without its own more
// specific loading.tsx. Deliberately content-agnostic (the old skeleton was a stale
// mismatch of the pre-restyle admin dashboard). Background is inherited from the shell.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#E5EEF5] border-t-[var(--brand-emphasis)] dark:border-[#1F2429] dark:border-t-[var(--brand-primary)]" />
    </div>
  )
}
