import { AccountMenu } from './_components/account-menu'
import { Footer } from '@/app/_components/footer'
import { ToastProvider } from './_components/toast-provider'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email ?? ''
  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null
  const role = (user?.app_metadata?.role as string | undefined) ?? null

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          AI Staff Compliance Training
        </p>
        <div className="flex items-center gap-6">
          <AccountMenu email={email} fullName={fullName} role={role} />
        </div>
      </nav>
      <ToastProvider>
        <div className="flex-1">{children}</div>
        <Footer />
      </ToastProvider>
    </div>
  )
}
