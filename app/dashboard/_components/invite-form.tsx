'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from './toast-provider'
import { Modal, ModalActions } from './modal'

/**
 * The Invitations card's single-invite half: an address and a button.
 *
 * ── Why the attorney question is a dialog and not a checkbox ────────────────
 *
 * It was a checkbox sitting between the field and the button, reading "This
 * person is an attorney (no staff seat required)". Three problems, and only the
 * first was cosmetic:
 *
 *   1. It crowded a small card. Max, 2026-08-27: the card had everything
 *      "clunked in there". Field, checkbox, button, CSV button, CSV format
 *      hint, seat warning and an out-of-seats disclosure, all in one tile.
 *   2. UNCHECKED IS AN ANSWER, AND IT IS THE EXPENSIVE ONE. Not ticking the box
 *      spends a seat. A control whose default has a billing consequence, on a
 *      firm capped at the seats it bought, is a control that spends money by
 *      being ignored. The dialog has no default: neither option is preselected
 *      and Send stays disabled until one is chosen.
 *   3. It had no room to say what either answer means. "No staff seat required"
 *      is the only consequence that fitted, and it is not the only one —
 *      attorneys are also not issued a certificate, which an admin choosing
 *      between the two would want to know before choosing.
 *
 * The dialog is the space to say all of it, which is the point of moving it.
 */
export function InviteForm({ seatsRemaining }: { seatsRemaining: number }) {
  const router = useRouter()
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [asking, setAsking] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'loading'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [devLink, setDevLink] = useState<string | undefined>()

  // Submitting the form no longer sends anything — it asks the question. The
  // send happens from the dialog, once the firm has said which kind of person
  // this is.
  const ask = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setDevLink(undefined)
    setAsking(true)
  }

  const send = async (isAttorney: boolean) => {
    setPhase('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, isAttorney }),
      })
      const data = (await res.json()) as { error?: string; devLink?: string; emailSent?: boolean }

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong.')
        setPhase('idle')
        return
      }

      // A 200 with emailSent: false means the member and their seat are real but
      // the invite email didn't go out. Saying "Invite sent" there is how a
      // broken Resend key stayed invisible for days — say both halves. The row
      // is badged "Invite not delivered" on the team table until a resend works.
      const sentEmail = email
      const emailSent = data.emailSent !== false
      setDevLink(data.devLink)
      setEmail('')
      setPhase('idle')
      setAsking(false)
      router.refresh() // Re-fetch server data so the member list + seat count update
      addToast(
        emailSent
          ? `Invite sent to ${sentEmail}`
          : `${sentEmail} was added, but the invite email couldn’t be sent.`,
      )
    } catch {
      setErrorMsg('Network error. Please try again.')
      setPhase('idle')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={ask} className="flex flex-col gap-2">
        <input
          type="email"
          required
          placeholder="employee@yourfirm.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-full border border-[#E5EEF5] bg-white px-4 py-3 text-sm text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B7BF] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
        />
        <button
          type="submit"
          className="w-full rounded-full bg-black py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-white"
        >
          Invite by email
        </button>
      </form>

      {/* Kept on the card rather than in the dialog: the dialog is gone by the
          time this is true, and a failure with no visible trace is how the dead
          Resend key hid for days. */}
      {errorMsg && !asking && <p className="text-sm text-[#DC2626]">{errorMsg}</p>}

      {devLink && (
        <div className="rounded-xl border border-[#FDE8B8] bg-[#FFF7E6] p-2.5">
          <p className="mb-1 font-mono text-[10px] text-[#B45309]">DEV — invite link (email not sent):</p>
          <a href={devLink} className="break-all text-[10px] text-[#B45309] underline hover:opacity-80">
            {devLink}
          </a>
        </div>
      )}

      {asking && (
        <InviteKindDialog
          email={email}
          seatsRemaining={seatsRemaining}
          busy={phase === 'loading'}
          error={errorMsg}
          onCancel={() => setAsking(false)}
          onSend={send}
        />
      )}
    </div>
  )
}

