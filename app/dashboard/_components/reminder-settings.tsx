'use client'

import { useState } from 'react'

export function ReminderSettings({ initialDays }: { initialDays: number }) {
  const [days, setDays] = useState(initialDays)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = Number(e.target.value)
    setDays(val)
    setStatus('saving')
    try {
      const res = await fetch('/api/firm/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderDays: val }),
      })
      setStatus(res.ok ? 'saved' : 'error')
      if (res.ok) setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="reminder-days" className="sr-only">
        Auto-reminder after
      </label>
      <select
        id="reminder-days"
        value={days}
        onChange={handleChange}
        disabled={status === 'saving'}
        className="rounded-xl border border-[#E5EEF5] bg-white px-3 py-2 text-sm text-[#0A0A0A] outline-none transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 disabled:opacity-50 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
      >
        <option value={3}>3 days</option>
        <option value={7}>7 days</option>
        <option value={14}>14 days</option>
      </select>
      <span className="min-w-[3.5rem] text-xs">
        {status === 'saving' && <span className="text-[#8A8A8A] dark:text-[#7A8189]">Saving…</span>}
        {status === 'saved' && <span className="font-semibold text-[var(--brand-emphasis)]">Saved</span>}
        {status === 'error' && <span className="text-[#DC2626]">Failed</span>}
      </span>
    </div>
  )
}
