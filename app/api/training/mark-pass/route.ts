import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const firmId = user.app_metadata?.firm_id as string | undefined
  if (!firmId) {
    return NextResponse.json({ error: 'No firm associated with this account' }, { status: 403 })
  }

  const userId = user.id
  const admin = createAdminClient()

  // Get or create the stub course — updated to a real CF Stream video_id once video is uploaded
  let { data: course } = await admin
    .from('courses')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (!course) {
    const { data: newCourse, error: courseErr } = await admin
      .from('courses')
      .insert({
        title: 'AI Staff Compliance Training — Annual Certification',
        description: 'Certify your staff on proper AI use under ABA Model Rule 5.3.',
        cloudflare_stream_video_id: 'stub-not-yet-uploaded',
        pass_threshold: 80,
        is_published: true,
      })
      .select('id')
      .single()

    if (courseErr || !newCourse) {
      console.error('[mark-pass] course insert failed:', courseErr)
      return NextResponse.json({ error: 'Failed to initialize course' }, { status: 500 })
    }
    course = newCourse
  }

  // Get or create enrollment
  let { data: enrollment } = await admin
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_id', course.id)
    .maybeSingle()

  if (!enrollment) {
    const { data: newEnrollment, error: enrollErr } = await admin
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: course.id,
        firm_id: firmId,
        status: 'in_progress',
      })
      .select('id, status')
      .single()

    if (enrollErr || !newEnrollment) {
      console.error('[mark-pass] enrollment insert failed:', enrollErr)
      return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 })
    }
    enrollment = newEnrollment
  }

  // Idempotent — if they already passed, return early
  const { data: existingPass } = await admin
    .from('quiz_attempts')
    .select('id')
    .eq('enrollment_id', enrollment.id)
    .eq('passed', true)
    .maybeSingle()

  if (existingPass) {
    return NextResponse.json({ success: true, alreadyPassed: true })
  }

  // Insert passing quiz attempt
  const { data: attempt, error: attemptErr } = await admin
    .from('quiz_attempts')
    .insert({
      enrollment_id: enrollment.id,
      user_id: userId,
      firm_id: firmId,
      passed: true,
      score: 100,
      answers: null,
    })
    .select('id')
    .single()

  if (attemptErr || !attempt) {
    console.error('[mark-pass] quiz_attempt insert failed:', attemptErr)
    return NextResponse.json({ error: 'Failed to record attempt' }, { status: 500 })
  }

  // Mark enrollment complete — 'passed' matches the schema check constraint
  await admin
    .from('enrollments')
    .update({ status: 'passed', completed_at: new Date().toISOString() })
    .eq('id', enrollment.id)

  // Enqueue cert generation
  const { data: queueRow, error: queueErr } = await admin.from('cert_generation_queue').insert({
    enrollment_id: enrollment.id,
    firm_id: firmId,
    quiz_attempt_id: attempt.id,
    status: 'pending',
  }).select('id').single()

  if (queueErr) {
    console.error('[mark-pass] cert_generation_queue insert failed:', queueErr)
  }

  // Trigger cert generation after response is sent — bypasses unreliable Supabase webhook
  if (queueRow) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const secret = process.env.CERT_WEBHOOK_SECRET ?? ''
    after(async () => {
      try {
        await fetch(`${appUrl}/api/certs/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-webhook-secret': secret },
          body: JSON.stringify({
            type: 'INSERT',
            table: 'cert_generation_queue',
            record: { id: queueRow.id, firm_id: firmId, enrollment_id: enrollment.id, quiz_attempt_id: attempt.id, status: 'pending', attempt_count: 0 },
          }),
        })
      } catch (err) {
        console.error('[mark-pass] cert trigger failed:', err)
      }
    })
  }

  return NextResponse.json({ success: true })
}
