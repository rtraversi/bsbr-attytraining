'use client'

import { useState } from 'react'
import { CHECKBOX, FIELD, MUTED, NOTICE, PILL_OFF, TABLE_HEAD } from './intake-styles'
import { rosterTrainingSeats, canAddTrainingSeat } from '@/lib/intake/branching'
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
  seatsPurchased: number | null
  adminName: string | null
  adminEmail: string
}) {
  // Seeded once. The admin's row is a starting point they can edit, not a fixed
  // header — an office manager filling this in for the firm may not be row one.
  // The most recent refusal, shown inline. Cleared by any successful change, so
  // it never lingers past the thing it was about.
  const [refusal, setRefusal] = useState<string | null>(null)

  const [rows] = useState<RosterRow[]>(() =>
    value.length > 0
      ? value
      : [{ name: adminName ?? '', email: adminEmail, isAttorney: false }],
  )
  const current = value.length > 0 ? value : rows

  const set = (i: number, patch: Partial<RosterRow>) =>
    onChange(current.map((r, n) => (n === i ? { ...r, ...patch } : r)))

  const remove = (i: number) =>
    onChange(current.length === 1 ? current : current.filter((_, n) => n !== i))

  const staffCount = rosterTrainingSeats(current)
  // null is "we could not read the seat count", not "zero seats". The screen
  // says nothing about seats it does not know, and refuses nothing — see
  // canAddTrainingSeat. Only the submit route refuses on an unknown count.
  const seatsLeft = seatsPurchased === null ? null : Math.max(0, seatsPurchased - staffCount)
  const canAddStaff = canAddTrainingSeat(current, seatsPurchased)

  // Two buttons, not one, because the distinction is the whole rule: attorneys
  // are unlimited and cost nothing, staff consume a purchased seat. A single
  // "Add someone" that silently refused every other click would look broken.
  const addStaff = () => {
    if (!canAddStaff) {
      // Only reachable with a known count — canAddTrainingSeat returns true on
      // null — but the narrowing has to be written down for the compiler.
      const seats = seatsPurchased ?? 0
      setRefusal(
        `You have ${seats} ${seats === 1 ? 'seat' : 'seats'} and ${staffCount} non-attorney staff on the roster. Adding another person who needs training means buying another seat first.`,
      )
      return
    }
    setRefusal(null)
    onChange([...current, { name: '', email: '', isAttorney: false }])
  }

  const addAttorney = () => {
    setRefusal(null)
    onChange([...current, { name: '', email: '', isAttorney: true }])
  }

  // Flipping someone from attorney to staff spends a seat, so it is capped by
  // the same rule as adding one. The other direction always frees one.
  const setAttorney = (i: number, isAttorney: boolean) => {
    if (!isAttorney && !canAddStaff) {
      const seats = seatsPurchased ?? 0
      setRefusal(
        `${current[i].name || 'That person'} would need a training seat, and all ${seats} are taken. Buy another seat to add them as staff.`,
      )
      return
    }
    setRefusal(null)
    set(i, { isAttorney })
  }

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
                      onChange={(e) => setAttorney(i, e.target.checked)}
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
        <button
          type="button"
          onClick={addStaff}
          disabled={!canAddStaff}
          className={`${PILL_OFF} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          + Add staff
        </button>
        <button type="button" onClick={addAttorney} className={PILL_OFF}>
          + Add attorney
        </button>
        <p className={`text-[13px] ${MUTED}`}>
          {current.length} {current.length === 1 ? 'person' : 'people'} · {staffCount} taking the
          training
          {seatsLeft !== null && (
            <>
              {' · '}
              {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left
            </>
          )}
        </p>
      </div>

      {/*
        🔴 The cap, reported at the moment it bites. Max reversed
        flag-never-block on 2026-08-26: the old banner promised "we will sort the
        extra out with you afterwards" and nobody owned that process, so it was a
        sentence with nothing behind it.

        Attorneys are deliberately not capped — they never consume a seat, so a
        firm of twelve partners and one paralegal buys one seat.
      */}
      {refusal && <p className={`mt-4 ${NOTICE}`}>{refusal}</p>}

    </div>
  )
}
