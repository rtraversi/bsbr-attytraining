'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/**
 * Exactly what the deliverability chip needs, and no more.
 *
 * Deliberately NOT `MemberDetail`. That type carries training status, scores and
 * certificate fields, and assembling one costs the four batched joins in
 * app/dashboard/page.tsx plus an auth lookup per member. The chip renders from
 * the pill, which is in the layout and therefore runs on every /dashboard route
 * — so it takes the four columns it actually reads, and the layout pays for auth
 * lookups only on the members that are already flagged (usually none).
 *
 * `MemberDetail` is structurally assignable to this, so the dashboard's existing
 * list can still be passed straight in if it ever needs to be.
 */
export interface UnreachableMember {
  id: string
  name: string
  email: string
  /** Their invite email failed to send (0016). Cleared by a successful resend. */
  invite_email_failed: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// These were full-width banners stacked above the dashboard grid until
// 2026-08-27. Between them they ate most of the first screen on a laptop, on a
// dashboard whose whole layout exists to fit the viewport without scrolling
// (see dashboard-shell.tsx's 880px floor). They are now compact chips in the
// nav pill.
//
// Two things changed as a consequence and are load-bearing:
//
//   1. The pill renders on EVERY /dashboard route, not just the admin home, so
//      the prompts follow the admin around instead of living on one screen.
//      For the intake that is a straight improvement — see the undismissible
//      note below.
//   2. There is no room for a description paragraph. Each chip is one label and
//      its action; the detail moved behind a click (the email chip) or behind
//      the destination itself (the intake chip).
//
// The CONDITIONS are untouched. Both chips still appear and disappear on
// exactly what the banners appeared and disappeared on.
// ─────────────────────────────────────────────────────────────────────────────

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
 * wrong, they have simply not finished yet.
 *
 * The chip IS the action — one link whose label is the verb — rather than a
 * label with a button beside it, which at pill scale would be two tap targets
 * inside 200px. The label carries the state in its verb ("Continue" only reads
 * as continue if there is something to continue), so nothing is lost by not
 * naming the state separately.
 */
export function IntakeChip({
  inProgress,
  chipClassName,
}: {
  inProgress: boolean
  chipClassName: string
}) {
  const label = inProgress ? 'Continue Intake' : 'Start Intake'

  return (
    <Link
      href="/intake"
      className={`${chipClassName} shrink-0 bg-[#EAF6FF] text-[var(--brand-emphasis)] hover:bg-[#DCEEFF] dark:bg-[var(--brand-emphasis)]/15 dark:text-[var(--brand-primary)] dark:hover:bg-[var(--brand-emphasis)]/25`}
    >
      <ClipboardIcon />
      {/* Below sm the pill is already carrying three nav links and the theme
          switch; the icon plus the accessible name keeps the chip reachable
          without pushing them out of the scroller. Same rule the firm name in
          nav-pill.tsx follows. */}
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </Link>
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
 * One chip, two signals: 0029's email_verified_at ("never proven") and 0016's
 * invite_email_failed ("we tried and it did not go"). A firm does not care which
 * column is set — they care whether Sarah gets her certificate.
 *
 * 🔴 NOTHING IS BLOCKED ON THIS. Resend 403s on every send today (ix-dnszoho),
 * so a blocking version would brick every firm behind a notice nobody can clear.
 * The send button reports honestly and the row stays; the operator can hand
 * someone the link directly with `scripts/dev-auth.mjs verify-link`.
 *
 * ── Why the addresses are behind a click ────────────────────────────────────
 *
 * Which addresses is detail, and detail for N people cannot be a chip — so the
 * chip is the instruction and the popover carries the list, one send button per
 * row. A single "send to all" button on the chip would be wrong in the common
 * case: the reason an address is unconfirmed is usually a typo, and re-sending
 * to the typo is not a fix.
 *
 * The label states the task rather than the count (Max, 2026-08-27). The count
 * survives where it is actionable — the popover, where each row has its own
 * button — and in the dialog's accessible name, so a screen reader still hears
 * how many before deciding to open it.
 */
export function EmailDeliverabilityChip({
  members,
  chipClassName,
}: {
  members: UnreachableMember[]
  chipClassName: string
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<Record<string, SendState>>({})
  const wrapRef = useRef<HTMLDivElement>(null)

  // Click-outside and Escape. The chip sits in the nav pill, above every page,
  // so a popover that only closed by re-clicking the chip would sit over the
  // dashboard while the admin tried to use it.
  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

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

  const label = members.length === 1 ? 'Verify email address' : 'Verify email addresses'
  // The count left the chip but not the product — it is what tells a screen
  // reader whether this is one typo or half the roster.
  const dialogLabel =
    members.length === 1
      ? 'Verify email address — 1 unconfirmed'
      : `Verify email addresses — ${members.length} unconfirmed`

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${chipClassName} bg-[rgba(214,158,20,0.14)] text-[#96700F] hover:bg-[rgba(214,158,20,0.24)] dark:bg-[#4A3D1A]/50 dark:text-[#D9AE45] dark:hover:bg-[#4A3D1A]/80`}
      >
        <MailWarningIcon />
        <span className="hidden sm:inline">{label}</span>
        <span className="sr-only sm:hidden">{dialogLabel}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={dialogLabel}
          // right-0 anchors to the chip's right edge: the chip sits in the pill's
          // right-hand cluster, so a left-anchored panel would run off-screen on
          // a laptop. z-50 clears the shell's z-10 backdrop pattern.
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[#E5C98A] bg-white p-4 text-left shadow-[0_12px_32px_rgba(10,10,10,0.16)] dark:border-[#4A3D1A] dark:bg-[#0D0F12]"
        >
          <p className={`text-[13px] leading-relaxed ${MUTED}`}>
            We have no proof these addresses can receive mail, so training invitations and
            certificates may not arrive. Nothing is blocked.
          </p>

          <ul className="mt-3 flex flex-col gap-2">
            {members.map((member) => {
              const current = state[member.id] ?? 'idle'
              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5C98A]/40 pt-2 text-[13px] first:border-0 first:pt-0"
                >
                  <span className="min-w-0">
                    {/*
                      ONE identifier, not two. firm_members has no name column —
                      page.tsx resolves `name` as user_metadata.full_name || email,
                      and the roster path discards names outright (invite/bulk
                      takes {name, email} and drops the name), so full_name is
                      unset for almost everybody and this printed the same
                      address twice, bold then muted. The email is shown beside
                      the name only when it is genuinely a second fact.
                    */}
                    <span className="font-semibold break-all">{member.name}</span>
                    {member.name !== member.email && (
                      <span className={`ml-1.5 break-all ${MUTED}`}>{member.email}</span>
                    )}
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
                      className="shrink-0 rounded-full border border-[#E5C98A] bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#96700F] transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-[#0D0F12] dark:text-[#D9AE45]"
                    >
                      {current === 'sending'
                        ? 'Sending…'
                        : current === 'error'
                          ? 'Try again'
                          : 'Send confirmation'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */
/* Sized to match ICON_CLASS in nav-pill.tsx so the chips sit on the same
   baseline as the nav links. */

const CHIP_ICON = 'h-[17px] w-[17px] shrink-0'

function ClipboardIcon() {
  return (
    <svg className={CHIP_ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  )
}

function MailWarningIcon() {
  return (
    <svg className={CHIP_ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  )
}
