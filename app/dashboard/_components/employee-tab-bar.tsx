'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Employee-only bottom tab bar: Overview · Training · Quizzes.
// Fixed to the viewport bottom; the layout adds matching bottom padding so
// content/footer aren't hidden behind it.
const TABS = [
  { href: '/dashboard/overview', label: 'Overview', icon: OverviewIcon },
  { href: '/dashboard/training', label: 'Content', icon: TrainingIcon },
  { href: '/dashboard/quizzes', label: 'Quizzes', icon: QuizzesIcon },
] as const

/**
 * The routes this bar belongs on — derived from TABS so it can't drift from
 * what the bar actually links to.
 *
 * Exported because two other places need the same answer: DashboardShell, to
 * decide whether to render the bar at all (it has no business on Settings or
 * Support), and NavPill, to light up its "Training" entry. That list previously
 * existed as a hand-copied duplicate in nav-pill.tsx.
 */
export const TRAINING_ROUTES: readonly string[] = TABS.map(t => t.href)

/** True when the employee tab bar belongs on `pathname`. */
export function isTrainingRoute(pathname: string): boolean {
  return TRAINING_ROUTES.some(r => pathname.startsWith(r))
}

export function EmployeeTabBar() {
  const pathname = usePathname()

  return (
    <nav
      data-employee-tab-bar
      className="font-headline fixed inset-x-0 bottom-0 z-40 border-t border-[#E5EEF5] bg-white/95 backdrop-blur dark:border-[#1F2429] dark:bg-[#0D0F12]/95"
    >
      <div className="mx-auto flex max-w-2xl">
        {TABS.map(tab => {
          const active =
            tab.href === '/dashboard/overview'
              ? pathname === tab.href
              : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-[#32C7FF]'
                  : 'text-[#8A8A8A] hover:text-[#0A0A0A] dark:text-[#7A8189] dark:hover:text-[#F5F7FA]'
              }`}
            >
              <Icon />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function OverviewIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  )
}

function TrainingIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l-4.5 2.6v-5.2L15 10z" />
      <rect x="3" y="4" width="18" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8" />
    </svg>
  )
}

function QuizzesIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}
