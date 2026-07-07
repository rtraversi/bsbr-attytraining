'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AccountMenuProps {
  email: string
  fullName: string | null
  role: string | null
}

/**
 * Profile/account dropdown in the dashboard nav — replaces the old plain
 * "Sign out" link and also hosts the Dashboard ⇄ Training switch. Opens on
 * hover (with a small close delay so crossing the gap to the panel, or a brief
 * exit, doesn't snap it shut) and on click/keyboard for touch + a11y.
 * Role-conditional (admins also get "Manage billing"). Styled to today's
 * Athena system (Stack Sans via .font-headline, #32C7FF / #0094FF).
 */
export function AccountMenu({ email, fullName, role }: AccountMenuProps) {
  const router = useRouter()
  const pathname = usePathname()
  const onTraining = pathname.startsWith('/dashboard/training')

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

  // Hover: open immediately, close after a short grace period. Never auto-close
  // while the name is being edited (mouse can wander off the small input).
  const handleEnter = useCallback(() => {
    clearCloseTimer()
    setOpen(true)
  }, [clearCloseTimer])

  const handleLeave = useCallback(() => {
    if (editing) return
    clearCloseTimer()
    closeTimer.current = setTimeout(close, 200)
  }, [editing, close, clearCloseTimer])

  // Close on outside-click or Escape.
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

  // Clean up any pending timer on unmount.
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
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    })
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setName(trimmed)
    setEditing(false)
    // Re-render server components (dashboard table, certs) with the new name.
    router.refresh()
  }

  const itemClass =
    'block w-full px-4 py-2 text-left text-sm text-[#0A0A0A] transition-colors hover:bg-[#EAF8FF]'

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
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#E5EEF5] bg-white shadow-xl"
        >
          {/* Identity header */}
          <div className="border-b border-[#E5EEF5] px-4 py-3">
            <p className="truncate text-sm font-semibold text-[#0A0A0A]">{displayName}</p>
            <p className="truncate text-xs text-[#8A8A8A]">{email}</p>
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="px-4 py-3">
              <label htmlFor="account-name" className="mb-1 block text-xs font-medium text-[#8A8A8A]">
                Update your name
              </label>
              <input
                id="account-name"
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                autoFocus
                placeholder="Full name"
                className="w-full rounded-lg border border-[#E5EEF5] px-3 py-2 text-sm text-[#0A0A0A] outline-none focus:border-[#32C7FF] focus:ring-2 focus:ring-[#32C7FF]/30"
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
                  className="text-xs font-medium text-[#8A8A8A] hover:text-[#0A0A0A]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="py-1">
              {/* Dashboard ⇄ Training switch */}
              <Link
                href={onTraining ? '/dashboard' : '/dashboard/training'}
                role="menuitem"
                onClick={close}
                className={itemClass}
              >
                {onTraining ? '← Dashboard' : 'My Training →'}
              </Link>

              <div className="my-1 border-t border-[#E5EEF5]" />

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

              <div className="my-1 border-t border-[#E5EEF5]" />

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left text-sm text-[#0094FF] transition-colors hover:bg-[#EAF8FF]"
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
