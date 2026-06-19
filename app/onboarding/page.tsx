import { redirect } from 'next/navigation'
import { OnboardingClient } from './_components/onboarding-client'

export const metadata = {
  title: 'Set up your account — AI Staff Compliance Training',
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
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
            Built Smart by Rob
          </p>
          <h1
            className="text-2xl text-white"
            style={{ fontFamily: 'var(--font-gyrotrope)' }}
          >
            Set up your account
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            One last step before your team can start training.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <OnboardingClient sessionId={session_id} />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Questions?{' '}
          <a
            href="mailto:info@aistaffcompliance.com"
            className="underline hover:text-zinc-400 transition-colors"
          >
            info@aistaffcompliance.com
          </a>
        </p>
      </div>
    </main>
  )
}
