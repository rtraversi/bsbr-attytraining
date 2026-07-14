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
  // slot, content in one max-w wrapper), only the light backdrop differs
  // (#CFDCE8 is admin-home-specific). Dark mode is the same flat black as the
  // standard shell — no separate inset panel.
  //
  // At lg+ the shell is viewport-locked (h-screen + overflow-hidden): the pill
  // takes its natural height and the content wrapper gets the rest (flex-1 +
  // min-h-0), so the dashboard grid inside can fill it with fr rows and no
  // page-level scroll. Below lg it stays a normal min-h-screen scrolling page.
  return (
    <div className="font-headline flex min-h-screen flex-col bg-[#CFDCE8] text-[#0A0A0A] transition-colors lg:h-screen lg:overflow-hidden dark:bg-[#050607] dark:text-[#F5F7FA]">
      <div className="px-4 py-3 md:px-6">{pill}</div>
      <ToastProvider>
        <div className="mx-auto w-full max-w-[1600px] px-6 py-6 md:px-10 md:py-8 lg:min-h-0 lg:flex-1 xl:px-14 xl:py-14">
          {children}
        </div>
      </ToastProvider>
    </div>
  )
}
