'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { BillingSummary } from '@/app/api/billing/summary/route'
import { rateForSeatCount } from '@/lib/pricing'

/* ── Tokens — same values app/dashboard/settings/page.tsx uses ─────────────── */
const CARD = 'rounded-3xl bg-white p-6 xl:p-8 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING = 'font-headline font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]'
const SECTION_HEADING = `${HEADING} mb-4 text-2xl md:text-3xl xl:mb-5 xl:text-[2.5rem]`
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'
const LABEL = 'block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]'

const BTN_PRIMARY =
  'shrink-0 rounded-xl bg-[var(--brand-emphasis)] px-5 py-2.5 text-sm font-bold whitespace-nowrap text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_QUIET =
  'shrink-0 rounded-xl bg-[#F2F4F7] px-5 py-2.5 text-sm font-bold whitespace-nowrap text-[#0A0A0A] transition-colors hover:bg-[#EAF6FF] dark:bg-[#131A20] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#F5F7FA] dark:hover:bg-[#1F2429]'
const BTN_DANGER =
  'shrink-0 rounded-xl bg-[#DC2626] px-5 py-2.5 text-sm font-bold whitespace-nowrap text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Stripe reports minor units; render them as currency without inventing precision. */
function fmtAmount(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(minor / 100)
}

const CANCEL_REFUND_REASON_COPY: Record<string, string> = {
  too_late: 'It has been more than 14 days since you purchased.',
  certificate_issued: 'A certificate has already been issued to your staff.',
}

