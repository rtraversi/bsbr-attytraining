import { redirect } from 'next/navigation'
import { OnboardingClient } from './_components/onboarding-client'
import { AtcLogo } from '@/app/_components/atc-logo'

export const metadata = {
  title: 'Set up your account — Athena',
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (!session_id) {
    redirect('/')
  }

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

        {/* White body — sharp corners; the client renders each phase */}
        <div className="bg-white px-10 py-12 sm:px-12">
          <OnboardingClient sessionId={session_id} />
        </div>
      </div>
    </main>
  )
}
