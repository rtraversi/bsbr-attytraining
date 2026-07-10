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
 * Unified overhead nav, shared by the admin and employee shells. Collapsed to
 * just the profile circle at rest; hovering unfurls the firm name and section
 * links.
 *
 * The hover target is the whole pill, not the circle: once unfurled, the links
 * sit to the right of the circle, so a circle-only trigger would un-hover — and
 * slam the pill shut — the moment the mouse moved toward a link. `group` wraps
 * circle + reveal together so the boundary covers both.
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
      <div className="group relative inline-flex max-w-full items-center rounded-full bg-white p-1.5 dark:bg-[#0D0F12]">
        <AccountMenu email={email} fullName={fullName} anchor="left" />

        {/* Collapsed to zero width at rest. focus-within keeps it keyboard-reachable.
            The expanded cap is clamped to the viewport so a narrow screen scrolls the
            pill internally rather than pushing the whole page sideways. */}
        <div className="ml-0 flex max-w-0 items-center gap-2 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,margin-left] duration-300 ease-out [scrollbar-width:none] group-hover:ml-2.5 group-hover:max-w-[min(900px,calc(100vw_-_7.5rem))] group-hover:overflow-x-auto group-hover:opacity-100 group-focus-within:ml-2.5 group-focus-within:max-w-[min(900px,calc(100vw_-_7.5rem))] group-focus-within:overflow-x-auto group-focus-within:opacity-100 motion-reduce:transition-none">
          {/* Hidden below sm: on a phone the firm name alone fills the clamped pill
              and pushes every nav link out of view. */}
          {firmName && (
            <span
              className={`${pillBase} font-headline hidden bg-[#F5F7FA] font-bold text-[#0094FF] sm:inline-flex dark:bg-[#131A20] dark:text-[#32C7FF]`}
            >
              {firmName}
            </span>
          )}

          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.active ? 'page' : undefined}
              className={`${pillBase} ${link.active ? pillActive : pillIdle}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
