import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TrainingClient } from './_components/training-client'

export const metadata = {
  title: 'Training — AI Staff Compliance Training',
}

export default async function TrainingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  if (!firmId) redirect('/login')

  const userId = user.id
  const admin = createAdminClient()

  // Get the course (may not exist yet if mark-pass hasn't been called)
  const { data: course } = await admin
    .from('courses')
    .select('id, title')
    .limit(1)
    .maybeSingle()

  const courseTitle = course?.title ?? 'AI Staff Compliance Training — Annual Certification'

  if (!course) {
    return (
      <TrainingClient
        phase="not_started"
        courseTitle={courseTitle}
      />
    )
  }

  // Get enrollment
  const { data: enrollment } = await admin
    .from('enrollments')
    .select('id, status, completed_at')
    .eq('user_id', userId)
    .eq('course_id', course.id)
    .maybeSingle()

  if (!enrollment || enrollment.status !== 'passed') {
    return (
      <TrainingClient
        phase="not_started"
        courseTitle={courseTitle}
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
        certNumber={cert.certificate_number}
        issuedAt={cert.issued_at}
        expiresAt={cert.expires_at}
        certUrl={signedUrlData?.signedUrl ?? ''}
      />
    )
  }

  // Enrollment complete but cert not yet written — still in the generation queue
  return (
    <TrainingClient
      phase="cert_pending"
      courseTitle={courseTitle}
    />
  )
}
