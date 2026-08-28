'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BTN, MUTED, NOTICE } from './intake-styles'
import type { ReviewSection } from '@/lib/intake/review'

/**
 * A submitted intake, read back to the firm that gave it.
 *
 * ONE component, two callers: the /intake page after Send, and the Settings
 * heading spec'd on 2026-08-27. They are the same screen — the questions as
 * asked and the answers as given — and building them twice is how they drift
 * into two different accounts of the same firm's answers.
 *
 * 🔴 The sensitive answers are filtered in lib/intake/review.ts, not here. This
 * component renders whatever it is handed; the rule lives one level down where
 * it cannot be forgotten by a third caller. See that file's header.
 *
 * ── The four states ─────────────────────────────────────────────────────────
 *
 *   editable   not this component's job — the page renders IntakeClient.
 *   submitted  read-only, plus Reopen. Katy has it but has not delivered.
 *   delivered  read-only, no Reopen. The policy is written; changing the
 *              answers it came from would make the record disagree with the
 *              document.
 *   purged     nothing to show, and it SAYS SO. The spec is explicit: "It
 *              should say so plainly rather than rendering an empty page."
 */
export type ReviewState = 'submitted' | 'delivered' | 'purged'

export interface IntakeReviewProps {
  state: ReviewState
  sections: ReviewSection[]
  submittedAt: string | null
  deliveredAt: string | null
  reopenedCount: number
  /** Settings renders inside a card that already has a heading; /intake does not. */
  heading?: string
}

/**
 * 🔴 FORMATTED IN UTC, DELIBERATELY.
 *
 * `policy_delivered_at` is set by hand when Katy says the policy has gone out,
 * so it arrives as a calendar date at midnight UTC. Formatted in local time west
 * of Greenwich that renders as THE DAY BEFORE — a stored 2026-09-01T00:00:00Z
 * printed "August 31, 2026" on this screen before this line existed.
 *
 * Same class of bug the certificate proof hit on 2026-08-25 (`new Date(
 * '2026-08-25')` printing August 24), which is why it is worth a comment rather
 * than a quiet option: it is invisible in any timezone at or east of UTC, so it
 * survives review by anyone who is not looking for it.
 *
 * UTC also keeps the two dates on this screen agreeing with each other and with
 * the operator's own record. `submitted_at` is a real instant, so this can move
 * it by a day for a late-evening submission — the lesser error, and the one that
 * does not make the firm's own delivery date wrong every single time.
 */
const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : null

export function IntakeReview({
  state,
  sections,
  submittedAt,
  deliveredAt,
  reopenedCount,
  heading,
}: IntakeReviewProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reopen() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/intake/reopen', { method: 'POST' })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'That did not go through. Try again in a moment.')
        return
      }
      // The server decides which screen this is, so hand it back rather than
      // swapping the UI here — the page re-renders as the editable intake.
      router.refresh()
    } catch {
      setError('That did not go through. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'purged') {
    return (
      <section>
        {heading && <h2 className="mb-2 text-lg font-semibold">{heading}</h2>}
        <p className={`text-[14.5px] leading-relaxed ${MUTED}`}>
          Your answers were deleted after your policy was delivered, which is how the intake is
          meant to end — we keep the policy, not the questionnaire behind it. The record that you
          completed an intake{submittedAt ? ` on ${date(submittedAt)}` : ''} and received a policy
          {deliveredAt ? ` on ${date(deliveredAt)}` : ''} is kept; the answers themselves are gone.
        </p>
      </section>
    )
  }

  return (
    <section>
      {heading && <h2 className="mb-2 text-lg font-semibold">{heading}</h2>}

      <p className={`text-[14.5px] leading-relaxed ${MUTED}`}>
        {state === 'delivered' ? (
          <>
            Your policy was delivered{deliveredAt ? ` on ${date(deliveredAt)}` : ''}. These are the
            answers it was written from, kept until they are deleted.
          </>
        ) : (
          <>
            Submitted{submittedAt ? ` on ${date(submittedAt)}` : ''} and with the attorney drafting
            your policy. These are the answers as you gave them.
          </>
        )}
      </p>

      {state === 'submitted' && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className={BTN} onClick={() => void reopen()} disabled={busy}>
            {busy ? 'Reopening…' : 'Reopen to make changes'}
          </button>
          <p className={`max-w-[30rem] text-[13px] leading-relaxed ${MUTED}`}>
            {/* Says the cost before they press it. An attorney may already be
                reading these answers, and a firm that changes them without
                knowing that is the case this whole feature has to handle
                honestly. */}
            You can change any answer until your policy is delivered. Send it again when you are
            done — the attorney is told it changed.
          </p>
        </div>
      )}

      {error && <p className={`mt-4 ${NOTICE}`}>{error}</p>}

      {reopenedCount > 0 && (
        <p className={`mt-4 text-[13px] ${MUTED}`}>
          Reopened {reopenedCount} {reopenedCount === 1 ? 'time' : 'times'} since it was first sent.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <div key={section.section}>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-emphasis)]">
              {section.label}
            </h3>
            <dl className="space-y-4">
              {section.items.map((item) => (
                <div key={item.key} className="border-b border-[#E5EEF5] pb-4 last:border-0 dark:border-[#1F2429]">
                  <dt className={`text-[13px] ${MUTED}`}>{item.prompt}</dt>
                  <dd className="mt-1 text-[14.5px] font-semibold">
                    {item.answer === null ? (
                      // An optional question they passed on. Shown rather than
                      // dropped: hiding it would rewrite their intake into one
                      // where the question was never put.
                      <span className={`font-normal ${MUTED}`}>Not answered</span>
                    ) : (
                      // Rosters and tool grids are multi-line by construction.
                      <span className="whitespace-pre-line">{item.answer}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}
