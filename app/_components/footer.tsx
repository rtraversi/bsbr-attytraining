import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <p className="text-xs text-zinc-500 leading-relaxed">
          This certificate documents completion of training. It is not legal advice and does not
          constitute accreditation by the ABA or any state bar.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-600">
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">
            Privacy Policy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">
            Terms of Service
          </Link>
          <span aria-hidden>·</span>
          <Link href="/dpa" className="hover:text-zinc-400 transition-colors">
            Data Processing Addendum
          </Link>
          <span className="ml-auto">© 2026 Built Smart by Rob</span>
        </div>
      </div>
    </footer>
  )
}
