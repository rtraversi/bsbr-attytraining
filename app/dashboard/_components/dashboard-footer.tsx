import Link from 'next/link'

// Compact footer for dashboard/training routes — just links + a rights line.
// (The full marketing <Footer /> with disclaimer + social icons is not reused here.)
export function DashboardFooter() {
  return (
    <footer className="border-t border-[#E5EEF5] px-6 py-6 dark:border-[#1F2429]">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-[#8A8A8A] dark:text-[#7A8189]">
          <Link href="/privacy" className="transition-colors hover:text-[#0094FF] dark:hover:text-[#32C7FF]">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-[#0094FF] dark:hover:text-[#32C7FF]">
            Terms
          </Link>
          <Link href="/dpa" className="transition-colors hover:text-[#0094FF] dark:hover:text-[#32C7FF]">
            Cookies
          </Link>
        </nav>
        <p className="text-xs text-[#8A8A8A] dark:text-[#7A8189]">
          © {new Date().getFullYear()} IURIX. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
