import Link from 'next/link'

// Compact footer for dashboard/training routes — just links + a rights line.
// (The full marketing <Footer /> with disclaimer + social icons is not reused here.)
export function DashboardFooter() {
  return (
    <footer className="border-t border-[#E5EEF5] px-6 py-6 dark:border-[#1F2429]">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-[#8A8A8A] dark:text-[#7A8189]">
          <Link href="/privacy" className="transition-colors hover:text-[var(--brand-emphasis)] dark:hover:text-[var(--brand-primary)]">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-[var(--brand-emphasis)] dark:hover:text-[var(--brand-primary)]">
            Terms
          </Link>
          {/* Label says DPA because the href is /dpa. It read "Cookies" until
              2026-08-24, which was simply wrong — /cookies is a different route,
              is 404-guarded in production and has no copy. Do not repoint this
              at /cookies to make the old label true. */}
          <Link href="/dpa" className="transition-colors hover:text-[var(--brand-emphasis)] dark:hover:text-[var(--brand-primary)]">
            DPA
          </Link>
        </nav>
        <p className="text-xs text-[#8A8A8A] dark:text-[#7A8189]">
          © {new Date().getFullYear()} IURIX. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
