'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLink() {
  const pathname = usePathname()
  const onTraining = pathname.startsWith('/dashboard/training')

  return onTraining ? (
    <Link
      href="/dashboard"
      className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      ← Dashboard
    </Link>
  ) : (
    <Link
      href="/dashboard/training"
      className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      My Training
    </Link>
  )
}
