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
const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "The standard", href: "/#standard" },
  { label: "Your exposure", href: "/#exposure" },
  { label: "The record", href: "/#record" },
  { label: "Pricing", href: "/pricing" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-mint-line bg-marble/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-6 px-6 py-3.5 md:px-8">
        <Link href="/" aria-label="Iurix Accreditation — home">
          <IurixLockup />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-[15px] text-ink-soft transition-colors hover:text-teal-mid"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="text-[15px] text-ink-soft transition-colors hover:text-teal-mid"
          >
            Sign in
          </Link>
          <Link
            href="/pricing"
            className="rounded-[1px] bg-teal-deep px-5 py-2.5 text-[15px] font-medium text-marble transition-colors hover:bg-ink"
          >
            Certify your staff
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
          className="flex h-9 w-9 items-center justify-center rounded-[1px] border border-mint-line text-ink sm:hidden"
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
          className="border-t border-mint-line bg-marble px-6 py-4 sm:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
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
            <li>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block py-2 text-[15px] text-ink-soft"
              >
                Sign in
              </Link>
            </li>
            <li className="pt-2">
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="block rounded-[1px] bg-teal-deep px-5 py-3 text-center text-[15px] font-medium text-marble"
              >
                Certify your staff
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
