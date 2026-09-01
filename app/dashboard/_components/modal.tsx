'use client'

import { useEffect, useRef } from 'react'

/**
 * The backdrop-and-card shell, once.
 *
 * ⚠️ This is NOT the start of a component library — the repo deliberately has
 * none and style constants live per file. It exists because the Invitations
 * dialogs took the count of hand-rolled backdrops in this folder to four
 * (cert-preview-modal, resend-invite-modal, and the two here), and by four the
 * copies had already drifted: only one of them closed on Escape, and none of
 * them told a screen reader they were a dialog at all.
 *
 * cert-preview-modal and resend-invite-modal can adopt this whenever either is
 * next touched. They were left alone here so this change stays about the
 * Invitations card.
 *
 * `busy` freezes the exits — backdrop click and Escape — while a request is in
 * flight, so a dialog cannot be dismissed out from under a send it started.
 */
export function Modal({
  title,
  description,
  onClose,
  busy = false,
  wide = false,
  children,
}: {
  title: string
  /** Rendered under the title. A node, not a string — some carry an address. */
  description?: React.ReactNode
  onClose: () => void
  busy?: boolean
  /** The CSV guide is a page of instructions; the invite question is a choice. */
  wide?: boolean
  children: React.ReactNode
}) {
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  // Move focus into the dialog on open, so a keyboard user is not left behind on
  // the trigger with the dialog's content unreachable above them.
  useEffect(() => {
    card.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-2xl border border-[#E5EEF5] bg-white p-6 shadow-2xl outline-none dark:border-[#1F2429] dark:bg-[#0D0F12] ${
          wide ? 'max-w-lg' : 'max-w-md'
        }`}
      >
        <h2 className="text-lg font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">{title}</h2>
        {description && (
          <div className="mt-1 text-xs leading-relaxed text-[#8A8A8A] dark:text-[#7A8189]">
            {description}
          </div>
        )}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

/** Cancel + confirm, the pair every dialog in here ends with. */
export function ModalActions({
  onCancel,
  busy,
  confirmLabel,
  busyLabel,
  disabled,
  onConfirm,
}: {
  onCancel: () => void
  busy: boolean
  confirmLabel: string
  busyLabel: string
  disabled?: boolean
  /** Omitted when the confirm is a submit button inside a <form>. */
  onConfirm?: () => void
}) {
  return (
    <div className="flex gap-3 pt-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="flex-1 rounded-full border border-[#E5EEF5] bg-[#F2F4F7] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#E5EEF5] disabled:opacity-50 dark:border-[#1F2429] dark:bg-[#131A20] dark:text-[#F5F7FA] dark:hover:bg-[#1F2429]"
      >
        Cancel
      </button>
      <button
        type={onConfirm ? 'button' : 'submit'}
        onClick={onConfirm}
        disabled={busy || disabled}
        className="flex-1 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
      >
        {busy ? busyLabel : confirmLabel}
      </button>
    </div>
  )
}