export function BillingClient() {
  const [data, setData] = useState<BillingSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [confirmingCancelRefund, setConfirmingCancelRefund] = useState(false)
  const [cancelRefundSaving, setCancelRefundSaving] = useState(false)
  const [cancelRefundError, setCancelRefundError] = useState<string | null>(null)
  const [cancelRefundRequested, setCancelRefundRequested] = useState(false)

  const [addSeatsOpen, setAddSeatsOpen] = useState(false)
  const [seatsToAdd, setSeatsToAdd] = useState(1)
  const [addSeatsSaving, setAddSeatsSaving] = useState(false)
  const [addSeatsError, setAddSeatsError] = useState<string | null>(null)
  const [addSeatsResult, setAddSeatsResult] = useState<{ seatsAdded: number; chargedCents: number } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/summary')
      if (!res.ok) {
        setLoadError('Could not load your billing details.')
        return
      }
      setData((await res.json()) as BillingSummary)
    } catch {
      setLoadError('Could not load your billing details.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setAutoRenew(enabled: boolean) {
    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch('/api/billing/auto-renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setActionError(body?.error ?? 'Could not update auto-renewal. Please try again.')
        return
      }
      // The mutation returns the new truth, so patch state from it rather than
      // guessing — the end date can differ from what was on screen.
      const next = (await res.json()) as {
        cancelAtPeriodEnd: boolean
        currentPeriodEnd: string | null
      }
      setData(d =>
        d
          ? {
              ...d,
              cancelAtPeriodEnd: next.cancelAtPeriodEnd,
              currentPeriodEnd: next.currentPeriodEnd,
            }
          : d
      )
      setConfirming(false)
    } catch {
      setActionError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function addSeats() {
    setAddSeatsSaving(true)
    setAddSeatsError(null)
    try {
      const res = await fetch('/api/billing/add-seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats: seatsToAdd }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setAddSeatsError(body?.error ?? 'Could not add seats. Please try again.')
        return
      }
      const result = (await res.json()) as {
        seatsAdded: number
        newMaxSeats: number
        chargedCents: number
        ratePerSeat: number
      }
      setAddSeatsResult({ seatsAdded: result.seatsAdded, chargedCents: result.chargedCents })
      setAddSeatsOpen(false)
      setData(d => (d ? { ...d, seats: result.newMaxSeats } : d))
    } catch {
      setAddSeatsError('Network error. Please try again.')
    } finally {
      setAddSeatsSaving(false)
    }
  }

  async function requestCancelRefund() {
    setCancelRefundSaving(true)
    setCancelRefundError(null)
    try {
      const res = await fetch('/api/billing/cancel-refund', { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string; reasons?: string[] }
          | null
        const reasonText = (body?.reasons ?? [])
          .map(r => CANCEL_REFUND_REASON_COPY[r])
          .filter(Boolean)
          .join(' ')
        setCancelRefundError(
          body?.error || reasonText || 'This purchase is no longer eligible for a refund.'
        )
        return
      }
      setCancelRefundRequested(true)
      setConfirmingCancelRefund(false)
    } catch {
      setCancelRefundError('Network error. Please try again.')
    } finally {
      setCancelRefundSaving(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-6 py-10 md:px-10 xl:px-14 xl:py-14">
      <div className="mb-10">
        <h1 className={`${HEADING} text-4xl`}>Billing</h1>
        <p className={`mt-2 text-base ${MUTED}`}>
          Your subscription, payment history, and auto-renewal.
        </p>
      </div>

      {loadError && (
        <section className={CARD}>
          <p className="text-sm text-red-500">{loadError}</p>
        </section>
      )}

      {!loadError && !data && (
        <section className={CARD}>
          <p className={`text-sm ${MUTED}`}>Loading your billing details…</p>
        </section>
      )}

      {data && !data.hasSubscription && (
        <section className={CARD}>
          <h2 className={`${LABEL} mb-1`}>No active subscription</h2>
          <p className={`text-sm ${MUTED}`}>
            This firm doesn&apos;t have a subscription yet. Once you complete checkout,
            your plan and payment history will appear here.
          </p>
          <Link
            href="/pricing"
            className={`${BTN_PRIMARY} mt-5 inline-block`}
          >
            View plans
          </Link>
        </section>
      )}

      {data?.hasSubscription && (
        <div className="flex flex-col gap-12">
          {/* ── Current plan ───────────────────────────────────────────────── */}
          <section>
            <h2 className={SECTION_HEADING}>Current plan</h2>
            <div className={CARD}>
              <dl className="flex flex-col gap-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <dt className={LABEL}>Seats</dt>
                  <dd className={`flex items-center gap-3 text-sm ${MUTED}`}>
                    {data.seats ?? '—'} {data.seats === 1 ? 'seat' : 'seats'}
                    {!addSeatsOpen && (
                      <button
                        type="button"
                        id="add-seats"
                        onClick={() => {
                          setAddSeatsOpen(true)
                          setAddSeatsResult(null)
                        }}
                        className="text-sm font-bold text-[var(--brand-emphasis)] hover:underline"
                      >
                        Add seats
                      </button>
                    )}
                  </dd>
                </div>

                {addSeatsOpen && data.seats != null && (
                  <div className="rounded-xl bg-[#F5F7FA] p-4 dark:bg-[#0D0F12]">
                    <p className={`text-sm ${MUTED}`}>
                      Adds seats for the rest of your current year, at your current rate of{' '}
                      <strong className="text-[#0A0A0A] dark:text-[#F5F7FA]">
                        ${rateForSeatCount(data.seats)}/seat
                      </strong>
                      . This does not change your renewal date or your other seats&apos; rate.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={seatsToAdd}
                        onChange={e => setSeatsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={addSeatsSaving}
                        className="w-24 rounded-xl border border-[#E5EEF5] bg-white px-3 py-2 text-center text-sm text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[var(--brand-emphasis)] disabled:opacity-50 dark:border-[#1F2429] dark:bg-[#0D0F12] dark:text-[#F5F7FA]"
                      />
                      <span className={`text-sm ${MUTED}`}>
                        = ${(seatsToAdd * rateForSeatCount(data.seats)).toLocaleString()} charged today
                      </span>
                      <button
                        type="button"
                        onClick={() => void addSeats()}
                        disabled={addSeatsSaving}
                        className={BTN_PRIMARY}
                      >
                        {addSeatsSaving ? 'Charging…' : 'Add seats'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddSeatsOpen(false)}
                        disabled={addSeatsSaving}
                        className={BTN_QUIET}
                      >
                        Cancel
                      </button>
                    </div>
                    {addSeatsError && (
                      <p className="mt-3 text-sm font-medium text-red-500">{addSeatsError}</p>
                    )}
                  </div>
                )}

                {addSeatsResult && (
                  <p className="text-sm text-[var(--brand-emphasis)]">
                    Added {addSeatsResult.seatsAdded}{' '}
                    {addSeatsResult.seatsAdded === 1 ? 'seat' : 'seats'} — charged{' '}
                    ${(addSeatsResult.chargedCents / 100).toLocaleString()}.
                  </p>
                )}

                {/* The line that justifies this page: "renews on X" and "access
                    ends X" are the same date and opposite meanings, and
                    firms.status cannot tell them apart. */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <dt className={LABEL}>
                    {data.cancelAtPeriodEnd ? 'Access ends' : 'Renews on'}
                  </dt>
                  <dd className={`text-sm ${MUTED}`}>{fmtDate(data.currentPeriodEnd)}</dd>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <dt className={LABEL}>Auto-renewal</dt>
                  <dd className="text-sm">
                    {data.cancelAtPeriodEnd ? (
                      <span className="font-semibold text-[#B45309] dark:text-[#F0B357]">
                        Off — will not renew
                      </span>
                    ) : (
                      <span className="font-semibold text-[var(--brand-emphasis)]">On</span>
                    )}
                  </dd>
                </div>
              </dl>

              {data.cancelAtPeriodEnd && (
                <p className="mt-6 rounded-xl bg-[#FFF7E6] px-4 py-3 text-sm leading-relaxed text-[#B45309] dark:bg-[#B45309]/10 dark:text-[#F0B357]">
                  Your subscription is set to end on{' '}
                  <strong>{fmtDate(data.currentPeriodEnd)}</strong>. Until then everything
                  works normally. After that date your staff can no longer take or retake
                  the training, but every certificate already earned remains valid and
                  downloadable.
                </p>
              )}

              <div className="mt-6 border-t border-[#E5EEF5] pt-5 dark:border-[#1F2429]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <div>
                    <span className={LABEL}>Payment method</span>
                    <p className={`text-sm ${MUTED}`}>
                      Card details are held by Stripe, never by IURIX.
                    </p>
                  </div>
                  <a href="/api/portal" className={BTN_QUIET}>
                    Update payment method
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ── Payments ───────────────────────────────────────────────────── */}
          <section>
            <h2 className={SECTION_HEADING}>Payments</h2>
            <div className={CARD}>
              {data.invoices.length === 0 ? (
                <p className={`text-sm ${MUTED}`}>No payments yet.</p>
              ) : (
                <ul className="flex flex-col">
                  {data.invoices.map((inv, i) => (
                    <li
                      key={inv.id || i}
                      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-8 ${
                        i === 0 ? 'pt-0' : 'pt-4'
                      } ${
                        i === data.invoices.length - 1
                          ? 'pb-0'
                          : 'border-b border-[#E5EEF5] pb-4 dark:border-[#1F2429]'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className={LABEL}>{fmtDate(inv.date)}</span>
                        <p className={`text-sm ${MUTED}`}>
                          {fmtAmount(inv.amountPaid, inv.currency)}
                          {inv.status && inv.status !== 'paid' && (
                            <span className="ml-2 capitalize">· {inv.status}</span>
                          )}
                        </p>
                      </div>
                      {inv.hostedInvoiceUrl && (
                        <a
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-sm font-bold text-[var(--brand-emphasis)] hover:underline dark:text-[var(--brand-primary)]"
                        >
                          View receipt &rarr;
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ── Auto-renewal ───────────────────────────────────────────────── */}
          <section>
            <h2 className={SECTION_HEADING}>Auto-renewal</h2>
            <div className={CARD}>
              {data.cancelAtPeriodEnd ? (
                // Resuming is not destructive, so it gets no confirmation step —
                // making someone confirm a harmless, reversible action trains
                // them to click through dialogs.
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <div>
                    <span className={LABEL}>Resume auto-renewal</span>
                    <p className={`text-sm ${MUTED}`}>
                      Turn renewal back on and keep your firm certified. Your existing
                      card and seat count are unchanged, and you will not be charged
                      until {fmtDate(data.currentPeriodEnd)}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void setAutoRenew(true)}
                    disabled={saving}
                    className={BTN_PRIMARY}
                  >
                    {saving ? 'Working…' : 'Resume auto-renewal'}
                  </button>
                </div>
              ) : !confirming ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <div>
                    <span className={LABEL}>Cancel auto-renewal</span>
                    <p className={`text-sm ${MUTED}`}>
                      Your subscription stays active until{' '}
                      {fmtDate(data.currentPeriodEnd)}. Nothing is charged after that.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className={BTN_QUIET}
                  >
                    Cancel auto-renewal
                  </button>
                </div>
              ) : (
                // A button with an explicit confirm, not a toggle: a toggle
                // implies instant and freely reversible, and this is neither —
                // it schedules an end date and sends an email.
                <div>
                  <span className={LABEL}>Cancel auto-renewal?</span>
                  <ul
                    className={`mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed ${MUTED}`}
                  >
                    <li>
                      Your subscription stays fully active until{' '}
                      <strong className="text-[#0A0A0A] dark:text-[#F5F7FA]">
                        {fmtDate(data.currentPeriodEnd)}
                      </strong>
                      . You will not be charged again.
                    </li>
                    <li>
                      Every certificate your staff have already earned{' '}
                      <strong className="text-[#0A0A0A] dark:text-[#F5F7FA]">
                        remains valid and downloadable
                      </strong>
                      . Those are permanent compliance records.
                    </li>
                    <li>
                      After that date your staff{' '}
                      <strong className="text-[#0A0A0A] dark:text-[#F5F7FA]">
                        cannot take or retake the training
                      </strong>
                      , so nobody can re-certify when their certificate expires.
                    </li>
                    <li>You can turn auto-renewal back on at any time before that date.</li>
                  </ul>

                  {actionError && (
                    <p className="mt-4 text-sm font-medium text-red-500">{actionError}</p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void setAutoRenew(false)}
                      disabled={saving}
                      className={BTN_DANGER}
                    >
                      {saving ? 'Cancelling…' : 'Yes, cancel auto-renewal'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      disabled={saving}
                      className={BTN_QUIET}
                    >
                      Keep auto-renewal
                    </button>
                  </div>
                </div>
              )}

              {actionError && !confirming && (
                <p className="mt-4 text-sm font-medium text-red-500">{actionError}</p>
              )}
            </div>
          </section>

          {/* ── Cancel + refund — ix-cancelrefund ─────────────────────────────
              Distinct from "Cancel auto-renewal" above: that schedules an end
              date and keeps everything paid-for until then. This is the
              14-day, no-certificate-issued refund /pricing promises, and it
              is immediate rather than scheduled. Copy here is a first draft —
              Max's to revise before this ships. */}
          <section>
            <h2 className={SECTION_HEADING}>Cancel and request a refund</h2>
            <div className={CARD}>
              {cancelRefundRequested ? (
                <p className={`text-sm ${MUTED}`}>
                  Your request has been sent to our team for review. We will follow up by email.
                </p>
              ) : !data.cancelRefundEligible ? (
                <div>
                  <span className={LABEL}>Not eligible for a refund</span>
                  <p className={`mt-1 text-sm ${MUTED}`}>
                    {(data.cancelRefundReasons.map(r => CANCEL_REFUND_REASON_COPY[r]).filter(Boolean).join(' ')) ||
                      'This purchase is outside the refund window.'}
                    {' '}To cancel auto-renewal instead, use the section above.
                  </p>
                </div>
              ) : !confirmingCancelRefund ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <div>
                    <span className={LABEL}>Cancel and request a refund</span>
                    <p className={`text-sm ${MUTED}`}>
                      You are within 14 days of purchase and no certificate has been issued yet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmingCancelRefund(true)}
                    className={BTN_QUIET}
                  >
                    Cancel and request a refund
                  </button>
                </div>
              ) : (
                <div>
                  <span className={LABEL}>Cancel and request a refund?</span>
                  <p className={`mt-3 text-sm leading-relaxed ${MUTED}`}>
                    This sends your cancellation and refund request to our team for review. It
                    does not cancel your subscription automatically — we will follow up by email
                    once it is processed.
                  </p>

                  {cancelRefundError && (
                    <p className="mt-4 text-sm font-medium text-red-500">{cancelRefundError}</p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void requestCancelRefund()}
                      disabled={cancelRefundSaving}
                      className={BTN_DANGER}
                    >
                      {cancelRefundSaving ? 'Sending…' : 'Yes, request cancellation and refund'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingCancelRefund(false)}
                      disabled={cancelRefundSaving}
                      className={BTN_QUIET}
                    >
                      Never mind
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
