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

  // Get the course
  const { data: course } = await admin
    .from('courses')
    .select('id, title, pass_threshold')
    .limit(1)
    .maybeSingle()

  const courseTitle = course?.title ?? 'Responsible Use of AI within the Legal Industry'

  if (!course) {
    return (
      <TrainingClient
        phase="not_started"
        courseTitle={courseTitle}
        courseId={null}
        questions={[]}
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
      .order('created_at', { ascending: false })
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
      />
    )
  }

  // Check for issued certificate
  const { data: cert } = await admin
    .from('certificates')
    .select('certificate_number, issued_at, expires_at, storage_path')
    .eq('enrollment_id', enrollment.id)
    .maybeSingle()

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
        certNumber={cert.certificate_number}
        issuedAt={cert.issued_at}
        expiresAt={cert.expires_at}
        certUrl={signedUrlData?.signedUrl ?? ''}
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
    />
  )
}
