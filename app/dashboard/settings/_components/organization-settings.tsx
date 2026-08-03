'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Row } from './row'

export function OrganizationSettings({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [draft, setDraft] = useState(initialName)
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

    try {
      const res = await fetch('/api/firm/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = (await res.json()) as { error?: string }
      setSaving(false)

      if (!res.ok) {
        setError(data.error ?? 'Save failed. Please try again.')
        return
      }

      setName(trimmed)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } catch {
      setSaving(false)
      setError('Network error. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSave}>
      <Row first last>
        <div>
          <label
            htmlFor="org-name"
            className="block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]"
          >
            Organization name
          </label>
          <p className="text-sm text-[#8A8A8A] dark:text-[#7A8189]">
            Shown to your team and on certificates.
          </p>
        </div>
        <input
          id="org-name"
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Your firm's name"
          className="w-full rounded-xl border border-[#E5EEF5] bg-white px-4 py-2.5 text-sm text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B7BF] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 sm:w-80 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
        />
      </Row>

      {error && <p className="pt-4 text-sm text-[#DC2626]">{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-6">
        {saved && <span className="text-sm font-semibold text-[var(--brand-emphasis)]">Saved</span>}
        <button
          type="submit"
          disabled={saving || !draft.trim() || draft.trim() === name.trim()}
          className="w-full rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-white"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
