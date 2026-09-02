import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isFirmNameBlank } from '@/lib/firm-name'
import { AtcLogo } from '@/app/_components/atc-logo'
import { FirmNameForm } from './_components/firm-name-form'

export const metadata = {
  title: 'Your firm name · IURIX',
}

/**
 * The name step — where the middleware gate sends a firm with no name.
 *
 * ── Why this exists separately from /onboarding ─────────────────────────────
 *
 * /onboarding requires a Stripe `session_id` and redirects to '/' without one.
 * The gate has to catch people who have no session_id to offer: an admin whose
 * name was cleared, a firm provisioned outside the checkout path, and the
 * seeded-firm case used to test the gate at all. Sending them to /onboarding
 * would bounce them to the marketing page.
 *
 * ── It re-checks, and sends a firm that already has a name away ─────────────
 *
 * Belt and braces with the gate. Rendering this screen to a firm that HAS a
 * name would invite them to overwrite it with no warning, and there is a real
 * path to it: the browser back button after saving.
 */
export default async function FirmNamePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  // Employees are never gated (they cannot fix a firm name) and have no reason
  // to be here.
  if (role !== 'admin' || !firmId) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).maybeSingle()

  if (!isFirmNameBlank(firm?.name)) redirect('/dashboard')

  // Only ever an in-app path. An open redirect here would be handed to every
  // signed-in admin by a gate they cannot decline.
  const safeNext = typeof next === 'string' && /^\/[^/\\]/.test(next) ? next : '/intake'

  return (
    <main className="font-headline relative flex min-h-screen items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/sign-in-bg-poster.jpg)' }}
      />
      <div aria-hidden className="absolute inset-0 bg-black/65" />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-[24px] shadow-2xl">
        <div className="flex items-center justify-center bg-black px-8 py-10">
          <AtcLogo style={{ fontSize: 'clamp(1.75rem, 7vw, 2.75rem)' }} />
        </div>
        <div className="bg-white px-10 py-12 sm:px-12">
          <FirmNameForm next={safeNext} />
        </div>
      </div>
    </main>
  )
}
