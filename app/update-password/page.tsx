import { UpdatePasswordForm } from './_components/update-form'
import { AtcLogo } from '@/app/_components/atc-logo'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Set your password — IURIX',
}

export default async function UpdatePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email ?? ''
  // Prefill when the admin supplied a name at invite time, so an existing name is
  // confirmed rather than retyped. Usually absent — that is the whole problem this
  // field exists to fix (certificates fall back to the raw email address).

  return (
    <main className="font-headline relative flex min-h-screen items-center justify-center px-4 py-16">
      {/* Sign-in background treatment — static poster still (no <video>) + dark overlay */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/sign-in-bg-poster.jpg)' }}
      />
      <div aria-hidden className="absolute inset-0 bg-black/65" />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-[24px] shadow-2xl">
        {/* Dark header band — rounded top corners, sharp bottom edge */}
        <div className="flex items-center justify-center bg-black px-8 py-10">
          <AtcLogo style={{ fontSize: 'clamp(1.75rem, 7vw, 2.75rem)' }} />
        </div>

        {/* White form body — sharp corners */}
        <div className="bg-white px-10 py-12 sm:px-12">
          <h1 className="text-center text-4xl font-semibold text-zinc-900">Set up your account</h1>
          <p className="mt-2.5 text-center text-base font-extralight text-[#7F7F7F]">
            Confirm your name and choose a strong password.
          </p>

          <div className="mt-9">
            <UpdatePasswordForm email={email} />
          </div>
        </div>
      </div>
    </main>
  )
}
