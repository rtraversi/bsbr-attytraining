'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BTN, MUTED, NOTICE } from './intake-styles'
import type { ReviewSection } from '@/lib/intake/review'
import { RENEWAL_GRACE_DAYS, type Retention } from '@/lib/intake/retention'

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
 * ── The states ──────────────────────────────────────────────────────────────
 *
 *   editable   not this component's job — the page renders IntakeClient.
 *   submitted  read-only, plus Reopen. Sent, and no policy has come back yet.
 *   delivered  read-only, plus Reopen. D8-2.
 *
 * 🔴 THERE IS NO `purged` STATE. It existed until 2026-09-01 and told firms
 * "Your answers were deleted after your policy was delivered". Katy reversed
 * it: answers are kept. What ends them is the subscription lapsing, and the
 * `retention` prop below is where the firm reads that — out loud, because
 * D8-4 makes it a reason to renew.
 */
export type ReviewState = 'submitted' | 'delivered'

export interface IntakeReviewProps {
  state: ReviewState
  sections: ReviewSection[]
  submittedAt: string | null
  deliveredAt: string | null
  reopenedCount: number
  /** D8-3/D8-4. How long these answers are kept, said out loud. */
  retention: Retention
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
  retention,
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

  return (
    <section>
      {heading && <h2 className="mb-2 text-lg font-semibold">{heading}</h2>}

      <p className={`text-[14.5px] leading-relaxed ${MUTED}`}>
        {state === 'delivered' ? (
          <>
            Your policy was delivered{deliveredAt ? ` on ${date(deliveredAt)}` : ''}. These are the
            answers it was written from.
          </>
        ) : (
          <>
            Submitted{submittedAt ? ` on ${date(submittedAt)}` : ''} and with the attorney drafting
            your policy. These are the answers as you gave them.
          </>
        )}
      </p>

      {/* D8-2: offered in BOTH states. A delivered policy used to end this. */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className={BTN} onClick={() => void reopen()} disabled={busy}>
          {busy ? 'Reopening…' : 'Reopen to make changes'}
        </button>
        <p className={`max-w-[30rem] text-[13px] leading-relaxed ${MUTED}`}>
          {/* Says the cost before they press it. An attorney may already be
              reading these answers, and a firm that changes them without
              knowing that is the case this whole feature has to handle
              honestly. */}
          {state === 'delivered' ? (
            <>
              You can change any answer at any time and have your policy rewritten from the new
              ones. Send it again when you are done — the attorney is told it changed.
            </>
          ) : (
            <>
              You can change any answer. Send it again when you are done — the attorney is told it
              changed.
            </>
          )}
        </p>
      </div>

      <RetentionNote retention={retention} />

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

/**
 * How long these answers are kept — D8-4, and it is deliberately not fine print.
 *
 * Katy: "if they renew then it remains active. So that is an incentive to renew
 * so they dont lose the work they progressed in making the policy." A renewal
 * incentive nobody is shown is not an incentive, so this renders on the same
 * screen as the answers it is about, immediately under the button that edits
 * them.
 *
 * 🔴 THE WINDOW IS THREE DAYS AND THE COPY HAS TO SAY SO PLAINLY (Max,
 * 2026-09-01 — see RENEWAL_GRACE_DAYS). A short window that a firm only finds
 * out about after it closes is not an incentive, it is a trap. So `active`
 * names the limit BEFORE it can matter, rather than promising an open-ended
 * hold and correcting it later, and `grace` leads with the days remaining
 * instead of burying them after a date.
 */
function RetentionNote({ retention }: { retention: Retention }) {
  const when = retention.deletesAt ? date(retention.deletesAt) : null

  if (retention.state === 'active') {
    return (
      <p className={`mt-4 max-w-[38rem] text-[13px] leading-relaxed ${MUTED}`}>
        We keep these answers for as long as your subscription is active, so renewing means you
        never start this questionnaire over — you edit what is already here and your policy is
        rewritten from it. If the subscription lapses they are held for {RENEWAL_GRACE_DAYS} days
        and then removed.
      </p>
    )
  }

  if (retention.state === 'grace') {
    return (
      <p className={`mt-4 max-w-[38rem] text-[13px] leading-relaxed ${MUTED}`}>
        Your subscription has ended.{' '}
        {retention.daysLeft !== null ? (
          <>
            You have <strong>{retention.daysLeft === 1 ? '1 day' : `${retention.daysLeft} days`}</strong> to
            renew before these answers are removed{when ? ` on ${when}` : ''}.
          </>
        ) : (
          <>We are still holding these answers.</>
        )}{' '}
        Renew in time and everything here stays as it is, so you will not have to fill any of it in
        again.
      </p>
    )
  }

  return (
    <p className={`mt-4 max-w-[38rem] text-[13px] leading-relaxed ${MUTED}`}>
      Your subscription ended{when ? ` and the retention period ran out on ${when}` : ''}. These
      answers are no longer covered by an active subscription; renewing now may mean starting the
      questionnaire again.
    </p>
  )
}
