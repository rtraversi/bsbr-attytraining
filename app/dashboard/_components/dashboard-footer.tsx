import Link from 'next/link'

// Compact footer for dashboard/training routes — just links + a rights line.
// (The full marketing <Footer /> with disclaimer + social icons is not reused here.)
export function DashboardFooter() {
  return (
    <footer className="border-t border-zinc-800 px-6 py-6">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-zinc-500">
          <Link href="/privacy" className="transition-colors hover:text-zinc-300">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-zinc-300">
            Terms
          </Link>
          <Link href="/dpa" className="transition-colors hover:text-zinc-300">
            Cookies
          </Link>
        </nav>
        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Athena. All rights reserved.</p>
      </div>
    </footer>
  )
}
