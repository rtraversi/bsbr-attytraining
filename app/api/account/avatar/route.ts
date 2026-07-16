import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const { data: publicUrlData } = admin.storage.from('avatars').getPublicUrl(path)
  // Cache-bust: the path is stable per user, so an updated photo needs a
  // changing URL or the browser (and any CDN in front of Storage) keeps
  // showing the old bytes.
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  // Merge, not replace — user_metadata carries full_name too.
  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: avatarUrl },
  })

  if (updateErr) {
    console.error('[account/avatar] user_metadata update failed:', updateErr)
    return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 })
  }

  return NextResponse.json({ avatarUrl })
}
