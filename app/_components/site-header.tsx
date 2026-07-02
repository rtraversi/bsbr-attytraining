import Link from "next/link";
import { AtcLogo } from "./atc-logo";

// Deferred pages (brief §3) link to "#" until each is designed. Pricing is live.
const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Overview", href: "#" },
  { label: "Training", href: "#" },
  { label: "Certificate", href: "#" },
  { label: "Policy", href: "#" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "#" },
];

export function SiteHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5 md:px-10">
        {/* Logo */}
        <Link href="/" aria-label="Athena home">
          <AtcLogo />
        </Link>

        {/* Center nav pill — exact styling per first-draft reference */}
        <div className="athena-pill hidden items-center px-2 py-1.5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="font-headline rounded-full px-5 py-2 text-sm text-white/80 transition-colors duration-300 ease-in-out hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right: Sign In + Get started share one pill container (per reference) */}
        <div className="athena-pill flex items-center gap-1 py-1.5 pl-2 pr-1.5">
          <Link
            href="/login"
            className="font-headline rounded-full px-4 py-2 text-sm text-white/80 transition-colors duration-300 ease-in-out hover:bg-white/5 hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/pricing"
            className="athena-pill-solid font-headline px-5 py-2 text-sm font-medium"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
