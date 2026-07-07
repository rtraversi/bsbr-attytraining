import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  // Get the course.
  // rise_embed_url is added in migration 0010 and isn't in the generated types
  // until `supabase gen types` is re-run — query untyped (same pattern as the
  // quiz_questions select below) and re-apply a precise type.
  type CourseRow = {
    id: string
    title: string
    pass_threshold: number | null
    rise_embed_url: string | null
  }
  const { data: courseRaw } = await // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('courses')
      .select('id, title, pass_threshold, rise_embed_url')
      .limit(1)
      .maybeSingle()
  const course = courseRaw as CourseRow | null

  const courseTitle = course?.title ?? 'Responsible Use of AI within the Legal Industry'
  const riseUrl = course?.rise_embed_url ?? null

  if (!course) {
    return (
      <TrainingClient
        phase="not_started"
        courseTitle={courseTitle}
        courseId={null}
        questions={[]}
        riseUrl={riseUrl}
      />
    )
  }

  // Fetch enrollment + questions in parallel
  const [enrollmentResult, questionsResult] = await Promise.all([
    admin
      .from('enrollments')
      .select('id, status, completed_at')
      .eq('user_id', userId)
      .eq('course_id', course.id)
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Select id, question_text, answers only — correct_index stays server-side
    // quiz_questions isn't in generated types yet; re-run `supabase gen types` after db push
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('quiz_questions')
      .select('id, question_text, answers')
      .eq('course_id', course.id)
      .eq('is_active', true),
  ])

  const enrollment = enrollmentResult.data

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
        riseUrl={riseUrl}
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
        riseUrl={riseUrl}
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
      riseUrl={riseUrl}
    />
  )
}
