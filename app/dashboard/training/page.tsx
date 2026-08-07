import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'
import { READINESS_LESSON } from '@/lib/training/lessons'
import { clientQuestionsByLesson } from '@/lib/training/questions'
import { SEAT_ACCESS_COLUMNS, hasTrainingAccess } from '@/lib/seats'
import { SeatGate } from '../_components/no-seat-notice'
import { TrainingClient } from './_components/training-client'

export const metadata = {
  title: 'Training — IURIX',
}

// The certification question set is NOT chosen here any more.
//
// This page used to shuffle the active pool, slice QUESTIONS_PER_ATTEMPT off
// it, and thread the result down to the quiz component — which meant the exam
// was whatever the client posted back at submit time, and one known answer
// scored 100% (ix-quizforge). Selection now happens in /api/quiz/start, which
// records the chosen set in quiz_sessions so /api/quiz/attempt can grade
// against it. QUESTIONS_PER_ATTEMPT and the shuffle live in
// lib/training/assessment.ts.
export default async function TrainingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  if (!firmId) redirect('/login')

  const userId = user.id
  const admin = createAdminClient()

  // Per-lesson knowledge-check questions for the soft-nag quiz (same call as
  // overview/page.tsx and quizzes/page.tsx). Pure/local — no DB round-trip.
  const questionsByLesson = clientQuestionsByLesson()

  // Course + firm member resolve independently — fetch together.
  type CourseRow = {
    id: string
    title: string
    pass_threshold: number | null
  }
  type MemberRow = {
    id: string
    scorm_suspend_data: string | null
    scorm_lesson_location: string | null
    role: string
    status: string
    occupies_seat: boolean
  }
  const [courseResult, memberResult] = await Promise.all([
    admin.from('courses').select('id, title, pass_threshold').limit(1).maybeSingle(),
    admin
      .from('firm_members')
      .select(`id, scorm_suspend_data, scorm_lesson_location, ${SEAT_ACCESS_COLUMNS}`)
      .eq('user_id', userId)
      .eq('firm_id', firmId)
      .maybeSingle(),
  ])

  const course = courseResult.data as CourseRow | null
  const member = memberResult.data as MemberRow | null

  // Seat gate — a firm_id alone is not entitlement. Mirrors the same predicate
  // the seat-count trigger uses, so access and billing can't drift apart.
  if (!hasTrainingAccess(member)) {
    return <SeatGate member={member} />
  }

  const courseTitle = course?.title ?? 'Responsible Use of AI within the Legal Industry'

  if (!course) {
    return (
      <TrainingClient
        phase="not_started"
        courseTitle={courseTitle}
        courseId={null}
        questionsByLesson={questionsByLesson}
        checksCleared={false}
        contentViewed={false}
      />
    )
  }

  // Fetch enrollment + both halves of the assessment gate in parallel.
  // The certification question pool is deliberately NOT among these — see the
  // note above the component.
  type KcRow = { metadata: unknown; event_timestamp: string }
  const [enrollmentResult, kcResult, contentResult, lessonLocationResult] =
    await Promise.all([
      admin
        .from('enrollments')
        .select('id, status, completed_at, total_training_seconds')
        .eq('user_id', userId)
        .eq('course_id', course.id)
        .order('enrolled_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    // Gate half 1 — lesson checks cleared (same derivation as overview/quizzes pages)
    member
      ? admin
          .from('training_events')
          .select('metadata, event_timestamp')
          .eq('firm_member_id', member.id)
          .eq('event_type', 'knowledge_check_completed')
          .order('event_timestamp', { ascending: true })
      : Promise.resolve({ data: [] as KcRow[] }),
    // Gate half 2 — SCORM content actually completed (verified, not self-reported)
    member
      ? admin
          .from('training_events')
          .select('id')
          .eq('firm_member_id', member.id)
          .eq('event_type', 'video_completed')
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Resume point — the member's most recent lesson boundary (metadata.location
    // seeds SCORM resume; metadata.lessonNumber drives the honest progress bar).
    member
      ? admin
          .from('training_events')
          .select('metadata')
          .eq('firm_member_id', member.id)
          .eq('event_type', 'lesson_location_changed')
          .order('event_timestamp', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null as { metadata: unknown } | null }),
  ])

  type EnrollmentRow = {
    id: string
    status: string
    completed_at: string | null
    total_training_seconds: number | null
  }
  const enrollment = enrollmentResult.data as EnrollmentRow | null

  // Resume point + honest-progress inputs. currentLessonNumber (progress bar)
  // comes from the latest lesson event; the resume seeds prefer the member's
  // stored (suspend_data, lesson_location) pair — Rise's actual resume payload —
  // falling back to the event-derived location for members provisioned pre-0012.
  const locMeta = (lessonLocationResult.data?.metadata ?? null) as Record<string, unknown> | null
  const rawLessonNumber = Number(locMeta?.lessonNumber)
  const currentLessonNumber = Number.isInteger(rawLessonNumber) ? rawLessonNumber : null
  const initialSuspendData = member?.scorm_suspend_data ?? undefined
  const initialLocation =
    member?.scorm_lesson_location ??
    (typeof locMeta?.location === 'string' ? locMeta.location : undefined)
  const totalTrainingSeconds = enrollment?.total_training_seconds ?? 0

  const kcEvents: KnowledgeCheckEvent[] = ((kcResult.data ?? []) as KcRow[])
    .map(r => {
      const m = (r.metadata ?? {}) as Record<string, unknown>
      return {
        lesson: Number(m.lesson),
        score: Number(m.score),
        passed: m.passed === true,
        attemptNumber: Number(m.attemptNumber ?? 0),
        created_at: r.event_timestamp,
      }
    })
    .filter(e => Number.isInteger(e.lesson) && e.lesson >= 1 && e.lesson <= READINESS_LESSON)

  const contentViewed = contentResult.data !== null
  const progress = deriveProgress(kcEvents, contentViewed)
  const checksCleared = progress.quizzesUnlocked

  // The check the learner should take next, for the "Next Up" card.
  //
  // P0 removed sequential lesson ordering, so "next" no longer means "the one
  // after the last one cleared" — every uncleared check is equally available.
  // The lowest-numbered uncleared lesson is therefore just a stable, predictable
  // choice rather than a structural requirement. null = all checks cleared,
  // which is exactly when the assessment becomes legitimately next.
  const nextUnclearedLesson = progress.lessons.find(l => l.status !== 'cleared')?.number ?? null

  if (!enrollment || enrollment.status !== 'passed') {
    return (
      <TrainingClient
        phase="not_started"
        courseTitle={courseTitle}
        courseId={course.id}
        questionsByLesson={questionsByLesson}
        checksCleared={checksCleared}
        nextUnclearedLesson={nextUnclearedLesson}
        contentViewed={contentViewed}
        currentLessonNumber={currentLessonNumber}
        initialLocation={initialLocation}
        initialSuspendData={initialSuspendData}
        totalTrainingSeconds={totalTrainingSeconds}
      />
    )
  }

  // Check for issued certificate. Only existence matters here — the cert
  // details + download modal live on the Quizzes tab now.
  const { data: cert } = await admin
    .from('certificates')
    .select('id')
    .eq('enrollment_id', enrollment.id)
    .maybeSingle()

  if (cert) {
    return (
      <TrainingClient
        phase="certified"
        courseTitle={courseTitle}
        courseId={course.id}
        questionsByLesson={questionsByLesson}
        checksCleared={checksCleared}
        contentViewed={contentViewed}
        currentLessonNumber={currentLessonNumber}
        initialLocation={initialLocation}
        initialSuspendData={initialSuspendData}
        totalTrainingSeconds={totalTrainingSeconds}
      />
    )
  }

  // Enrollment passed but cert not yet written — still generating
  return (
    <TrainingClient
      phase="cert_pending"
      courseTitle={courseTitle}
      courseId={course.id}
      questionsByLesson={questionsByLesson}
      checksCleared={checksCleared}
      contentViewed={contentViewed}
      currentLessonNumber={currentLessonNumber}
      initialLocation={initialLocation}
      initialSuspendData={initialSuspendData}
      totalTrainingSeconds={totalTrainingSeconds}
    />
  )
}
