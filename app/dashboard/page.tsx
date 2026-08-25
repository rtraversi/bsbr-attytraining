import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasTrainingAccess } from '@/lib/seats'
import { AdminDashboard } from './_components/admin-dashboard'
import type { TrainingStatus } from './_components/team-table'

export const metadata = {
  title: 'Dashboard — IURIX',
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

  // Employees get the multi-section training experience (Overview/Training/Quizzes),
  // not the admin dashboard. Redirect before running any admin-only queries.
  if (role === 'employee') redirect('/dashboard/overview')

  const admin = createAdminClient()

  const [firmRes, seatsRes, membersRes] = await Promise.all([
    admin.from('firms').select('name, max_seats, status, tier, current_period_end').eq('id', firmId).single(),
    admin.from('seats').select('used_seats, max_seats').eq('firm_id', firmId).single(),
    admin
      .from('firm_members')
      .select('id, user_id, role, status, occupies_seat, invited_at, activated_at, invite_email_failed')
      .eq('firm_id', firmId)
      .neq('status', 'deleted')
      .neq('status', 'reassigned')
      .order('invited_at'),
  ])

  const firm = firmRes.data
  const seats = seatsRes.data
  const members = membersRes.data ?? []

  const userIds = members.map(m => m.user_id)
  const memberIds = members.map(m => m.id)

  // Batch-fetch auth users + training data in parallel — one query per table, not per member
  const [authUsers, enrollmentsRes, attemptsRes, certsRes, eventsRes] = await Promise.all([
    Promise.all(members.map(m => admin.auth.admin.getUserById(m.user_id))),
    // Ordered newest-first. 0007 dropped the unique constraint on
    // (firm_id, user_id, course_id) so that each renewal inserts a FRESH
    // enrollment row, which means a renewed firm has several per person and an
    // unordered read collapses to an arbitrary one.
    userIds.length > 0
      ? admin.from('enrollments').select('user_id, status, completed_at, enrolled_at').eq('firm_id', firmId).in('user_id', userIds).order('enrolled_at', { ascending: false })
      : Promise.resolve({ data: [] as { user_id: string; status: string; completed_at: string | null; enrolled_at: string }[] }),
    userIds.length > 0
      ? admin.from('quiz_attempts').select('user_id, score, attempted_at').eq('firm_id', firmId).eq('passed', true).in('user_id', userIds).order('attempted_at', { ascending: false })
      : Promise.resolve({ data: [] as { user_id: string; score: number; attempted_at: string }[] }),
    // Also newest-first, and for the same reason. certificates is unique per
    // ENROLLMENT, not per user, so someone who has renewed holds one per term.
    userIds.length > 0
      ? admin.from('certificates').select('id, user_id, expires_at, issued_at, certificate_number').eq('firm_id', firmId).in('user_id', userIds).order('issued_at', { ascending: false })
      : Promise.resolve({ data: [] as { id: string; user_id: string; expires_at: string; issued_at: string; certificate_number: string }[] }),
    // An `enrollments` row is only created at first quiz attempt (see
    // /api/quiz/attempt) — everything before that (opening the course, lesson
    // checks, lesson boundaries) is recorded in training_events keyed to the
    // firm_member id. Without this, a member actively working through the
    // course shows as "Not started" until they reach the quiz.
    memberIds.length > 0
      ? admin.from('training_events').select('firm_member_id').eq('firm_id', firmId).in('firm_member_id', memberIds)
      : Promise.resolve({ data: [] as { firm_member_id: string }[] }),
  ])

  // Index by user_id. ALL THREE queries above are ordered newest-first and all
  // three collapse first-hit-wins, so each person resolves to their CURRENT
  // term.
  //
  // Object.fromEntries was the wrong tool here and was doing real damage: it
  // keeps the LAST entry for a repeated key, so on an unordered read it picked
  // an arbitrary row, and on a newest-first read it would pick the OLDEST.
  // Either way a renewed firm's dashboard could show a member as "Expired" from
  // last year's certificate on the day after they recertified — the one screen
  // an attorney uses to check their firm is compliant, quietly reporting that it
  // is not.
  //
  // Nothing was wrong before 0007, which dropped the unique constraint on
  // enrollments so renewals could insert a fresh row per term. That made
  // multiple rows per user possible and turned a safe collapse into an arbitrary
  // one. certificates has the same shape for the same reason: unique per
  // ENROLLMENT, so one per term.
  const firstPerUser = <T extends { user_id: string }>(rows: T[]): Record<string, T> => {
    const byUser: Record<string, T> = {}
    for (const row of rows) {
      if (!(row.user_id in byUser)) byUser[row.user_id] = row
    }
    return byUser
  }

  const enrollmentByUser = firstPerUser(enrollmentsRes.data ?? [])
  const attemptByUser = firstPerUser(attemptsRes.data ?? [])
  const certByUser = firstPerUser(certsRes.data ?? [])

  const startedMemberIds = new Set((eventsRes.data ?? []).map(e => e.firm_member_id))

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
      trainingStatus = startedMemberIds.has(m.id) ? 'in_progress' : 'not_started'
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
      certNumber: cert?.certificate_number ?? null,
      certIssuedAt: cert?.issued_at ?? null,
      certExpiresAt: cert?.expires_at ?? null,
    }
  })

  memberDetails.sort((a, b) => STATUS_SORT[a.trainingStatus] - STATUS_SORT[b.trainingStatus])

  // Only seat-holders can ever be certified, so only they belong in the
  // denominator. An admin who declined training at onboarding holds no seat and
  // is gated out of the course entirely — counting them made 100% unreachable
  // for that firm, which under the all-or-none accreditation rule (Katy, legal
  // read 2026-07-30) would mean it could never be accredited at all.
  //
  // hasTrainingAccess is the same predicate the seat trigger (0015) and the
  // training gate use. Reused, not re-derived: a third copy of this rule
  // drifting out of sync is exactly how the original seat double-count happened.
  const certifiableMembers = memberDetails.filter(hasTrainingAccess)
  const certifiedCount = certifiableMembers.filter(m => m.trainingStatus === 'passed').length
  const totalCount = certifiableMembers.length
  // Was Math.round, which let 199/200 render as "100%" — and 100 is the one
  // number on this card that is a claim rather than a measurement (it drives the
  // gold state and the "Fully certified" band). Floor instead, so 100 is
  // reachable only by certifiedCount === totalCount, stated explicitly here
  // rather than left to depend on floor's behaviour.
  //
  // The floor has the mirror problem at the bottom — 1/101 floors to 0 and would
  // read "Not started" with somebody already certified — so 0 is guarded the
  // same way: it means nobody, and anything above nobody is at least 1%.
  const complianceScore =
    totalCount === 0
      ? 0
      : certifiedCount === totalCount
        ? 100
        : certifiedCount === 0
          ? 0
          : Math.max(1, Math.floor((certifiedCount / totalCount) * 100))

  const seatsUsed = seats?.used_seats ?? 0
  const seatsTotal = seats?.max_seats ?? firm?.max_seats ?? 0

  return (
    <AdminDashboard
      memberDetails={memberDetails}
      currentUserId={user.id}
      totalCount={totalCount}
      complianceScore={complianceScore}
      seatsUsed={seatsUsed}
      seatsTotal={seatsTotal}
      seatsRemaining={seatsTotal - seatsUsed}
      firmStatus={firm?.status ?? 'active'}
      tier={firm?.tier ?? 'standard'}
      renewalDate={
        periodEnd
          ? periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—'
      }
      daysOverdue={daysOverdue}
      isGracePeriod={isGracePeriod}
      isLapsed={isLapsed}
    />
  )
}
