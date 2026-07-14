'use client'

import { useTeam } from './team-table'

const CARD = 'rounded-3xl bg-white p-6 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING = 'font-headline text-xl md:text-2xl font-bold text-[#0A0A0A] dark:text-[#F5F7FA]'
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

const DAY_MS = 86_400_000
const AVATAR_COLORS = ['#6FB8F2', '#B45309', '#8A8A8A']

/**
 * Certification Forecast — projects a full-certification date off the firm's
 * real recent pace (certs issued in the last 7 days), per the locked sketch.
 * Reads the same member data as the Manage team table via useTeam, so a delete
 * there updates this card live; no extra query. When there's no recent pace it
 * falls back to a flat "not enough activity" state rather than fabricating a
 * date (and never divides by zero).
 */
export function CertificationForecast() {
  const { visible } = useTeam()

  const now = Date.now()
  const total = visible.length
  const remainingMembers = visible.filter(m => m.trainingStatus !== 'passed')
  const remainingSeats = remainingMembers.length
  const certifiedCount = total - remainingSeats
  const fullyCertified = total > 0 && remainingSeats === 0

  const certifiedLast7Days = visible.filter(m => {
    if (!m.certIssuedAt) return false
    const age = now - new Date(m.certIssuedAt).getTime()
    return age >= 0 && age <= 7 * DAY_MS
  }).length

  const ratePerDay = certifiedLast7Days / 7
  const hasProjection = ratePerDay > 0 && remainingSeats > 0

  // Bar proportions: solid = time elapsed since the first certificate, striped =
  // projected days remaining (mirrors the sketch's calc). Only computed when a
  // projection exists — which guarantees at least one issued cert to anchor on.
  let projectedDateLabel = ''
  let flexActual = 1
  let flexProjected = 0
  if (hasProjection) {
    const projectedDays = Math.ceil(remainingSeats / ratePerDay)
    projectedDateLabel = new Date(now + projectedDays * DAY_MS).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const issuedTimes = visible
      .map(m => (m.certIssuedAt ? new Date(m.certIssuedAt).getTime() : null))
      .filter((t): t is number => t !== null)
    flexActual = Math.max(1, Math.round((now - Math.min(...issuedTimes)) / DAY_MS))
    flexProjected = Math.max(projectedDays, 1)
  }

  const certifiedPct = total > 0 ? Math.round((certifiedCount / total) * 100) : 0

  return (
    <div className={`${CARD} flex h-full flex-col`}>
      <h2 className={HEADING}>Certification Forecast</h2>
      <p className={`mb-5 mt-1 text-xs ${MUTED}`}>Projected pace to full certification.</p>

      {hasProjection || fullyCertified ? (
        <div className="mb-5 rounded-2xl bg-[#EAF8FF] px-5 py-[18px] dark:bg-[#0094FF]/10">
          <p className="mb-1.5 text-[13px] font-semibold text-[#0094FF] dark:text-[#32C7FF]">
            Projected Fully Certified
          </p>
          {fullyCertified ? (
            <p className="text-[22px] font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
              Fully certified
            </p>
          ) : (
            <>
              <p className="mb-1.5 text-[22px] font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
                {projectedDateLabel}
              </p>
              <p className="flex items-center gap-1 text-xs font-semibold text-[#16A34A]">
                ↗ Pace picking up — {certifiedLast7Days} certified in the last 7 days
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="mb-5 rounded-2xl bg-[#F5F7FA] px-5 py-[18px] dark:bg-[#131A20]">
          <p className={`mb-1.5 text-[13px] font-semibold ${MUTED}`}>Projected Fully Certified</p>
          <p className="mb-1.5 text-sm font-medium text-[#6B7684] dark:text-[#9AA3AC]">
            Not enough recent activity to project a date yet
          </p>
          <p className={`flex items-center gap-1 text-xs font-semibold ${MUTED}`}>
            No certifications in the last 7 days
          </p>
        </div>
      )}

      <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-[#6B7684] dark:text-[#9AA3AC]">
        <span>Certified so far</span>
        <span>
          {certifiedCount} of {total}
        </span>
      </div>
      <div className="mb-2 flex h-2 overflow-hidden rounded bg-[#F0F3F7] dark:bg-[#1F2429]">
        {hasProjection ? (
          <>
            <div
              style={{
                flexGrow: flexActual,
                background: 'linear-gradient(90deg, #32C7FF 0%, #0094FF 100%)',
              }}
            />
            <div
              style={{
                flexGrow: flexProjected,
                background: 'repeating-linear-gradient(110deg, #CDEBFF 0 6px, #E3F3FF 6px 12px)',
              }}
            />
          </>
        ) : (
          <div
            style={{
              width: `${certifiedPct}%`,
              background: 'linear-gradient(90deg, #32C7FF 0%, #0094FF 100%)',
            }}
          />
        )}
      </div>
      <div className="mb-5 flex items-center justify-between text-[10.5px] text-[#98A2AD]">
        <span>First invite</span>
        <span className="font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">Today</span>
        <span className="italic">{hasProjection ? 'Projected finish (est.)' : ' '}</span>
      </div>

      {remainingSeats > 0 && (
        <div className="mt-auto flex items-center gap-2.5">
          <div className="flex">
            {remainingMembers.slice(0, 3).map((m, i) => (
              <span
                key={m.id}
                className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white first:ml-0 dark:border-[#0D0F12]"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {m.name.charAt(0).toUpperCase()}
              </span>
            ))}
            {remainingSeats > 3 && (
              <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#EAF1F8] text-[11px] font-bold text-[#6B7684] first:ml-0 dark:border-[#0D0F12] dark:bg-[#1A1F24] dark:text-[#9AA3AC]">
                +{remainingSeats - 3}
              </span>
            )}
          </div>
          {/* Best-effort scroll for now (no filtering yet). On lg+ the page
              doesn't scroll and the table is already on screen, so it's a no-op
              there; on mobile it scrolls the stacked layout up to the table. */}
          <a
            href="#manage-team"
            onClick={e => {
              e.preventDefault()
              document.getElementById('manage-team')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="ml-auto text-xs font-bold text-[#0094FF] hover:underline dark:text-[#32C7FF]"
          >
            View who&apos;s left &rarr;
          </a>
        </div>
      )}
    </div>
  )
}
