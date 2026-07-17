import { NavPill } from './_components/nav-pill'
import { DashboardShell } from './_components/dashboard-shell'
import { ThemeProvider, ThemeScript } from './_components/theme'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = (user?.app_metadata?.role as string | undefined) ?? null

  // Firm name for the nav pill (same firm_id source as app/dashboard/training/page.tsx).
  const firmId = user?.app_metadata?.firm_id as string | undefined
  let firmName: string | null = null
  if (firmId) {
    const admin = createAdminClient()
    const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).maybeSingle()
    firmName = firm?.name ?? null
  }

  const pill = <NavPill firmName={firmName} role={role} />

  // Shell choice is route-based (see DashboardShell): the training routes always
  // get the training shell + bottom tab bar regardless of role, so an admin can
  // take their own training. ThemeProvider/ThemeScript wrap both shells identically.
  return (
    <ThemeProvider>
      <ThemeScript />
      <DashboardShell role={role} pill={pill}>
        {children}
      </DashboardShell>
    </ThemeProvider>
  )
}
