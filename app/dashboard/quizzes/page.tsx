import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'
import { clientQuestionsByLesson } from '@/lib/training/questions'
import { READINESS_LESSON } from '@/lib/training/lessons'
import { SEAT_ACCESS_COLUMNS, hasTrainingAccess, type SeatAccessRow } from '@/lib/seats'
import { SeatGate } from '../_components/no-seat-notice'
import { QuizzesClient } from './_components/quizzes-client'

export const metadata = {
  title: 'Quizzes — IURIX',
}

export default async function QuizzesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  const role = user.app_metadata?.role as string | undefined
  if (!firmId) redirect('/login')
  // Open to employees AND admins taking their own training (shell is route-based).
  if (role !== 'employee' && role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  // Knowledge-check progress (same data layer as Overview) ─────────────────────
  const { data: member } = await admin
    .from('firm_members')
    .select(`id, ${SEAT_ACCESS_COLUMNS}`)
    .eq('user_id', user.id)
    .eq('firm_id', firmId)
    .maybeSingle()

  // Seat gate — see lib/seats.ts. Same predicate as the seat-count trigger.
  if (!hasTrainingAccess(member as SeatAccessRow | null)) {
    return <SeatGate member={member} />
  }

  let events: KnowledgeCheckEvent[] = []
  // Real SCORM content completion — gates the lesson-5 shortcut and softens the
  // assessment copy. Same existence-check pattern as overview/page.tsx.
  let contentViewed = false
  if (member) {
    const [checksResult, contentResult] = await Promise.all([
      admin
        .from('training_events')
        .select('metadata, event_timestamp')
        .eq('firm_member_id', member.id)
        .eq('event_type', 'knowledge_check_completed')
        .order('event_timestamp', { ascending: true }),
      admin
        .from('training_events')
        .select('id')
        .eq('firm_member_id', member.id)
        .eq('event_type', 'video_completed')
        .limit(1)
        .maybeSingle(),
    ])

    contentViewed = contentResult.data !== null
    events = (checksResult.data ?? [])
      .map(r => {
        const m = (r.metadata ?? {}) as Record<string, unknown>
        return {
          lesson: Number(m.lesson),
          score: Number(m.score),
          passed: m.passed === true,
          attemptNumber: Number(m.attemptNumber ?? 0),
          created_at: r.event_timestamp as string,
        }
      })
      .filter(e => Number.isInteger(e.lesson) && e.lesson >= 1 && e.lesson <= READINESS_LESSON)
  }

  const progress = deriveProgress(events, contentViewed)

  // Real certificate state drives the Certificate block's locked/unlocked look.
  // The Quizzes tab is now the one place cert details + the download modal
  // live, so fetch the full cert row (no signed URL here — CertPreviewModal
  // fetches one on demand via /api/certificates/[id]/url).
  let cert: { id: string; number: string | null; issuedAt: string | null; expiresAt: string | null } | null =
    null
  const { data: course } = await admin.from('courses').select('id').limit(1).maybeSingle()
  if (course) {
    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (enrollment) {
      const { data: certRow } = await admin
        .from('certificates')
        .select('id, certificate_number, issued_at, expires_at')
        .eq('enrollment_id', enrollment.id)
        .maybeSingle()

      if (certRow) {
        cert = {
          id: certRow.id,
          number: certRow.certificate_number,
          issuedAt: certRow.issued_at,
          expiresAt: certRow.expires_at,
        }
      }
    }
  }

  const firstName =
    ((user.user_metadata?.full_name as string | undefined) ?? '').trim().split(' ')[0] || null
  const employeeName = (user.user_metadata?.full_name as string | undefined) || user.email || ''

  return (
    <QuizzesClient
      progress={progress}
      questionsByLesson={clientQuestionsByLesson()}
      cert={cert}
      employeeName={employeeName}
      firstName={firstName}
      contentViewed={contentViewed}
    />
  )
}
