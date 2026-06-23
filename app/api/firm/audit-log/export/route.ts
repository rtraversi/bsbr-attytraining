import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function csvField(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"'
}

function fmtTimestamp(ts: string): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (role !== 'admin' || !firmId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const admin = createAdminClient()

  const { data: events } = await admin
    .from('training_events')
    .select('id, firm_member_id, event_type, event_timestamp, ip_address, user_agent, metadata')
    .eq('firm_id', firmId)
    .order('event_timestamp', { ascending: false })

  const rows = events ?? []

  // Collect unique firm_member_ids
  const uniqueMemberIds = [...new Set(rows.map(r => r.firm_member_id).filter(Boolean))]

  // Fetch firm_members rows for those IDs
  const { data: memberRows } = uniqueMemberIds.length > 0
    ? await admin
        .from('firm_members')
        .select('id, user_id, status')
        .in('id', uniqueMemberIds)
    : { data: [] as { id: string; user_id: string; status: string }[] }

  const memberMap = Object.fromEntries((memberRows ?? []).map(m => [m.id, m]))

  // Batch-fetch auth users for non-deleted members only
  const activeMembers = (memberRows ?? []).filter(m => m.status !== 'deleted')
  const uniqueUserIds = [...new Set(activeMembers.map(m => m.user_id))]

  const authResults = await Promise.all(
    uniqueUserIds.map(uid => admin.auth.admin.getUserById(uid))
  )

  const authByUserId = Object.fromEntries(
    uniqueUserIds.map((uid, i) => [uid, authResults[i].data?.user])
  )

  // Build CSV
  const header = ['Date', 'Employee Name', 'Employee Email', 'Event Type', 'IP Address', 'User Agent', 'Details']
    .map(csvField)
    .join(',')

  const csvRows = rows.map(event => {
    const member = memberMap[event.firm_member_id]
    const isDeleted = !member || member.status === 'deleted'

    let name = 'Redacted'
    let email = 'Redacted'

    if (!isDeleted && member) {
      const authUser = authByUserId[member.user_id]
      name  = (authUser?.user_metadata?.full_name as string | undefined) || '(unknown)'
      email = authUser?.email ?? '(unknown)'
    }

    const date    = event.event_timestamp ? fmtTimestamp(event.event_timestamp) : ''
    const details = event.metadata != null ? JSON.stringify(event.metadata) : ''

    return [date, name, email, event.event_type ?? '', event.ip_address ?? '', event.user_agent ?? '', details]
      .map(csvField)
      .join(',')
  })

  const csv = [header, ...csvRows].join('\r\n')
  const today = new Date().toISOString().split('T')[0]

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audit-log-${today}.csv"`,
    },
  })
}
