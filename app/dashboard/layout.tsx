import { NavPill } from './_components/nav-pill'
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

  // Firm name for the nav pill (same firm_id source as app/dashboard/training/page.tsx).
  const firmId = user?.app_metadata?.firm_id as string | undefined
  let firmName: string | null = null
  if (firmId) {
    const admin = createAdminClient()
    const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).maybeSingle()
    firmName = firm?.name ?? null
  }

  const pill = <NavPill email={email} fullName={fullName} firmName={firmName} role={role} />

  // Admin shell — framed panel on the blue-gray backdrop. The panel matches the
  // backdrop in light mode (as in the spec) and lifts slightly in dark, where a
  // seamless frame would just read as a flat page.
  if (!isEmployee) {
    return (
      <ThemeProvider>
        <ThemeScript />
        <div className="font-headline min-h-screen bg-[#CFDCE8] p-0 text-[#0A0A0A] transition-colors md:p-4 xl:p-6 dark:bg-[#050607] dark:text-[#F5F7FA]">
          <div className="mx-auto w-full max-w-[1600px] rounded-[2rem] bg-[#CFDCE8] px-6 py-6 md:px-10 md:py-8 xl:px-14 xl:py-14 dark:bg-[#0A0C0E]">
            <div className="mb-6">{pill}</div>
            <ToastProvider>{children}</ToastProvider>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  // Employee shell — light-by-default themed experience with the bottom tab bar.
  return (
    <ThemeProvider>
      <ThemeScript />
      <div className="font-headline flex min-h-screen flex-col bg-[#F5F7FA] pb-16 text-[#0A0A0A] transition-colors dark:bg-[#050607] dark:text-[#F5F7FA]">
        <div className="px-4 py-3 md:px-6">{pill}</div>
        <ToastProvider>
          <div className="flex-1">{children}</div>
        </ToastProvider>
        <EmployeeTabBar />
      </div>
    </ThemeProvider>
  )
}
