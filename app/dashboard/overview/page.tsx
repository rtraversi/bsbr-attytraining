import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'
import { clientQuestionsByLesson } from '@/lib/training/questions'
import { READINESS_LESSON } from '@/lib/training/lessons'
import { OverviewClient } from './_components/overview-client'

export const metadata = {
  title: 'Overview — AI Staff Compliance Training',
}

export default async function OverviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  const role = user.app_metadata?.role as string | undefined
  if (!firmId) redirect('/login')
  // The employee Overview/gating experience is employee-only; admins have the dashboard.
  if (role !== 'employee') redirect('/dashboard')

  const admin = createAdminClient()

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
  const firstName = ((user.user_metadata?.full_name as string | undefined) ?? '').trim().split(' ')[0] || null

  return (
    <OverviewClient
      progress={progress}
      questionsByLesson={clientQuestionsByLesson()}
      firstName={firstName}
    />
  )
}
