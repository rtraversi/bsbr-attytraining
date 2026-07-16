'use client'

import { usePathname } from 'next/navigation'
import { EmployeeTabBar } from './employee-tab-bar'
import { ToastProvider } from './toast-provider'

/**
 * Chooses the dashboard chrome by ROUTE, not a route whitelist. The blue-gray
 * admin shell applies ONLY to the bare /dashboard admin home; everything else —
 * Overview/Training/Quizzes (incl. admins taking their own training) AND
 * Settings/Support — gets the standard shell. Inverting the rule this way fixes
 * Settings/Support (previously wrongly blue-gray for admins) without naming them.
 * Same `usePathname()` pattern NavPill and EmployeeTabBar use.
 */
export function DashboardShell({
  role,
  pill,
  children,
}: {
  role: string | null
  pill: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminHome = role === 'admin' && pathname === '/dashboard'
  const showTrainingShell = !isAdminHome

  // Standard shell — light-by-default themed experience with the bottom tab bar.
  if (showTrainingShell) {
    return (
      <div className="font-headline flex min-h-screen flex-col bg-[#F5F7FA] pb-16 text-[#0A0A0A] transition-colors dark:bg-[#050607] dark:text-[#F5F7FA]">
        <div className="px-4 py-3 md:px-6">{pill}</div>
        <ToastProvider>
          <div className="flex-1">{children}</div>
        </ToastProvider>
        <EmployeeTabBar />
      </div>
    )
  }

  // Admin home shell — same flat shape as the standard shell (pill in the same
  // slot), only the light backdrop differs (#CFDCE8 is admin-home-specific).
  // Dark mode is the same flat black as the standard shell — no separate inset
  // panel. Full-bleed on purpose (no max-w cap, minimal padding): the grid owns
  // the whole viewport, side padding matches the pill's so cards line up with it.
  //
  // At lg+ the shell is viewport-locked (h-[max(100vh,880px)] + overflow-y-auto):
  // the pill takes its natural height and the content wrapper gets the rest
  // (flex-1 + min-h-0), so the dashboard grid inside fills it with fr rows and no
  // page-level scroll — down to an 880px floor. Below that floor the shell holds
  // at 880px instead of continuing to compress: admin-dashboard.tsx's fr rows
  // (lg:grid-rows-[minmax(0,19fr)_minmax(0,26fr)]) squeeze toward zero on a short
  // viewport, and per-card content (e.g. CertificationForecast's three stacked
  // blocks) has no overflow clipping of its own, so it starts overlapping instead
  // of shrinking. 880px is empirically measured, not guessed: with the shell
  // forced to various heights and getBoundingClientRect() on the tightest pair
  // (CertificationForecast's "Certification Forecast" heading vs. the
  // "Projected Fully Certified" banner below it — the actual binding
  // constraint; Quick actions and the left stack stayed clear throughout), the
  // gap crosses zero at 868px. 880px adds ~12px of margin over that measured
  // crossover for cross-browser font-rendering variance. overflow-y-auto lets
  // the shell itself scroll once it's pinned at the floor, rather than
  // clipping/hiding the overflow the way lg:overflow-hidden did. Below lg it
  // stays a normal min-h-screen scrolling page, unaffected by any of this.
  return (
    <div className="font-headline flex min-h-screen flex-col bg-[#CFDCE8] text-[#0A0A0A] transition-colors lg:h-[max(100vh,880px)] lg:overflow-y-auto dark:bg-[#050607] dark:text-[#F5F7FA]">
      <div className="px-4 py-3 md:px-6">{pill}</div>
      <ToastProvider>
        <div className="w-full px-4 pb-4 pt-1 md:px-6 lg:min-h-0 lg:flex-1">
          {children}
        </div>
      </ToastProvider>
    </div>
  )
}
