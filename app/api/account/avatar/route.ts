import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signAvatarUrl } from '@/lib/avatars'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg'])
const MAX_BYTES = 2 * 1024 * 1024 // 2MB, matches the Settings page copy

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'File must be a PNG or JPG' }, { status: 422 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 2MB' }, { status: 422 })
  }

  const admin = createAdminClient()

  // One object per user — no extension in the path, upsert overwrites whatever
  // format was there before. Content-Type is stored as object metadata, so the
  // browser renders it correctly regardless of the (extension-less) path.
  const path = user.id
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: uploadErr } = await admin.storage
    .from('avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) {
    console.error('[account/avatar] upload failed:', uploadErr)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Store the PATH, never a URL. The bucket is private as of 0019, so a stored
  // URL would be both a dead link and a durable record of the world-readable
  // address the object used to have. Signing happens at render time in
  // lib/avatars.ts.
  //
  // The old value also carried a `?v=<timestamp>` cache-buster, needed because
  // the public URL was byte-identical after every re-upload. Signed URLs carry a
  // fresh token per render, so the URL changes on its own and the hack is gone.
  //
  // Merge, not replace — user_metadata carries full_name too. avatar_url is
  // explicitly dropped rather than left behind: it is the legacy shape that
  // resolveAvatarPath falls back to, and leaving a stale one would keep the
  // fallback alive for a user who no longer needs it.
  const nextMetadata: Record<string, unknown> = {
    ...(user.user_metadata ?? {}),
    avatar_path: path,
  }
  delete nextMetadata.avatar_url

  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: nextMetadata,
  })

  if (updateErr) {
    console.error('[account/avatar] user_metadata update failed:', updateErr)
    return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 })
  }

  // Sign one for the client so the new photo appears immediately, without a
  // round trip through a server render.
  const avatarUrl = await signAvatarUrl(admin, path)

  return NextResponse.json({ avatarUrl })
}
