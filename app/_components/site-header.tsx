"use client";

import Link from "next/link";
import { useState } from "react";
import { IurixLockup } from "./iurix-lockup";

// Marketing nav. Katy's page structure calls for sign-in, pricing, contact and
// about; about/contact have no approved copy yet, so the content links are
// in-page anchors and Pricing/Sign in go to the real routes.
//
// Sign-up is NOT a route — it is the checkout flow (/pricing → seat slider →
// /api/checkout → Stripe → /onboarding). Every primary action lands on /pricing.
// Four items, not five. The doubled lockup is ~270px wide at full size, which
// left the five-item nav plus "Sign in" plus the CTA about 50px over the 1076px
// of usable track — so the row wrapped and the links stacked.
//
// "What's included" is the one dropped: it is the least navigational of the five
// (the details section is where the page lands anyway) and it was the widest
// label. It is still reachable from the footer.
//
// If a fifth item ever goes back, check the arithmetic at 1024px, which is the
// tightest point where the full nav is still shown.
const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "The standard", href: "/#standard" },
  { label: "Your exposure", href: "/#exposure" },
  { label: "The record", href: "/#record" },
  { label: "Pricing", href: "/pricing" },
];

// Mobile gets the full set — there is a whole column to put it in.
const MOBILE_NAV_ITEMS: { label: string; href: string }[] = [
  ...NAV_ITEMS.slice(0, 3),
  { label: "What's included", href: "/#included" },
  { label: "Pricing", href: "/pricing" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-silver bg-marble/90 backdrop-blur-md">
      {/* flex-nowrap is load-bearing, not decorative: without it this row wraps
          and the nav stacks under the lockup the moment the content exceeds the
          track. Everything inside is nowrap + shrink-0 for the same reason. */}
      <div className="mx-auto flex max-w-[1140px] flex-nowrap items-center justify-between gap-5 px-6 py-2.5 md:px-8 lg:gap-8">
        <Link
          href="/"
          aria-label="Iurix Accreditation home"
          className="shrink-0"
        >
          {/* Doubled from the 1.25rem default (Rob, 2026-08-04). The lockup scales
              as one unit off font-size, so this takes the mark from 40px to 80px
              and the wordmark with it. Clamped rather than fixed so it backs off
              on narrow screens, where 80px of mark plus the menu button would
              crowd a 390px viewport. */}
          <IurixLockup style={{ fontSize: "clamp(1.9rem, 4.5vw, 2.5rem)" }} />
        </Link>

        <nav className="hidden shrink-0 items-center gap-6 lg:flex xl:gap-7">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="whitespace-nowrap text-[15px] text-ink-soft transition-colors hover:text-teal-mid"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="whitespace-nowrap text-[15px] text-ink-soft transition-colors hover:text-teal-mid"
          >
            Sign in
          </Link>
          <Link
            href="/pricing"
            className="whitespace-nowrap rounded-[1px] bg-teal-ink px-5 py-2.5 text-[15px] font-medium text-marble transition-colors hover:bg-ink"
          >
            Accredit your firm
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[1px] border border-silver text-ink lg:hidden"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-silver bg-marble px-6 py-4 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {MOBILE_NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-2 text-[15px] text-ink-soft"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {/* Both of these are already in the bar itself from sm up, so they
                only belong in the panel on the narrowest screens — otherwise
                opening the menu at tablet width shows them twice. */}
            <li className="sm:hidden">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block py-2 text-[15px] text-ink-soft"
              >
                Sign in
              </Link>
            </li>
            <li className="pt-2 sm:hidden">
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="block rounded-[1px] bg-teal-ink px-5 py-3 text-center text-[15px] font-medium text-marble"
              >
                Accredit your firm
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
