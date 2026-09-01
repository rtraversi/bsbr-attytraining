// =============================================================================
// POST /api/intake/upload — the firm's existing AI policy document.
//
// One optional file per intake. It goes to a PRIVATE bucket, a human reads it,
// and it is never parsed. Same lifecycle as the answers: kept for the life of
// the subscription plus its grace period (D8-3, lib/intake/retention.ts), and
// whatever eventually sweeps them must delete the storage object as well as the
// intake_uploads row — deleting the row does not delete the object).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeIntake, getOrCreateOpenSession, latestSession, touchSession } from '@/lib/intake/session'
import {
  INTAKE_UPLOAD_BUCKET,
  INTAKE_UPLOAD_MAX_BYTES,
  INTAKE_UPLOAD_CONTENT_TYPES,
} from '@/lib/intake/uploads'

const QUESTION_KEY = 'existing_policy_file'

export async function POST(req: NextRequest) {
  const auth = await authorizeIntake()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const latest = await latestSession(admin, auth.actor.firmId)
  if (latest && latest.status !== 'in_progress') {
    return NextResponse.json({ error: 'This intake has already been submitted' }, { status: 409 })
  }

  let file: File | null = null
  try {
    const form = await req.formData()
    const candidate = form.get('file')
    if (candidate instanceof File) file = candidate
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (file.size > INTAKE_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'That file is larger than 10 MB' }, { status: 413 })
  }

  // Not a security control — a content type is whatever the uploader claims —
  // but it keeps the honest majority from attaching a screenshot or a zip that
  // Katy then cannot open, at the moment they can still fix it.
  if (!INTAKE_UPLOAD_CONTENT_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'PDF or Word documents only' }, { status: 415 })
  }

  const session = await getOrCreateOpenSession(admin, auth.actor)

  // Path is built from ids, never from the filename the firm supplied. The
  // original name is kept on the row for display only.
  const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const storagePath = `firms/${auth.actor.firmId}/intake/${session.id}/existing-policy${extension}`

  const upload = await admin.storage
    .from(INTAKE_UPLOAD_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: true })

  if (upload.error) {
    return NextResponse.json({ error: `Upload failed: ${upload.error.message}` }, { status: 502 })
  }

  // One file per session. Replacing it replaces the row, so a firm that uploads
  // twice does not leave Katy two documents and no way to tell which is current.
  await admin.from('intake_uploads').delete().eq('session_id', session.id)

  const { error: rowError } = await admin.from('intake_uploads').insert({
    session_id: session.id,
    storage_path: storagePath,
    original_name: file.name,
    content_type: file.type,
    bytes: file.size,
  })

  if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 })

  const value = {
    storagePath,
    originalName: file.name,
    contentType: file.type,
    bytes: file.size,
  }

  // The answer row too, so the branching engine sees the question as answered
  // without a second round-trip and without a special case.
  await admin.from('intake_answers').upsert(
    { session_id: session.id, question_key: QUESTION_KEY, value, answered_at: new Date().toISOString() },
    { onConflict: 'session_id,question_key' },
  )

  await touchSession(admin, session.id, QUESTION_KEY)

  return NextResponse.json({ ok: true, value })
}
