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
      <label className="text-xs text-zinc-500 whitespace-nowrap" htmlFor="reminder-days">
        Auto-reminder after
      </label>
      <select
        id="reminder-days"
        value={days}
        onChange={handleChange}
        disabled={status === 'saving'}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
      >
        <option value={3}>3 days</option>
        <option value={7}>7 days</option>
        <option value={14}>14 days</option>
      </select>
      <span className="text-xs min-w-[3.5rem]">
        {status === 'saving' && <span className="text-zinc-500">Saving…</span>}
        {status === 'saved'  && <span className="text-teal-400">Saved</span>}
        {status === 'error'  && <span className="text-red-400">Failed</span>}
      </span>
    </div>
  )
}
