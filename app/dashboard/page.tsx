import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteForm } from './_components/invite-form'
import { CsvUploadForm } from './_components/csv-upload-form'
import { TeamTable, type TrainingStatus } from './_components/team-table'
import { ReminderSettings } from './_components/reminder-settings'
import { ComplianceScore } from './_components/compliance-score'

export const metadata = {
  title: 'Dashboard — AI Staff Compliance Training',
}

const STATUS_SORT: Record<TrainingStatus, number> = {
  not_started: 0,
  in_progress: 1,
  passed: 2,
  expired: 3,
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  const role = user.app_metadata?.role as string | undefined

  if (!firmId) redirect('/login')

  const admin = createAdminClient()

  const [firmRes, seatsRes, membersRes] = await Promise.all([
    admin.from('firms').select('name, max_seats, status, reminder_days, current_period_end').eq('id', firmId).single(),
    admin.from('seats').select('used_seats, max_seats').eq('firm_id', firmId).single(),
    admin
      .from('firm_members')
      .select('id, user_id, role, status, invited_at, activated_at')
      .eq('firm_id', firmId)
      .neq('status', 'deleted')
      .neq('status', 'reassigned')
      .order('invited_at'),
  ])

  const firm = firmRes.data
  const seats = seatsRes.data
  const members = membersRes.data ?? []

  const userIds = members.map(m => m.user_id)

  // Batch-fetch auth users + training data in parallel — one query per table, not per member
  const [authUsers, enrollmentsRes, attemptsRes, certsRes] = await Promise.all([
    Promise.all(members.map(m => admin.auth.admin.getUserById(m.user_id))),
    userIds.length > 0
      ? admin.from('enrollments').select('user_id, status, completed_at').eq('firm_id', firmId).in('user_id', userIds)
      : Promise.resolve({ data: [] as { user_id: string; status: string; completed_at: string | null }[] }),
    userIds.length > 0
      ? admin.from('quiz_attempts').select('user_id, score, attempted_at').eq('firm_id', firmId).eq('passed', true).in('user_id', userIds).order('attempted_at', { ascending: false })
      : Promise.resolve({ data: [] as { user_id: string; score: number; attempted_at: string }[] }),
    userIds.length > 0
      ? admin.from('certificates').select('id, user_id, expires_at, issued_at').eq('firm_id', firmId).in('user_id', userIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string; expires_at: string; issued_at: string }[] }),
  ])

  // Index by user_id — for attempts, ordered DESC so first hit per user is the latest passing attempt
  const enrollmentByUser = Object.fromEntries(
    (enrollmentsRes.data ?? []).map(e => [e.user_id, e])
  )

  const attemptByUser: Record<string, { score: number; attempted_at: string }> = {}
  for (const a of (attemptsRes.data ?? [])) {
    if (!(a.user_id in attemptByUser)) attemptByUser[a.user_id] = a
  }

  const certByUser = Object.fromEntries(
    (certsRes.data ?? []).map(c => [c.user_id, c])
  )

  const now = new Date()

  const periodEnd = firm?.current_period_end ? new Date(firm.current_period_end) : null
  const daysOverdue = periodEnd ? Math.floor((now.getTime() - periodEnd.getTime()) / 86_400_000) : null
  const isGracePeriod = daysOverdue !== null && daysOverdue > 0 && daysOverdue <= 30
  const isLapsed     = daysOverdue !== null && daysOverdue > 30

  const memberDetails = members.map((m, i) => {
    const authUser = authUsers[i].data?.user
    const email = authUser?.email ?? '(unknown)'
    const name = (authUser?.user_metadata?.full_name as string | undefined) || email

    const enrollment = enrollmentByUser[m.user_id]
    const attempt = attemptByUser[m.user_id]
    const cert = certByUser[m.user_id]

    let trainingStatus: TrainingStatus
    if (!enrollment) {
      trainingStatus = 'not_started'
    } else if (cert) {
      trainingStatus = new Date(cert.expires_at) > now ? 'passed' : 'expired'
    } else {
      trainingStatus = 'in_progress'
    }

    return {
      ...m,
      email,
      name,
      trainingStatus,
      score: attempt?.score ?? null,
      completedAt: enrollment?.completed_at ?? null,
      certId: cert?.id ?? null,
    }
  })

  memberDetails.sort((a, b) => STATUS_SORT[a.trainingStatus] - STATUS_SORT[b.trainingStatus])

  const certifiedCount = memberDetails.filter(m => m.trainingStatus === 'passed').length
  const totalCount = memberDetails.length
  const complianceScore = totalCount > 0 ? Math.round((certifiedCount / totalCount) * 100) : 0

  const seatsUsed = seats?.used_seats ?? 0
  const seatsTotal = seats?.max_seats ?? firm?.max_seats ?? 0
  const seatsRemaining = seatsTotal - seatsUsed

  // ── Employee view ────────────────────────────────────────────────────────────
  if (role === 'employee') {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1
          className="text-2xl text-white mb-3"
          style={{ fontFamily: 'var(--font-gyrotrope)' }}
        >
          Welcome
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          Complete your AI compliance training to earn your certificate.
        </p>
        <Link
          href="/dashboard/training"
          className="inline-flex items-center rounded-lg bg-teal-500 hover:bg-teal-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors"
        >
          Go to training
        </Link>
      </main>
    )
  }

  // ── Admin view ───────────────────────────────────────────────────────────────
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      {/* Subscription status banners */}
      {isGracePeriod && daysOverdue !== null && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-200">
            Your subscription expired <strong>{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} ago</strong>.
            You have <strong>{30 - daysOverdue} day{30 - daysOverdue !== 1 ? 's' : ''}</strong> remaining
            to renew and maintain continuity of your compliance records.
          </p>
          <a
            href="/api/portal"
            className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors"
          >
            Renew now →
          </a>
        </div>
      )}
      {isLapsed && (
        <div className="mb-6 rounded-xl border border-red-600/30 bg-red-600/10 px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-red-300">
            <strong>Your grace period has ended.</strong> Renewing now will start a new subscription cycle.
            Your existing compliance records are preserved.
          </p>
          <a
            href="/api/portal"
            className="shrink-0 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            Renew now →
          </a>
        </div>
      )}

      {/* Firm header */}
      <div className="mb-6">
        <h1
          className="text-2xl text-white"
          style={{ fontFamily: 'var(--font-gyrotrope)' }}
        >
          {firm?.name ?? 'Your Firm'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {seatsUsed} of {seatsTotal} seats used
        </p>
      </div>

      {/* Compliance score hero */}
      <ComplianceScore score={complianceScore} certified={certifiedCount} total={totalCount} />

      {/* Invite section */}
      <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-sm font-medium text-zinc-200 mb-4">Invite a team member</h2>
        <InviteForm seatsRemaining={seatsRemaining} />
      </div>

      {/* Bulk CSV invite */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-sm font-medium text-zinc-200 mb-1">Bulk invite via CSV</h2>
        <p className="text-xs text-zinc-500 mb-4">Invite multiple team members at once by uploading a CSV file.</p>
        <CsvUploadForm seatsRemaining={seatsRemaining} />
      </div>

      {/* Member table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
            Your team
          </h2>
          <div className="flex items-center gap-2">
            <a
              href="/api/firm/audit-log/export"
              className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded px-3 py-1.5 transition-colors"
            >
              Export audit log (CSV)
            </a>
            <a
              href="/api/firm/attestation"
              className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded px-3 py-1.5 transition-colors"
            >
              Generate firm attestation (PDF)
            </a>
          </div>
        </div>
        <TeamTable memberDetails={memberDetails} />
      </div>

      {/* Auto-reminder settings */}
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4">
        <ReminderSettings initialDays={firm?.reminder_days ?? 7} />
        <p className="mt-1.5 text-xs text-zinc-600">
          Automatically email staff who haven&apos;t completed training after this many days.
        </p>
      </div>

      {/* Rule 5.3 explainer */}
      <details className="group mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-medium text-zinc-400 group-open:text-zinc-200 transition-colors">
            What this certificate means under ABA Model Rule 5.3
          </span>
          <svg
            className="w-4 h-4 text-zinc-600 group-open:rotate-90 transition-transform shrink-0 ml-4"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </summary>
        <div className="px-6 pb-6 border-t border-zinc-800">
          <ul className="mt-5 space-y-3">
            {[
              'This certificate documents that the named staff member completed structured AI compliance training and passed a scored assessment.',
              'It provides the supervising attorney with documented evidence of "reasonable efforts to supervise" as required under ABA Model Rule 5.3.',
              'ABA Formal Opinion 512 (2024) extended Rule 5.3 to AI tools — attorneys are personally responsible if staff misuse AI and no training was in place.',
              'Certificates are valid for 12 months and should be renewed annually as AI guidance evolves.',
              'This certificate does not constitute accreditation by the ABA or any state bar.',
            ].map((point, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-400 leading-relaxed">
                <span className="text-zinc-600 shrink-0 mt-px">→</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </main>
  )
}
