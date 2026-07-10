'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from './theme'

interface AccountMenuProps {
  email: string
  fullName: string | null
  /** Which side the dropdown panel aligns to. */
  anchor?: 'left' | 'right'
}

/**
 * Profile circle + click-to-open dropdown. Scoped to two actions only —
 * dark-mode toggle and sign out. Name and password changes live on
 * /dashboard/settings.
 *
 * Opening is click-only on purpose: a hover-opening dropdown sitting in the top
 * corner would pop open every time the cursor crossed the profile circle on its
 * way to the nav links beside it.
 */
export function AccountMenu({ email, fullName, anchor = 'left' }: AccountMenuProps) {
  const themeCtx = useTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const displayName = fullName?.trim() || email
  const initial = (fullName?.trim()[0] || email[0] || '?').toUpperCase()

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const isDark = themeCtx?.theme === 'dark'

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#32C7FF] text-base font-semibold text-white transition-shadow hover:shadow-[0_0_0_3px_rgba(50,199,255,0.3)] focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(50,199,255,0.45)]"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-14 z-50 w-56 overflow-hidden rounded-2xl border border-[#E5EEF5] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:border-[#1F2429] dark:bg-[#0D0F12] ${
            anchor === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {/* Identity header — not an action, but without it there's no way to
              tell which account is signed in once name editing moves away. */}
          <div className="border-b border-[#E5EEF5] px-4 py-3 dark:border-[#1F2429]">
            <p className="truncate text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
              {displayName}
            </p>
            <p className="truncate text-xs font-extralight text-[#8A8A8A] dark:text-[#7A8189]">
              {email}
            </p>
          </div>

          {themeCtx && (
            <button
              type="button"
              role="menuitemcheckbox"
              onClick={themeCtx.toggle}
              aria-checked={isDark}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#F5F7FA] dark:text-[#F5F7FA] dark:hover:bg-[#131A20]"
            >
              <span>Dark mode</span>
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  isDark ? 'bg-[#32C7FF]' : 'bg-[#E5EEF5] dark:bg-[#1F2429]'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left] ${
                    isDark ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          )}

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-3 text-left text-[13px] font-semibold text-[#DC2626] transition-colors hover:bg-[#F5F7FA] dark:hover:bg-[#131A20]"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