/**
 * "Is this person an attorney?" — asked once, with both consequences on screen.
 *
 * 🔴 NOTHING IS PRESELECTED. Staff is the expensive answer and was the old
 * checkbox's default; making it the default here would move the defect rather
 * than remove it. Send is disabled until the firm actually says.
 */
function InviteKindDialog({
  email,
  seatsRemaining,
  busy,
  error,
  onCancel,
  onSend,
}: {
  email: string
  seatsRemaining: number
  busy: boolean
  error: string
  onCancel: () => void
  onSend: (isAttorney: boolean) => void
}) {
  const [kind, setKind] = useState<'staff' | 'attorney' | null>(null)
  const full = seatsRemaining <= 0

  return (
    <Modal
      title="Who are you inviting?"
      description={
        <>
          We ask because it decides whether this invite uses one of your seats.{' '}
          <span className="font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">{email}</span>
        </>
      }
      onClose={onCancel}
      busy={busy}
    >
      <div className="flex flex-col gap-2.5">
        <KindOption
          selected={kind === 'staff'}
          disabled={full}
          onSelect={() => setKind('staff')}
          label="A staff member"
          detail={
            full ? (
              // The seat cap is real and refuses at the server too (0026 /
              // lib/seats.ts), so this says what is true rather than letting them
              // press Send into a refusal.
              <>
                <span className="font-semibold text-[#B45309] dark:text-[#F0B357]">
                  Your staff seats are full.
                </span>{' '}
                <a
                  href="/api/portal"
                  className="font-semibold underline underline-offset-2 hover:opacity-80"
                >
                  Add seats in Billing
                </a>{' '}
                to invite another staff member. You can still invite attorneys.
              </>
            ) : (
              <>
                <span className="font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
                  Uses one seat.
                </span>{' '}
                You have {seatsRemaining} staff {seatsRemaining === 1 ? 'seat' : 'seats'} left.
                They take the training and are issued a certificate when they pass.
              </>
            )
          }
        />

        <KindOption
          selected={kind === 'attorney'}
          onSelect={() => setKind('attorney')}
          label="An attorney"
          detail={
            <>
              <span className="font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
                Free — uses no seat.
              </span>{' '}
              Attorneys are unlimited. They can take the training, but no certificate is issued
              for them.
            </>
          }
        />
      </div>

      {error && <p className="mt-4 text-xs text-[#DC2626] dark:text-[#F87171]">{error}</p>}

      <div className="mt-5">
        <ModalActions
          onCancel={onCancel}
          busy={busy}
          disabled={kind === null}
          confirmLabel="Send invite"
          busyLabel="Sending…"
          onConfirm={() => kind && onSend(kind === 'attorney')}
        />
      </div>
    </Modal>
  )
}

function KindOption({
  selected,
  disabled = false,
  onSelect,
  label,
  detail,
}: {
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  label: string
  detail: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      // Not `disabled`: the staff option at zero seats still has to be readable
      // and reachable, because it carries the Billing link that fixes it — and a
      // disabled button is neither focusable nor a reliable click target.
      className={`rounded-xl border p-4 text-left transition-colors ${
        disabled
          ? 'cursor-default border-[#E5EEF5] bg-[#FAFBFC] dark:border-[#1F2429] dark:bg-[#0A0C0E]'
          : selected
            ? 'border-[var(--brand-emphasis)] bg-[#EAF6FF] dark:border-[var(--brand-primary)] dark:bg-[var(--brand-emphasis)]/10'
            : 'cursor-pointer border-[#E5EEF5] hover:border-[var(--brand-emphasis)] dark:border-[#1F2429] dark:hover:border-[var(--brand-primary)]'
      }`}
    >
      <span
        className={`block text-sm font-bold ${
          disabled
            ? 'text-[#8A8A8A] dark:text-[#7A8189]'
            : 'text-[#0A0A0A] dark:text-[#F5F7FA]'
        }`}
      >
        {label}
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-[#8A8A8A] dark:text-[#7A8189]">
        {detail}
      </span>
    </button>
  )
}
