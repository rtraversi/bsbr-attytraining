import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'
import { clientQuestionsByLesson } from '@/lib/training/questions'
import { READINESS_LESSON } from '@/lib/training/lessons'
import { QuizzesClient } from './_components/quizzes-client'

export const metadata = {
  title: 'Quizzes — AI Staff Compliance Training',
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
  if (role !== 'employee') redirect('/dashboard')

  const admin = createAdminClient()

  // Knowledge-check progress (same data layer as Overview) ─────────────────────
  const { data: member } = await admin
    .from('firm_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('firm_id', firmId)
    .maybeSingle()

  let events: KnowledgeCheckEvent[] = []
  if (member) {
    const { data: rows } = await admin
      .from('training_events')
      .select('metadata, event_timestamp')
      .eq('firm_member_id', member.id)
      .eq('event_type', 'knowledge_check_completed')
      .order('event_timestamp', { ascending: true })

    events = (rows ?? [])
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

  const progress = deriveProgress(events)

  // Real certificate state drives the Certificate block's locked/unlocked look.
  // (The final assessment itself is a later stage; until it exists, an issued
  //  certificate is the authoritative "passed" signal.)
  let certUrl: string | null = null
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
      const { data: cert } = await admin
        .from('certificates')
        .select('storage_path')
        .eq('enrollment_id', enrollment.id)
        .maybeSingle()

      if (cert?.storage_path) {
        const { data: signed } = await admin.storage
          .from('certificates')
          .createSignedUrl(cert.storage_path, 60 * 60 * 24 * 7)
        certUrl = signed?.signedUrl ?? null
      }
    }
  }

  const firstName =
    ((user.user_metadata?.full_name as string | undefined) ?? '').trim().split(' ')[0] || null

  return (
    <QuizzesClient
      progress={progress}
      questionsByLesson={clientQuestionsByLesson()}
      certUrl={certUrl}
      firstName={firstName}
    />
  )
}
