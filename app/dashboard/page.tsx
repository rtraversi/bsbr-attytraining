import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteForm } from './_components/invite-form'

export const metadata = {
  title: 'Dashboard — AI Staff Compliance Training',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  const role = user.app_metadata?.role as string | undefined

  if (!firmId) redirect('/login')

  const admin = createAdminClient()

  const [firmRes, seatsRes, membersRes] = await Promise.all([
    admin.from('firms').select('name, max_seats, status').eq('id', firmId).single(),
    admin.from('seats').select('used_seats, max_seats').eq('firm_id', firmId).single(),
    admin
      .from('firm_members')
      .select('id, user_id, role, status, invited_at, activated_at')
      .eq('firm_id', firmId)
      .order('invited_at'),
  ])

  const firm = firmRes.data
  const seats = seatsRes.data
  const members = membersRes.data ?? []

  // Fetch emails from Supabase Auth — small firm, parallel fetches are fine
  const memberDetails = await Promise.all(
    members.map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id)
      return { ...m, email: data?.user?.email ?? '(unknown)' }
    })
  )

  const seatsUsed = seats?.used_seats ?? 0
  const seatsTotal = seats?.max_seats ?? firm?.max_seats ?? 0
  const seatsRemaining = seatsTotal - seatsUsed

  // ── Employee view ────────────────────────────────────────────────────────────
  if (role === 'employee') {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1
          className="text-2xl text-white mb-3"
          style={{ fontFamily: 'var(--font-fraunces)' }}
        >
          Welcome
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          Complete your AI compliance training to earn your certificate.
        </p>
        <Link
          href="/dashboard/training"
          className="inline-flex items-center rounded-lg bg-teal-500 hover:bg-teal-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors"
        >
          Go to training
        </Link>
      </main>
    )
  }

  // ── Admin view ───────────────────────────────────────────────────────────────
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      {/* Firm header */}
      <div className="mb-8">
        <h1
          className="text-2xl text-white"
          style={{ fontFamily: 'var(--font-fraunces)' }}
        >
          {firm?.name ?? 'Your Firm'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {seatsUsed} of {seatsTotal} seats used
        </p>
      </div>

      {/* Invite section */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-sm font-medium text-zinc-200 mb-4">Invite a team member</h2>
        <InviteForm seatsRemaining={seatsRemaining} />
      </div>

      {/* Member table */}
      <div>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">
          Your team
        </h2>
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-3 text-zinc-500 font-normal">Email</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-normal">Role</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {memberDetails.map((m) => (
                <tr key={m.id} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-zinc-200">{m.email}</td>
                  <td className="px-4 py-3 text-zinc-400 capitalize">{m.role}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
              {memberDetails.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-zinc-600">
                    No team members yet. Invite your first employee above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: 'bg-teal-500/15 text-teal-400',
    invited: 'bg-yellow-500/15 text-yellow-400',
    cancelled: 'bg-red-500/15 text-red-400',
  }
  const colors = colorMap[status] ?? 'bg-zinc-700/50 text-zinc-400'

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {status}
    </span>
  )
}
