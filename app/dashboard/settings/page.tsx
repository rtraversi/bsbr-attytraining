import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReminderSettings } from '../_components/reminder-settings'
import { NameSettings } from './_components/settings-client'

export const metadata = {
  title: 'Settings — AI Staff Compliance Training',
}

const CARD = 'rounded-3xl bg-white p-6 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING = 'font-headline text-[1.05rem] font-bold text-[#0A0A0A] dark:text-[#F5F7FA]'
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  const role = user.app_metadata?.role as string | undefined
  if (!firmId) redirect('/login')

  const isAdmin = role === 'admin'

  // Reminder cadence is a firm-level setting — admins only.
  let reminderDays = 7
  if (isAdmin) {
    const admin = createAdminClient()
    const { data: firm } = await admin
      .from('firms')
      .select('reminder_days')
      .eq('id', firmId)
      .maybeSingle()
    reminderDays = firm?.reminder_days ?? 7
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8 md:px-0">
      <h1 className="font-headline mb-6 text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]">
        Settings
      </h1>

      <div className="flex flex-col gap-4">
        <section className={CARD}>
          <h2 className={`${HEADING} mb-1`}>Your account</h2>
          <p className={`mb-5 text-xs ${MUTED}`}>Update how your name appears across the platform.</p>
          <NameSettings email={user.email ?? ''} fullName={(user.user_metadata?.full_name as string | undefined) ?? null} />

          <div className="mt-6 border-t border-[#E5EEF5] pt-4 dark:border-[#1F2429]">
            <Link
              href="/update-password"
              className="text-xs font-semibold text-[#0094FF] hover:underline"
            >
              Change password
            </Link>
          </div>
        </section>

        {isAdmin && (
          <section className={CARD}>
            <h2 className={`${HEADING} mb-1`}>Auto-reminders</h2>
            <p className={`mb-5 text-xs ${MUTED}`}>
              Automatically email staff who have not completed training after this many days.
            </p>
            <ReminderSettings initialDays={reminderDays} />
          </section>
        )}

        <nav className={`flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs ${MUTED}`}>
          <Link href="/privacy" className="hover:text-[#0094FF]">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#0094FF]">Terms of Service</Link>
          <Link href="/dpa" className="hover:text-[#0094FF]">Cookies</Link>
        </nav>
      </div>
    </main>
  )
}
