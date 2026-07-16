'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Row } from './row'

/**
 * Name editing, relocated from the account menu (which is now scoped to
 * dark mode + sign out). Same `auth.updateUser` call as before — this pass
 * only reskins the markup into the card/row layout (see Row), including
 * folding in the "Change password" link that used to live in the parent
 * page next to this card. State/handler logic is unchanged.
 */
export function NameSettings({ email, fullName }: { email: string; fullName: string | null }) {
  const router = useRouter()
  const [name, setName] = useState(fullName ?? '')
  const [draft, setDraft] = useState(fullName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name.trim()) return

    setSaving(true)
    setError(null)
    setSaved(false)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setName(trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave}>
      <Row>
        <label
          htmlFor="account-name"
          className="text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]"
        >
          Full name
        </label>
        <input
          id="account-name"
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Full name"
          className="w-full rounded-xl border border-[#E5EEF5] bg-white px-4 py-2.5 text-sm text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B7BF] focus:border-[#32C7FF] focus:ring-2 focus:ring-[#32C7FF]/30 sm:w-80 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
        />
      </Row>

      <Row last>
        <div>
          <span className="block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
            Account email
          </span>
          <p className="text-sm text-[#8A8A8A] dark:text-[#7A8189]">
            Used for sign-in and notifications.
          </p>
        </div>
        <p className="text-sm text-[#8A8A8A] sm:w-80 sm:text-right dark:text-[#7A8189]">{email}</p>
      </Row>

      {error && <p className="pt-4 text-sm text-[#DC2626]">{error}</p>}

      <div className="flex items-center justify-between pt-6">
        <Link href="/update-password" className="text-sm font-semibold text-[#0094FF] hover:underline">
          Change password
        </Link>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm font-semibold text-[#0094FF]">Saved</span>}
          <button
            type="submit"
            disabled={saving || !draft.trim() || draft.trim() === name.trim()}
            className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-white"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
