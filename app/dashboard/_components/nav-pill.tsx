'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AccountMenu } from './account-menu'

interface NavPillProps {
  email: string
  fullName: string | null
  firmName: string | null
  role: string | null
}

/** The three routes that make up the training experience (the bottom tab bar's sub-nav). */
const TRAINING_ROUTES = ['/dashboard/overview', '/dashboard/training', '/dashboard/quizzes']

/**
 * Unified overhead nav, shared by the admin and employee shells. Profile circle
 * and firm name on the left, section links always visible to their right.
 *
 * The tabs used to collapse to just the profile circle and unfurl on hover, but
 * the first real user to see it cold couldn't find any navigation at all — a
 * bare avatar reads as decoration, not a menu. So the tabs are now always shown
 * (Katy's testing, 2026-07-10). On a narrow screen the tab row scrolls
 * internally rather than pushing the whole page sideways; the firm name hides
 * below `sm` so the links keep priority for the space.
 *
 * Separate from EmployeeTabBar: this switches app sections, that one navigates
 * within the training area.
 */
export function NavPill({ email, fullName, firmName, role }: NavPillProps) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'

  // Admins aren't routed through /dashboard/overview — it redirects non-employees
  // back to /dashboard. /dashboard/training has no role gate, so it's their entry.
  const trainingHref = isAdmin ? '/dashboard/training' : '/dashboard/overview'

  const links = [
    ...(isAdmin
      ? [{ href: '/dashboard', label: 'Dashboard', active: pathname === '/dashboard' }]
      : []),
    {
      href: trainingHref,
      label: 'Training',
      active: TRAINING_ROUTES.some(r => pathname.startsWith(r)),
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      active: pathname.startsWith('/dashboard/settings'),
    },
    {
      href: '/dashboard/support',
      label: 'Support',
      active: pathname.startsWith('/dashboard/support'),
    },
  ]

  const pillBase =
    'rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:px-5 sm:py-2.5 sm:text-sm'
  const pillIdle =
    'bg-[#F5F7FA] text-[#8A8A8A] hover:text-[#0094FF] dark:bg-[#131A20] dark:text-[#7A8189] dark:hover:text-[#32C7FF]'
  const pillActive = 'bg-black text-white dark:bg-[#F5F7FA] dark:text-[#0A0A0A]'

  return (
    <nav className="flex max-w-full">
      <div className="relative inline-flex max-w-full items-center rounded-full bg-white p-1.5 shadow-[0_1px_2px_rgba(10,10,10,0.04)] transition-shadow hover:shadow-[0_6px_20px_rgba(10,10,10,0.10)] dark:bg-[#0D0F12] dark:shadow-none dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.5)]">
        <AccountMenu email={email} fullName={fullName} anchor="left" />

        {/* Always visible. min-w-0 + overflow-x-auto lets the row shrink and
            scroll within the pill on a narrow screen instead of pushing the whole
            page sideways. */}
        <div className="ml-2.5 flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Hidden below sm: on a phone the firm name alone eats the pill's width
              and pushes the nav links out of reach — the links win the space. */}
          {firmName && (
            <span
              className={`${pillBase} font-headline hidden shrink-0 bg-[#F5F7FA] font-bold text-[#0094FF] sm:inline-flex dark:bg-[#131A20] dark:text-[#32C7FF]`}
            >
              {firmName}
            </span>
          )}

          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.active ? 'page' : undefined}
              className={`${pillBase} shrink-0 ${link.active ? pillActive : pillIdle}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
