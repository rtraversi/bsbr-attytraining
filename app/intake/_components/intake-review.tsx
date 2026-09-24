'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BTN, BTN_PRIMARY, MUTED, NOTICE } from './intake-styles'
import type { ReviewSection } from '@/lib/intake/review'
import type { Retention } from '@/lib/intake/retention'

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
 *   submitted  } ONE screen for both since 2026-09-24. The firm's policy is
 *   delivered  } assembled the moment it sends (no approval gate, see
 *                lib/policy/for-firm.ts), so "delivered" no longer means
 *                anything the firm needs to be told. Callers only mount this
 *                for one of the two, which is all the state it needs.
 *
 * 🔴 THERE IS NO `purged` STATE. It existed until 2026-09-01 and told firms
 * "Your answers were deleted after your policy was delivered". Katy reversed
 * it: answers are kept. What ends them is the subscription lapsing, and the
 * `retention` prop below is where the firm reads that — out loud, because
 * D8-4 makes it a reason to renew.
 */
export interface IntakeReviewProps {
  sections: ReviewSection[]
  submittedAt: string | null
  reopenedCount: number
  /** D8-3/D8-4. How long these answers are kept, said out loud. */
  retention: Retention
  /** Settings renders inside a card that already has a heading; /intake does not. */
  heading?: string
}

/**
 * 🔴 FORMATTED IN UTC, DELIBERATELY.
 *
 * `policy_delivered_at` was set by hand as a calendar date at midnight UTC (it
 * is no longer shown here, but the retention date below has the same shape). Formatted in local time west
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
  sections,
  submittedAt,
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

      {/* ⚠️ APPROVED COPY, VERBATIM (Max, 2026-09-24). Do not edit, polish or
          re-punctuate it, and do not add an em dash. Same sentence for
          `submitted` and `delivered`: there is no approval step any more. */}
      <p className={`text-[14.5px] leading-relaxed ${MUTED}`}>
        Submitted{submittedAt ? ` on ${date(submittedAt)}` : ''}. Your policy was assembled from the
        answers below.
      </p>
      <p className={`mt-1 text-[14.5px] leading-relaxed ${MUTED}`}>
        Your policy, action list and answers are always under Settings in your dashboard.
      </p>

      {/*
        🔴 A PARAGRAPH THAT SAT HERE UNTIL 2026-09-02 WAS A LIE. It said "the
        attorney is told it changed". Nothing notifies anyone. Max: "lies. in
        fact delete that whole paragraph." Do not reinstate any version of it.

        🔴 THE WAY OUT, AND THE DOWNLOADS. This screen once had no Link at all,
        so a firm that submitted was stranded on it (Max, 2026-09-02: "user is
        stuck on this page foreve.r again. never fixed."). The row sits directly
        under the status lines, ABOVE the answers, because the answers are long
        and a way out at the bottom of a scroll is one the firm never finds.

        Order and labels are Max's, 2026-09-24. "Edit answers" replaced "Reopen to
        make changes", which used to sit on the first section heading.

        The downloads are plain links, not fetch + blob: /api/policy sets
        Content-Disposition, so the browser saves the file itself. Same pattern
        as app/dashboard/policy/page.tsx.

        390px: flex-wrap lets the four buttons fall onto as many rows as they
        need; the action list note stays with its button because they share one
        wrapper.
      */}
      <div className="mt-5 flex flex-wrap items-start gap-3">
        <Link href="/dashboard" className={BTN}>
          Back to dashboard
        </Link>
        <button type="button" className={BTN} onClick={() => void reopen()} disabled={busy}>
          Edit answers
        </button>
        <a href="/api/policy?format=docx" download className={BTN_PRIMARY}>
          Download policy
        </a>
        <div className="flex max-w-[16rem] flex-col gap-1.5">
          <a href="/api/policy?format=docx&document=action-items" download className={BTN}>
            Download action list
          </a>
          <p className={`px-2 text-[12.5px] leading-snug ${MUTED}`}>
            The action list shows items missing to complete this policy.
          </p>
        </div>
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
                  {/* The number the firm SAW while answering — carried from the
                      intake, not counted from this list. Same size, weight and
                      tracking as the counter under the intake card, so the two
                      screens read as one thing. Numbers can skip where a
                      Katy-only question was filtered out; that gap is the
                      intake's own numbering. See ReviewItem.number. */}
                  <dt className={`text-[13px] ${MUTED}`}>
                    <span className="mr-2 text-[12px] font-semibold uppercase tracking-wider tabular-nums">
                      {item.number}
                    </span>
                    {item.prompt}
                  </dt>
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
      // ⚠️ APPROVED COPY, VERBATIM (Max, 2026-09-01). Do not edit, polish or
      // re-punctuate it, and do not reintroduce an em dash.
      //
      // 🔴 "three days" IS SPELLED OUT IN PROSE, so this string no longer
      // interpolates RENEWAL_GRACE_DAYS and the two can now drift apart. If the
      // constant ever changes, THIS SENTENCE MUST CHANGE WITH IT. The guard is
      // tests/intake-retention.test.ts, which pins the constant at 3 rather
      // than merely referencing it, so moving it fails there and points here.
      <p className={`mt-4 max-w-[38rem] text-[13px] leading-relaxed ${MUTED}`}>
        We keep these answers for as long as your subscription is active. If it lapses there is a
        grace period of three days, and then they are permanently removed unless you renew.
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
