'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BTN, MUTED, NOTICE } from './intake-styles'
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

      {/*
        🔴 THE EXPLANATORY PARAGRAPH THAT SAT HERE IS GONE, AND IT WAS A LIE.
        It said "the attorney is told it changed", in both branches. Nothing
        notifies anyone: markDelivered writes a row, and the only email in the
        whole delivery path is pinned shut behind POLICY_EMAIL_COPY_APPROVED
        (lib/policy/delivery-email.ts:41) on top of Resend's standing 403.
        Max, 2026-09-02, from a browser: "lies. in fact delete that whole
        paragraph."

        Do not reinstate any version of it until something actually sends.

        The Reopen button moved out of this row and up beside the first section
        heading, so it reads as an action ON the answers rather than a footnote
        under a paragraph.
      */}

      {/*
        🔴 THE WAY OUT. This screen had no Link and no href of any kind, so a
        firm that submitted its intake was stranded on it — Max, 2026-09-02:
        "user is stuck on this page foreve.r again. never fixed." Same shape as
        the delivery gap found on 09-01, on the firm's side of it.

        Placed directly under the status line, ABOVE the answers, because the
        answers are long and a way out at the bottom of a scroll is a way out
        the stranded firm never finds.

        In the delivered state the policy link leads, because that is the thing
        they bought and the reason they came back. /dashboard/policy is the
        route the nav pill already reveals on delivery, so this agrees with the
        nav rather than inventing a second destination.
      */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {state === 'delivered' && (
          <Link href="/dashboard/policy" className={BTN}>
            Read your policy
          </Link>
        )}
        <Link
          href="/dashboard"
          className={
            state === 'delivered'
              ? `text-[13.5px] font-semibold text-[var(--brand-emphasis)] underline underline-offset-4`
              : BTN
          }
        >
          Back to your dashboard
        </Link>
      </div>

      <RetentionNote retention={retention} />

      {error && <p className={`mt-4 ${NOTICE}`}>{error}</p>}

      {reopenedCount > 0 && (
        <p className={`mt-4 text-[13px] ${MUTED}`}>
          Reopened {reopenedCount} {reopenedCount === 1 ? 'time' : 'times'} since it was first sent.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {sections.map((section, sectionIndex) => (
          <div key={section.section}>
            {/* D8-2: reopening is offered in BOTH states. A delivered policy
                used to be the end of the road.

                It sits on the FIRST section heading and nowhere else — Max:
                "have the button be on over where it says 'firm'". Baseline-
                aligned with the heading so the two read as one row rather than
                a button floating beside a label. */}
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-emphasis)]">
                {section.label}
              </h3>
              {sectionIndex === 0 && (
                <button
                  type="button"
                  className={BTN}
                  onClick={() => void reopen()}
                  disabled={busy}
                >
                  {busy ? 'Reopening…' : 'Reopen to make changes'}
                </button>
              )}
            </div>
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
