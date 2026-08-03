'use client'

import { useTeam } from './team-table'
import { hasTrainingAccess } from '@/lib/seats'

const CARD = 'rounded-3xl bg-white p-6 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING = 'font-headline text-2xl md:text-3xl font-bold text-[#0A0A0A] dark:text-[#F5F7FA]'
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
 *
 * Every figure here — the "X of Y" readout, the progress bar and the "who's
 * left" avatar stack — is computed over seat-holders only, NOT over the full
 * roster the table renders. See the filter below.
 */
export function CertificationForecast() {
  const { visible } = useTeam()

  const now = Date.now()

  // Forecast only over members who can actually BE certified. `visible` is the
  // team roster and rightly still lists an admin who declined training, but they
  // hold no seat, are gated out of the course, and can never pass — so counting
  // them inflated "Certified so far — X of Y" and left `remainingSeats` with a
  // floor it could never clear, which is a projection that never completes.
  //
  // hasTrainingAccess is the same predicate the seat trigger (0015) and the
  // training gate use — reused rather than re-derived here.
  const certifiable = visible.filter(hasTrainingAccess)

  const total = certifiable.length
  const remainingMembers = certifiable.filter(m => m.trainingStatus !== 'passed')
  const remainingSeats = remainingMembers.length
  const certifiedCount = total - remainingSeats
  const fullyCertified = total > 0 && remainingSeats === 0

  const certifiedLast7Days = certifiable.filter(m => {
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
    const issuedTimes = certifiable
      .map(m => (m.certIssuedAt ? new Date(m.certIssuedAt).getTime() : null))
      .filter((t): t is number => t !== null)
    flexActual = Math.max(1, Math.round((now - Math.min(...issuedTimes)) / DAY_MS))
    flexProjected = Math.max(projectedDays, 1)
  }

  const certifiedPct = total > 0 ? Math.round((certifiedCount / total) * 100) : 0

  return (
    <div className={`${CARD} flex h-full flex-col`}>
      <h2 className={`${HEADING} mb-5`}>Certification Forecast</h2>

      {/* The three content blocks fill the card by being sized generously, not by
          gap-stretching between them — gap-8 is a fixed rhythm, not a filler. */}
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-8">
        {hasProjection || fullyCertified ? (
          <div className="rounded-2xl bg-[#EAF8FF] px-7 py-8 dark:bg-[var(--brand-emphasis)]/10">
            <p className="mb-3 text-xl font-semibold text-[var(--brand-emphasis)] dark:text-[var(--brand-primary)]">
              Projected Fully Certified
            </p>
            {fullyCertified ? (
              <p className="text-[44px] font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
                Fully certified
              </p>
            ) : (
              <>
                <p className="mb-3 text-[44px] font-bold leading-none text-[#0A0A0A] dark:text-[#F5F7FA]">
                  {projectedDateLabel}
                </p>
                <p className="flex items-center gap-1 text-lg font-semibold text-[#16A34A]">
                  ↗ Pace picking up — {certifiedLast7Days} certified in the last 7 days
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-[#F5F7FA] px-7 py-8 dark:bg-[#131A20]">
            <p className={`mb-3 text-xl font-semibold ${MUTED}`}>Projected Fully Certified</p>
            <p className="mb-3 text-2xl font-medium text-[#6B7684] dark:text-[#9AA3AC]">
              Not enough recent activity to project a date yet
            </p>
            <p className={`flex items-center gap-1 text-lg font-semibold ${MUTED}`}>
              No certifications in the last 7 days
            </p>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between text-base font-semibold text-[#6B7684] dark:text-[#9AA3AC]">
            <span>Certified so far</span>
            <span>
              {certifiedCount} of {total}
            </span>
          </div>
          <div className="mb-2 flex h-3.5 overflow-hidden rounded bg-[#F0F3F7] dark:bg-[#1F2429]">
            {hasProjection ? (
              <>
                <div
                  style={{
                    flexGrow: flexActual,
                    background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-emphasis) 100%)',
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
                  background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-emphasis) 100%)',
                }}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-[#98A2AD]">
            <span>First invite</span>
            <span className="font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">Today</span>
            <span className="italic">{hasProjection ? 'Projected finish (est.)' : ' '}</span>
          </div>
        </div>

        {remainingSeats > 0 && (
          <div className="flex">
            {remainingMembers.slice(0, 3).map((m, i) =>
              m.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- no next/image remote-pattern config in this project; plain <img> matches the codebase convention
                <img
                  key={m.id}
                  src={m.avatarUrl}
                  alt=""
                  className="-ml-2.5 h-11 w-11 rounded-full border-2 border-white object-cover first:ml-0 dark:border-[#0D0F12]"
                />
              ) : (
                <span
                  key={m.id}
                  className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-base font-bold text-white first:ml-0 dark:border-[#0D0F12]"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {m.name.charAt(0).toUpperCase()}
                </span>
              )
            )}
            {remainingSeats > 3 && (
              <span className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#EAF1F8] text-base font-bold text-[#6B7684] first:ml-0 dark:border-[#0D0F12] dark:bg-[#1A1F24] dark:text-[#9AA3AC]">
                +{remainingSeats - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
