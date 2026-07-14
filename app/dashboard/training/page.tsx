import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deriveProgress, type KnowledgeCheckEvent } from '@/lib/training/progress'
import { READINESS_LESSON } from '@/lib/training/lessons'
import { clientQuestionsByLesson } from '@/lib/training/questions'
import { TrainingClient } from './_components/training-client'
import type { QuizQuestion } from './_components/quiz-component'

export const metadata = {
  title: 'Training — AI Staff Compliance Training',
}

const QUESTIONS_PER_ATTEMPT = 8

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

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
  }
  const [courseResult, memberResult] = await Promise.all([
    admin.from('courses').select('id, title, pass_threshold').limit(1).maybeSingle(),
    admin
      .from('firm_members')
      .select('id, scorm_suspend_data, scorm_lesson_location')
      .eq('user_id', userId)
      .eq('firm_id', firmId)
      .maybeSingle(),
  ])

  const course = courseResult.data as CourseRow | null
  const member = memberResult.data as MemberRow | null

  const courseTitle = course?.title ?? 'Responsible Use of AI within the Legal Industry'

  if (!course) {
    return (
      <TrainingClient
        phase="not_started"
        courseTitle={courseTitle}
        courseId={null}
        questions={[]}
        questionsByLesson={questionsByLesson}
        checksCleared={false}
        contentViewed={false}
      />
    )
  }

  // Fetch enrollment + questions + both halves of the assessment gate in parallel.
  type KcRow = { metadata: unknown; event_timestamp: string }
  const [enrollmentResult, questionsResult, kcResult, contentResult, lessonLocationResult] =
    await Promise.all([
      admin
        .from('enrollments')
        .select('id, status, completed_at, total_training_seconds')
        .eq('user_id', userId)
        .eq('course_id', course.id)
        .order('enrolled_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    // Select id, question_text, answers only — correct_index stays server-side
    admin
      .from('quiz_questions')
      .select('id, question_text, answers')
      .eq('course_id', course.id)
      .eq('is_active', true),
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
  const checksCleared = deriveProgress(kcEvents, contentViewed).quizzesUnlocked

  // Cast and shuffle — correct_index is never sent to the client
  type RawQuestion = { id: string; question_text: string; answers: unknown }
  const allQuestions = ((questionsResult.data ?? []) as unknown as RawQuestion[]).map(q => ({
    id: q.id,
    question_text: q.question_text,
    answers: (q.answers as string[]) ?? [],
  })) satisfies QuizQuestion[]

  const questions = shuffleArray(allQuestions).slice(0, QUESTIONS_PER_ATTEMPT)

  if (!enrollment || enrollment.status !== 'passed') {
    return (
      <TrainingClient
        phase="not_started"
        courseTitle={courseTitle}
        courseId={course.id}
        questions={questions}
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

  // Check for issued certificate
  const { data: cert } = await admin
    .from('certificates')
    .select('id, certificate_number, issued_at, expires_at, storage_path')
    .eq('enrollment_id', enrollment.id)
    .maybeSingle()

  const employeeName = (user.user_metadata?.full_name as string | undefined) || user.email || ''

  if (cert) {
    const { data: signedUrlData } = await admin.storage
      .from('certificates')
      .createSignedUrl(cert.storage_path, 60 * 60 * 24 * 7)

    return (
      <TrainingClient
        phase="certified"
        courseTitle={courseTitle}
        courseId={course.id}
        questions={[]}
        questionsByLesson={questionsByLesson}
        checksCleared={checksCleared}
        contentViewed={contentViewed}
        currentLessonNumber={currentLessonNumber}
        initialLocation={initialLocation}
        initialSuspendData={initialSuspendData}
        totalTrainingSeconds={totalTrainingSeconds}
        certId={cert.id}
        certNumber={cert.certificate_number}
        issuedAt={cert.issued_at}
        expiresAt={cert.expires_at}
        certUrl={signedUrlData?.signedUrl ?? ''}
        employeeName={employeeName}
      />
    )
  }

  // Enrollment passed but cert not yet written — still generating
  return (
    <TrainingClient
      phase="cert_pending"
      courseTitle={courseTitle}
      courseId={course.id}
      questions={[]}
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
