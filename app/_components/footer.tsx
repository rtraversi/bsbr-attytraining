import Link from 'next/link'

// Sitewide footer (brief §3.3). Dark rebrand — pure black to match the hero.
// Icons are desaturated to white silhouettes per the no-flat-accent rule.

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:border-white/25 hover:text-white"
    >
      {children}
    </a>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-6 py-14 text-white md:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand + disclaimer */}
          <div className="max-w-md space-y-4">
            <p className="font-headline text-lg font-extralight uppercase tracking-tight">
              IURIX
            </p>
            <p className="text-xs leading-relaxed text-white/40">
              This certificate documents completion of training. It is not legal advice
              and does not constitute accreditation by the ABA or any state bar.
            </p>
          </div>

          {/* Links + social */}
          <div className="flex flex-col gap-6 md:items-end">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
              <Link href="/privacy" className="transition-colors hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-white">
                Terms of Service
              </Link>
              <Link href="/dpa" className="transition-colors hover:text-white">
                Data Processing Addendum
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <SocialIcon href="https://www.linkedin.com" label="LinkedIn">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C20.4 8.65 21 11 21 14.1V21h-4v-6.1c0-1.45-.03-3.3-2-3.3s-2.3 1.57-2.3 3.2V21H9z" />
                </svg>
              </SocialIcon>
              <SocialIcon href="https://x.com" label="X">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M18.9 2H22l-7.5 8.6L23 22h-6.8l-5.3-6.9L4.8 22H1.7l8-9.2L1 2h7l4.8 6.4zM17.7 20h1.7L7.4 4H5.6z" />
                </svg>
              </SocialIcon>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/5 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} IURIX. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
