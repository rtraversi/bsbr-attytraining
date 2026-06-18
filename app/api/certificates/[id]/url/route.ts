import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: cert } = await admin
    .from('certificates')
    .select('id, firm_id, user_id, storage_path, expires_at, certificate_number')
    .eq('id', id)
    .single()

  if (!cert) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Allow: cert owner OR firm admin of the issuing firm
  if (cert.user_id !== user.id) {
    const { data: membership } = await admin
      .from('firm_members')
      .select('role')
      .eq('firm_id', cert.firm_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: signed } = await admin.storage
    .from('certificates')
    .createSignedUrl(cert.storage_path, 60)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }

  return NextResponse.json({
    url: signed.signedUrl,
    expires_at: cert.expires_at,
    certificate_number: cert.certificate_number,
  })
}
