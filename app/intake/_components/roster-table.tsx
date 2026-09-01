'use client'

import { useState } from 'react'
import { FIELD, MUTED, NOTICE, PILL_OFF, TABLE_HEAD } from './intake-styles'
import { rosterTrainingSeats, canAddTrainingSeat } from '@/lib/intake/branching'
import type { RosterRow } from '@/lib/intake/types'

/**
 * Attorney / staff, as a switch.
 *
 * It was a tick box until 2026-08-28. The problem was not the control, it was
 * what unticked MEANT: nothing on screen said that leaving it alone put the
 * person on a paid seat, so the cheap answer and the expensive one looked
 * identical and the expensive one was the default. That is the same defect the
 * invite dialog's attorney checkbox had, and it was fixed there the same week
 * by making the firm choose (074d414).
 *
 * A switch fixes the readability half: it has a visible travel and a filled
 * state, so "on" is something you can see across a table of eight rows. The
 * label beside it names the OFF state as well — "Staff" — because that is the
 * one with a cost, and a switch that only names what it is when it is on leaves
 * the consequence unwritten.
 *
 * `role="switch"` with the person's name in the accessible label. The visible
 * text is what tells a sighted user which way round it is; aria-checked carries
 * the same fact for everyone else.
 */
function AttorneyToggle({
  isAttorney,
  onChange,
  label,
}: {
  isAttorney: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={isAttorney}
        aria-label={`${label} is an attorney`}
        onClick={() => onChange(!isAttorney)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-emphasis)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0D0F12] ${
          isAttorney
            ? 'bg-[var(--brand-emphasis)]'
            : 'bg-[#E5EEF5] dark:bg-[#1F2429]'
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200 dark:bg-[#0D0F12] ${
            isAttorney ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
      {/* Not a <label>: the switch is a button, and the text names whichever
          state it is in rather than naming the control. */}
      <span aria-hidden className={`text-[13px] ${isAttorney ? 'font-semibold' : MUTED}`}>
        {isAttorney ? 'Attorney' : 'Staff'}
      </span>
    </div>
  )
}

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

  // 🔴 ROW ONE DEFAULTS TO ATTORNEY (Max, 2026-08-27). It defaulted to staff,
  // which put the buyer on a paid seat before they had said anything — and the
  // buyer is the attorney in most firms this is sold to, so the default was
  // both the less likely answer and the more expensive one.
  //
  // Every row added afterwards defaults to staff, which is what "+ Add staff"
  // does; "+ Add attorney" is the deliberate exception beside it. Two buttons
  // rather than one default, for the reason recorded at addStaff below.
  //
  // It also lines the roster up with what the firm already is: the Stripe
  // webhook writes the admin's own firm_members row with occupies_seat false
  // for exactly this reason (provisionFirm, route.ts).
  const [rows] = useState<RosterRow[]>(() =>
    value.length > 0
      ? value
      : [{ name: adminName ?? '', email: adminEmail, isAttorney: true }],
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
                  <AttorneyToggle
                    isAttorney={row.isAttorney}
                    onChange={(next) => setAttorney(i, next)}
                    label={row.name || row.email || `Row ${i + 1}`}
                  />
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
