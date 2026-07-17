import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NameSettings } from './_components/settings-client'
import { AvatarUpload } from './_components/avatar-upload'
import { OrganizationSettings } from './_components/organization-settings'
import { NotificationSettings } from './_components/notification-settings'
import { AppearanceSettings } from './_components/appearance-settings'

export const metadata = {
  title: 'Settings — AI Staff Compliance Training',
}

/* ── Shared tokens — same values the previous version of this page used ────── */
const CARD = 'rounded-3xl bg-white p-6 xl:p-8 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING = 'font-headline font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]'
const SECTION_HEADING = `${HEADING} mb-4 text-2xl md:text-3xl xl:mb-5 xl:text-[2.5rem]`
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

const NAV_LINK =
  'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#8A8A8A] transition-colors hover:bg-[#EAF8FF] hover:text-[#0094FF] dark:text-[#7A8189] dark:hover:bg-[#0094FF]/10 dark:hover:text-[#32C7FF]'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  const role = user.app_metadata?.role as string | undefined
  if (!firmId) redirect('/login')

  const isAdmin = role === 'admin'
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? null
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  // Firm-level settings (Organization + Notifications) are admin-only.
  let orgName = ''
  let reminderDays = 7
  let notifyCertEarned = true
  if (isAdmin) {
    const admin = createAdminClient()
    const { data: firm } = await admin
      .from('firms')
      .select('name, reminder_days, notify_cert_earned')
      .eq('id', firmId)
      .maybeSingle()
    orgName = firm?.name ?? ''
    reminderDays = firm?.reminder_days ?? 7
    notifyCertEarned = firm?.notify_cert_earned ?? true
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-6 py-10 md:px-10 xl:px-14 xl:py-14">
      <div className="mb-10">
        <h1 className={`${HEADING} text-4xl`}>Settings</h1>
        <p className={`mt-2 text-base ${MUTED}`}>
          {isAdmin
            ? 'Manage your account, organization, and notifications.'
            : 'Manage your account and appearance.'}
        </p>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        {/* Left nav — sticky at lg+, plain top block below it */}
        <aside className="lg:sticky lg:top-10 lg:w-64 lg:shrink-0">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            <a href="#account" className={NAV_LINK}>
              <svg className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="whitespace-nowrap">Account</span>
            </a>
            {isAdmin && (
              <a href="#organization" className={NAV_LINK}>
                <svg className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />
                </svg>
                <span className="whitespace-nowrap">Organization</span>
              </a>
            )}
            {isAdmin && (
              <a href="#notifications" className={NAV_LINK}>
                <svg className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="whitespace-nowrap">Notifications</span>
              </a>
            )}
            <a href="#appearance" className={NAV_LINK}>
              <svg className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h14a2 2 0 012 2v7a4 4 0 01-4 4H9l-4 4z" />
                <circle cx="8.5" cy="9.5" r="0.5" fill="currentColor" />
                <circle cx="12" cy="7" r="0.5" fill="currentColor" />
                <circle cx="15.5" cy="9.5" r="0.5" fill="currentColor" />
              </svg>
              <span className="whitespace-nowrap">Appearance</span>
            </a>
          </nav>
        </aside>

        {/* Right content */}
        <div className="flex flex-1 flex-col gap-12">
          <div id="account">
            <h2 className={SECTION_HEADING}>Your account</h2>
            <section className={CARD}>
              <AvatarUpload avatarUrl={avatarUrl} fullName={fullName} email={user.email ?? ''} />
              <NameSettings email={user.email ?? ''} fullName={fullName} />
            </section>
          </div>

          {isAdmin && (
            <div id="organization">
              <h2 className={SECTION_HEADING}>Organization</h2>
              <section className={CARD}>
                <OrganizationSettings initialName={orgName} />
              </section>
            </div>
          )}

          {isAdmin && (
            <div id="notifications">
              <h2 className={SECTION_HEADING}>Notifications</h2>
              <section className={CARD}>
                <NotificationSettings
                  reminderDays={reminderDays}
                  notifyCertEarned={notifyCertEarned}
                />
              </section>
            </div>
          )}

          <div id="appearance">
            <h2 className={SECTION_HEADING}>Appearance</h2>
            <section className={CARD}>
              <AppearanceSettings />
            </section>
          </div>

          <nav className={`flex flex-wrap gap-x-6 gap-y-1 px-1 pt-2 text-sm ${MUTED}`}>
            <Link href="/privacy" className="hover:text-[#0094FF]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#0094FF]">Terms of Service</Link>
            <Link href="/dpa" className="hover:text-[#0094FF]">Cookies</Link>
          </nav>

          <form action="/api/auth/logout" method="POST" className="px-1">
            <button
              type="submit"
              className="text-sm font-semibold text-[#DC2626] transition-colors hover:text-[#B91C1C]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
