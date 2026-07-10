'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from './theme'

interface AccountMenuProps {
  email: string
  fullName: string | null
  role: string | null
  /** Firm the user belongs to — shown under the email in the identity header. */
  firmName: string | null
  /** Which side the dropdown panel aligns to. Employee shell = left, admin = right. */
  anchor?: 'left' | 'right'
  /** Show the light/dark theme toggle (employee themed shell only). */
  showTheme?: boolean
  /** Show relocated legal links (footer is removed from the employee shell). */
  showLegal?: boolean
}

/**
 * Compact hoverable/clickable profile dropdown (Claude-desktop-style panel, not a
 * persistent sidebar). Account actions + optional theme toggle and legal links.
 * Theme-aware: white panel in light mode, #0D0F12 in dark.
 */
export function AccountMenu({
  email,
  fullName,
  role,
  firmName,
  anchor = 'right',
  showTheme = false,
  showLegal = false,
}: AccountMenuProps) {
  const router = useRouter()
  const themeCtx = useTheme()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(fullName ?? '')
  const [draft, setDraft] = useState(fullName ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const displayName = name.trim() || email
  const initial = (name.trim()[0] || email[0] || '?').toUpperCase()

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const close = useCallback(() => {
    clearCloseTimer()
    setOpen(false)
    setEditing(false)
    setError(null)
    setDraft(name)
  }, [name, clearCloseTimer])

  const handleEnter = useCallback(() => {
    clearCloseTimer()
    setOpen(true)
  }, [clearCloseTimer])

  const handleLeave = useCallback(() => {
    if (editing) return
    clearCloseTimer()
    closeTimer.current = setTimeout(close, 200)
  }, [editing, close, clearCloseTimer])

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

  useEffect(() => clearCloseTimer, [clearCloseTimer])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name.trim()) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setName(trimmed)
    setEditing(false)
    router.refresh()
  }

  const itemClass =
    'block w-full px-4 py-2 text-left text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#EAF8FF] dark:text-[#F5F7FA] dark:hover:bg-[#131A20]'
  const dividerClass = 'my-1 border-t border-[#E5EEF5] dark:border-[#1F2429]'

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="font-headline relative"
    >
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#32C7FF] text-sm font-semibold text-white transition-shadow hover:shadow-[0_0_0_3px_rgba(50,199,255,0.3)] focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(50,199,255,0.45)]"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#E5EEF5] bg-white shadow-xl dark:border-[#1F2429] dark:bg-[#0D0F12] ${
            anchor === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {/* Identity header */}
          <div className="border-b border-[#E5EEF5] px-4 py-3 dark:border-[#1F2429]">
            <p className="truncate text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
              {displayName}
            </p>
            <p className="truncate text-xs font-extralight text-[#8A8A8A] dark:text-[#7A8189]">
              {email}
            </p>
            {firmName && (
              <p className="mt-0.5 truncate text-[11px] font-extralight text-[#AEB4BB] dark:text-[#5C636B]">
                {firmName}
              </p>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="px-4 py-3">
              <label
                htmlFor="account-name"
                className="mb-1 block text-xs font-medium text-[#8A8A8A] dark:text-[#7A8189]"
              >
                Update your name
              </label>
              <input
                id="account-name"
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                autoFocus
                placeholder="Full name"
                className="w-full rounded-lg border border-[#E5EEF5] bg-white px-3 py-2 text-sm font-extralight text-[#0A0A0A] outline-none focus:border-[#32C7FF] focus:ring-2 focus:ring-[#32C7FF]/30 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
              />
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#32C7FF] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setError(null)
                    setDraft(name)
                  }}
                  className="text-xs font-medium text-[#8A8A8A] hover:text-[#0A0A0A] dark:hover:text-[#F5F7FA]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  clearCloseTimer()
                  setDraft(name)
                  setEditing(true)
                }}
                className={itemClass}
              >
                Update your name
              </button>

              <Link href="/update-password" role="menuitem" onClick={close} className={itemClass}>
                Change password
              </Link>

              {role === 'admin' && (
                <a href="/api/portal" role="menuitem" className={itemClass}>
                  Manage billing
                </a>
              )}

              {showTheme && themeCtx && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={themeCtx.toggle}
                  className={`flex w-full items-center justify-between ${itemClass}`}
                >
                  <span>Theme</span>
                  <span className="flex items-center gap-1.5 text-xs font-extralight text-[#8A8A8A] dark:text-[#7A8189]">
                    {themeCtx.theme === 'dark' ? <MoonIcon /> : <SunIcon />}
                    {themeCtx.theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>
              )}

              {showLegal && (
                <>
                  <div className={dividerClass} />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-2 text-xs font-extralight text-[#8A8A8A] dark:text-[#7A8189]">
                    <Link href="/privacy" onClick={close} className="hover:text-[#0094FF]">
                      Privacy Policy
                    </Link>
                    <Link href="/terms" onClick={close} className="hover:text-[#0094FF]">
                      Terms of Service
                    </Link>
                    <Link href="/dpa" onClick={close} className="hover:text-[#0094FF]">
                      Cookies
                    </Link>
                  </div>
                </>
              )}

              <div className={dividerClass} />

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left text-sm font-medium text-[#0094FF] transition-colors hover:bg-[#EAF8FF] dark:hover:bg-[#131A20]"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SunIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  )
}
