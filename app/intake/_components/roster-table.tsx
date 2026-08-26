'use client'

import { useState } from 'react'
import { CHECKBOX, FIELD, MUTED, NOTICE, PILL_OFF, TABLE_HEAD } from './intake-styles'
import { rosterTrainingSeats } from '@/lib/intake/branching'
import type { RosterRow } from '@/lib/intake/types'

/**
 * The roster: one screen with a table, not one question per person.
 *
 * Katy, 2026-08-25: "The intake needs to ask for the list of all parties,
 * attorneys and non attorneys." It replaces both the firm-size band and the
 * non-attorney headcount — asking those separately is exactly the duplication
 * she objected to, and the roster carries both facts and more besides.
 *
 * Row one is the signed-in admin, pre-filled from their account. Their own
 * attorney answer is what decides whether they occupy a seat.
 */
export function RosterTable({
  value,
  onChange,
  seatsPurchased,
  adminName,
  adminEmail,
}: {
  value: RosterRow[]
  onChange: (rows: RosterRow[]) => void
  seatsPurchased: number
  adminName: string | null
  adminEmail: string
}) {
  // Seeded once. The admin's row is a starting point they can edit, not a fixed
  // header — an office manager filling this in for the firm may not be row one.
  const [rows] = useState<RosterRow[]>(() =>
    value.length > 0
      ? value
      : [{ name: adminName ?? '', email: adminEmail, isAttorney: false }],
  )
  const current = value.length > 0 ? value : rows

  const set = (i: number, patch: Partial<RosterRow>) =>
    onChange(current.map((r, n) => (n === i ? { ...r, ...patch } : r)))

  const add = () => onChange([...current, { name: '', email: '', isAttorney: false }])

  const remove = (i: number) =>
    onChange(current.length === 1 ? current : current.filter((_, n) => n !== i))

  const staffCount = rosterTrainingSeats(current)
  const overSeats = seatsPurchased > 0 && staffCount > seatsPurchased

  return (
    <div className="mt-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className={TABLE_HEAD} style={{ width: '38%' }}>
                Name
                {/*
                  Captioned because it is now authoritative: staff no longer type
                  their own name at password-set, so whatever is typed here is
                  what the certificate says.
                */}
                <span className={`ml-2 font-normal normal-case tracking-normal ${MUTED}`}>
                  as it should appear on the certification
                </span>
              </th>
              <th className={TABLE_HEAD} style={{ width: '38%' }}>Email</th>
              <th className={TABLE_HEAD}>Attorney</th>
              <th className={TABLE_HEAD} aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {current.map((row, i) => (
              <tr key={i} className="align-middle">
                <td className="py-2 pr-3">
                  <input
                    className={FIELD}
                    value={row.name}
                    placeholder="Full name"
                    onChange={(e) => set(i, { name: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    className={FIELD}
                    type="email"
                    value={row.email}
                    placeholder="name@firm.com"
                    onChange={(e) => set(i, { email: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className={CHECKBOX}
                      checked={row.isAttorney}
                      onChange={(e) => set(i, { isAttorney: e.target.checked })}
                    />
                    <span className={row.isAttorney ? '' : MUTED}>
                      {row.isAttorney ? 'Attorney' : 'Staff'}
                    </span>
                  </label>
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={current.length === 1}
                    aria-label={`Remove row ${i + 1}`}
                    className={`text-lg leading-none disabled:opacity-30 ${MUTED}`}
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={add} className={PILL_OFF}>
          + Add someone
        </button>
        <p className={`text-[13px] ${MUTED}`}>
          {current.length} {current.length === 1 ? 'person' : 'people'} · {staffCount} taking the
          training
        </p>
      </div>

      {/*
        Flagged, never blocked (Max, 2026-08-26). A firm that has grown since it
        paid should be able to finish the intake and sort the billing out
        afterwards; stopping them here would strand the whole policy on a seat
        count. The same flag appears again on the way out, at Send.
      */}
      {overSeats && (
        <p className={`mt-4 ${NOTICE}`}>
          {staffCount} non-attorney staff need training and you have {seatsPurchased}{' '}
          {seatsPurchased === 1 ? 'seat' : 'seats'}. You can finish the intake — we will sort the
          extra {staffCount - seatsPurchased} out with you afterwards.
        </p>
      )}
    </div>
  )
}
