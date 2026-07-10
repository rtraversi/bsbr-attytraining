import { AccountMenu } from './_components/account-menu'
import { DashboardFooter } from './_components/dashboard-footer'
import { EmployeeTabBar } from './_components/employee-tab-bar'
import { ToastProvider } from './_components/toast-provider'
import { ThemeProvider, ThemeScript } from './_components/theme'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email ?? ''
  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null
  const role = (user?.app_metadata?.role as string | undefined) ?? null
  const isEmployee = role === 'employee'

  // Firm name for the account menu identity header (same firm_id source as
  // app/dashboard/training/page.tsx). Fetched with the service-role client.
  const firmId = user?.app_metadata?.firm_id as string | undefined
  let firmName: string | null = null
  if (firmId) {
    const admin = createAdminClient()
    const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).maybeSingle()
    firmName = firm?.name ?? null
  }

  // Admin shell — unchanged dark chrome (its pages are still dark-styled).
  if (!isEmployee) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-end">
          <AccountMenu email={email} fullName={fullName} role={role} firmName={firmName} />
        </nav>
        <ToastProvider>
          <div className="flex-1">{children}</div>
          <DashboardFooter />
        </ToastProvider>
      </div>
    )
  }

  // Employee shell — new light-by-default themed experience with manual dark toggle,
  // left-anchored profile menu, no persistent footer, and the bottom tab bar.
  return (
    <ThemeProvider>
      <ThemeScript />
      <div className="font-headline flex min-h-screen flex-col bg-[#F5F7FA] pb-16 text-[#0A0A0A] transition-colors dark:bg-[#050607] dark:text-[#F5F7FA]">
        <nav className="flex items-center justify-start border-b border-[#E5EEF5] px-4 py-3 dark:border-[#1F2429]">
          <AccountMenu
            email={email}
            fullName={fullName}
            role={role}
            firmName={firmName}
            anchor="left"
            showTheme
            showLegal
          />
        </nav>
        <ToastProvider>
          <div className="flex-1">{children}</div>
        </ToastProvider>
        <EmployeeTabBar />
      </div>
    </ThemeProvider>
  )
}
