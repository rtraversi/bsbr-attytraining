'use client'

import { useState } from 'react'
import { ReminderSettings } from '../../_components/reminder-settings'
import { Row } from './row'

function NotificationToggle({
  field,
  initialChecked,
  label,
}: {
  field: 'notifyCertEarned' | 'notifyWeeklySummary'
  initialChecked: boolean
  label: string
}) {
  const [checked, setChecked] = useState(initialChecked)
  const [saving, setSaving] = useState(false)

  async function handleToggle() {
    const next = !checked
    setChecked(next) // optimistic — reverted on failure below
    setSaving(true)
    try {
      const res = await fetch('/api/firm/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next }),
      })
      if (!res.ok) setChecked(!next)
    } catch {
      setChecked(!next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={handleToggle}
      disabled={saving}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-[#0094FF]' : 'bg-[#E5EEF5] dark:bg-[#1F2429]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left] ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export function NotificationSettings({
  reminderDays,
  notifyCertEarned,
  notifyWeeklySummary,
}: {
  reminderDays: number
  notifyCertEarned: boolean
  notifyWeeklySummary: boolean
}) {
  return (
    <>
      <Row first>
        <div>
          <span className="block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
            Auto-reminder emails
          </span>
          <p className="text-sm text-[#8A8A8A] dark:text-[#7A8189]">
            Email staff who haven&apos;t completed training after this many days.
          </p>
        </div>
        <ReminderSettings initialDays={reminderDays} />
      </Row>

      <Row>
        <div>
          <span className="block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
            Team member certified
          </span>
          <p className="text-sm text-[#8A8A8A] dark:text-[#7A8189]">
            Get emailed when someone on your team passes and earns their certificate.
          </p>
        </div>
        <NotificationToggle
          field="notifyCertEarned"
          initialChecked={notifyCertEarned}
          label="Team member certified notifications"
        />
      </Row>

      <Row last>
        <div className="flex items-center gap-2">
          <span className="block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
            Weekly summary
          </span>
          <span className="rounded-md bg-[#EAF8FF] px-1.5 py-0.5 text-[10px] font-bold text-[#0094FF] dark:bg-[#0094FF]/15 dark:text-[#32C7FF]">
            New
          </span>
        </div>
        <NotificationToggle
          field="notifyWeeklySummary"
          initialChecked={notifyWeeklySummary}
          label="Weekly summary notifications"
        />
      </Row>
    </>
  )
}
