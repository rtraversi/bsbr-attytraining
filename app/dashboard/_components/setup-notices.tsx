'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MemberDetail } from './team-table'

// Per-file style constants, matching the house convention (CARD/MUTED in
// admin-dashboard.tsx). No shared primitive library exists and this is not the
// place to start one.
const PANEL =
  'rounded-2xl border px-5 py-4 dark:bg-[#0D0F12]'
const ACTION =
  'shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-opacity hover:opacity-90'
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

/**
 * "Your firm's AI policy is not written yet."
 *
 * ── 🔴 NOT DISMISSIBLE, DELIBERATELY ────────────────────────────────────────
 *
 * Katy reversed the hard gate on 2026-08-26 12:11: "The problem is that the
 * intake is time consuming. People will want to explore without having to fill
 * it all in." So the dashboard opens for everyone and nothing redirects.
 *
 * Which makes THIS the only thing that ever gets the intake completed. There is
 * no block, no chase, and no other route to the written policy the firm actually
 * bought. A dismissible nudge for a task with no other path to it is a nudge
 * that gets dismissed once and never seen again — so there is no × here, and
 * adding one would quietly remove the last prompt in the product.
 *
 * It is styled as an invitation rather than an alarm: the firm has done nothing
 * wrong, they have simply not finished yet, and a red banner over a working
 * dashboard would read as a fault.
 */
export function IntakeNotice({ inProgress }: { inProgress: boolean }) {
  return (
    <section
      className={`${PANEL} border-[var(--brand-emphasis)]/30 bg-[#EAF6FF] dark:border-[var(--brand-emphasis)]/40`}
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">
            {inProgress
              ? 'Your firm’s AI policy questionnaire is half finished'
              : 'Your firm’s AI policy hasn’t been written yet'}
          </p>
          <p className={`mt-1 max-w-[46rem] text-[13px] leading-relaxed ${MUTED}`}>
            {inProgress
              ? 'Pick up where you left off. Nothing you have answered is lost, and an attorney drafts your policy as soon as it is sent.'
              : 'The policy is what your staff are trained and certified against, so it comes first. It takes one pass and you can stop and come back at any point.'}
          </p>
        </div>

        <Link
          href="/intake"
          className={`${ACTION} bg-[var(--brand-emphasis)] text-center text-white`}
        >
          {inProgress ? 'Continue' : 'Start'}
        </Link>
      </div>
    </section>
  )
}

type SendState = 'idle' | 'sending' | 'sent' | 'queued' | 'error'

/**
 * "We are not sure we can reach these people."
 *
 * ── What it is actually reporting ───────────────────────────────────────────
 *
 * Not identity — the buyer's identity is proven by a card payment and a Stripe
 * session token, far better than an email could. DELIVERABILITY. Stripe
 * validates an address's shape, not its existence, so "gmial.com" sails through
 * checkout, and Stripe never tells us when its own receipt bounced. Roster
 * addresses are riskier still: the admin types them for other people, and a
 * transposed character is invisible until a certificate fails to arrive.
 *
 * One notice, two signals: 0029's email_verified_at ("never proven") and 0016's
 * invite_email_failed ("we tried and it did not go"). A firm does not care which
 * column is set — they care whether Sarah gets her certificate.
 *
 * 🔴 NOTHING IS BLOCKED ON THIS. Resend 403s on every send today (ix-dnszoho),
 * so a blocking version would brick every firm behind a banner nobody can clear.
 * The send button reports honestly and the row stays; the operator can hand
 * someone the link directly with `scripts/dev-auth.mjs verify-link`.
 */
export function EmailDeliverabilityNotice({ members }: { members: MemberDetail[] }) {
  const [state, setState] = useState<Record<string, SendState>>({})

  async function send(memberId: string) {
    setState((s) => ({ ...s, [memberId]: 'sending' }))
    try {
      const res = await fetch('/api/firm/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const body = (await res.json()) as { ok?: boolean; sent?: boolean }
      if (!res.ok) {
        setState((s) => ({ ...s, [memberId]: 'error' }))
        return
      }
      // 'queued' is the honest word for "the link exists, the email did not go".
      // Saying "sent" would be a lie today, and saying "failed" would suggest the
      // admin should do something they cannot do.
      setState((s) => ({ ...s, [memberId]: body.sent ? 'sent' : 'queued' }))
    } catch {
      setState((s) => ({ ...s, [memberId]: 'error' }))
    }
  }

  if (members.length === 0) return null

  return (
    <section
      className={`${PANEL} border-[#E5C98A] bg-[rgba(214,158,20,0.10)] dark:border-[#4A3D1A]`}
      aria-live="polite"
    >
      <p className="text-sm font-bold">
        {members.length === 1
          ? 'One address on your team has not been confirmed'
          : `${members.length} addresses on your team have not been confirmed`}
      </p>
      <p className={`mt-1 max-w-[46rem] text-[13px] leading-relaxed ${MUTED}`}>
        We have no proof these addresses can receive mail, so training invitations and certificates
        may not arrive. Nothing is blocked — this is worth a minute now rather than a missing
        certificate later.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {members.map((member) => {
          const current = state[member.id] ?? 'idle'
          return (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5C98A]/40 pt-2 text-[13px] first:border-0 first:pt-0"
            >
              <span className="min-w-0">
                <span className="font-semibold">{member.name}</span>{' '}
                <span className={MUTED}>{member.email}</span>
                {member.invite_email_failed && (
                  <span className="ml-2 text-[12px] font-semibold text-[#96700F] dark:text-[#D9AE45]">
                    invitation bounced
                  </span>
                )}
              </span>

              {current === 'sent' || current === 'queued' ? (
                <span className={`text-[12px] font-semibold ${MUTED}`}>
                  {current === 'sent'
                    ? 'Confirmation sent'
                    : 'Link ready — email could not go out, contact us and we will pass it on'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void send(member.id)}
                  disabled={current === 'sending'}
                  className={`${ACTION} border border-[#E5C98A] bg-white text-[#96700F] disabled:opacity-50 dark:bg-[#0D0F12] dark:text-[#D9AE45]`}
                >
                  {current === 'sending' ? 'Sending…' : current === 'error' ? 'Try again' : 'Send confirmation'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
