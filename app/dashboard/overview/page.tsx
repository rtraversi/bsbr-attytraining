import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'
import { clientQuestionsByLesson } from '@/lib/training/questions'
import { READINESS_LESSON } from '@/lib/training/lessons'
import { OverviewClient, type ActivityItem } from './_components/overview-client'

export const metadata = {
  title: 'Overview — IURIX',
}

// Recent activity surfaces both halves of the training: the knowledge checks and
// the SCORM course content — including per-lesson boundary events (0012), which
// carry a lessonNumber. The video_* events are course-level (one row per learner).
const ACTIVITY_TYPES = [
  'knowledge_check_completed',
  'video_started',
  'video_completed',
  'lesson_location_changed',
] as const
const ACTIVITY_LIMIT = 4 // 2 shown collapsed + 2 revealed on expand

// Deliberately larger than ACTIVITY_LIMIT. Repeat `video_started` rows are
// collapsed AFTER the query (see below), so without headroom a run of launches
// would still consume the fetch budget and the feed would simply get shorter
// rather than showing more real events. Still bounded, so a heavy user can't
// pull an unbounded history into a page render.
const ACTIVITY_FETCH_LIMIT = 40

export default async function OverviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  const role = user.app_metadata?.role as string | undefined
  if (!firmId) redirect('/login')
  // The training experience (Overview/Training/Quizzes) is open to employees AND
  // admins taking their own training — the shell is route-based (see DashboardShell).
  if (role !== 'employee' && role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('firm_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('firm_id', firmId)
    .maybeSingle()

  let events: KnowledgeCheckEvent[] = []
  let activity: ActivityItem[] = []
  // Real SCORM content progress (0012) — highest lesson boundary reached, and
  // whether the course reported completion. Same derivation as training/page.tsx.
  let currentLessonNumber: number | null = null
  let contentViewed = false

  if (member) {
    const [checksResult, activityResult, lessonLocationResult, contentResult] = await Promise.all([
      admin
        .from('training_events')
        .select('metadata, event_timestamp')
        .eq('firm_member_id', member.id)
        .eq('event_type', 'knowledge_check_completed')
        .order('event_timestamp', { ascending: true }),
      admin
        .from('training_events')
        .select('event_type, metadata, event_timestamp')
        .eq('firm_member_id', member.id)
        .in('event_type', [...ACTIVITY_TYPES])
        .order('event_timestamp', { ascending: false })
        .limit(ACTIVITY_FETCH_LIMIT),
      // Most recent lesson boundary → current lesson number.
      admin
        .from('training_events')
        .select('metadata')
        .eq('firm_member_id', member.id)
        .eq('event_type', 'lesson_location_changed')
        .order('event_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Course content completed? (verified — a video_completed event exists.)
      admin
        .from('training_events')
        .select('id')
        .eq('firm_member_id', member.id)
        .eq('event_type', 'video_completed')
        .limit(1)
        .maybeSingle(),
    ])

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

    const activityRows = (activityResult.data ?? []).map(r => {
      const m = (r.metadata ?? {}) as Record<string, unknown>
      const at = r.event_timestamp as string

      if (r.event_type === 'knowledge_check_completed') {
        return {
          kind: 'knowledge_check' as const,
          lesson: Number(m.lesson),
          score: Number(m.score),
          passed: m.passed === true,
          at,
        }
      }
      if (r.event_type === 'lesson_location_changed') {
        const ln = Number(m.lessonNumber)
        return {
          kind: 'lesson_location_changed' as const,
          lesson: null,
          lessonNumber: Number.isInteger(ln) ? ln : null,
          score: null,
          passed: true,
          at,
        }
      }
      // video_started / video_completed carry no lesson — the SCORM package
      // reports course-level completion only (one row per learner).
      return {
        kind: r.event_type === 'video_completed' ? ('content_completed' as const) : ('content_started' as const),
        lesson: null,
        score: null,
        passed: true,
        at,
      }
    })

    // Collapse repeat "Started the training content" entries to a single item —
    // DISPLAY ONLY.
    //
    // Every launch of the course appends its own video_started row and that is
    // deliberate, not a bug: api/training/content-progress/route.ts records one
    // row per launch as real audit signal (when did this employee open the
    // course, and how often), and api/firm/audit-log/export/route.ts reads those
    // rows verbatim — with ip_address and user_agent — to produce the compliance
    // paper trail a firm uses to evidence Rule 5.3 supervision. Deduping at the
    // source would quietly degrade the thing this product exists to produce.
    // So the rows stay; only this feed stops repeating them.
    //
    // Keeps the MOST RECENT occurrence (rows arrive newest-first, so it is the
    // first one seen): this is a "recent activity" feed, and the last time they
    // opened the course is the fact that belongs in it. All repeats collapse
    // into that one entry, not just consecutive runs, so a launch either side of
    // a knowledge check still yields a single entry.
    let seenContentStarted = false
    activity = activityRows
      .filter(item => {
        if (item.kind !== 'content_started') return true
        if (seenContentStarted) return false
        seenContentStarted = true
        return true
      })
      .slice(0, ACTIVITY_LIMIT)

    const locMeta = (lessonLocationResult.data?.metadata ?? null) as Record<string, unknown> | null
    const rawLessonNumber = Number(locMeta?.lessonNumber)
    currentLessonNumber = Number.isInteger(rawLessonNumber) ? rawLessonNumber : null
    contentViewed = contentResult.data !== null
  }

  const progress = deriveProgress(events, contentViewed)

  // Certificate state drives the (quiet, bottom-of-page) certificate block.
  // Same lookup chain as app/dashboard/quizzes/page.tsx: course → enrollment → cert → signed URL.
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

  const firstName = ((user.user_metadata?.full_name as string | undefined) ?? '').trim().split(' ')[0] || null

  return (
    <OverviewClient
      progress={progress}
      questionsByLesson={clientQuestionsByLesson()}
      firstName={firstName}
      activity={activity}
      certUrl={certUrl}
      currentLessonNumber={currentLessonNumber}
      contentViewed={contentViewed}
    />
  )
}
