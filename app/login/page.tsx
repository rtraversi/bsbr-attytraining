import { LoginForm } from './_components/login-form'
import { Footer } from '@/app/_components/footer'

export const metadata = {
  title: 'Sign in — AI Staff Compliance Training',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
              Built Smart by Rob
            </p>
            <h1
              className="text-2xl text-white"
              style={{ fontFamily: 'var(--font-gyrotrope)' }}
            >
              Sign in
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              Firm admins: manage your team&apos;s certification status.
            </p>
            <p className="text-sm text-zinc-400">
              Staff members: access your training and certificate.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <LoginForm errorParam={error} />
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            Need help?{' '}
            <a
              href="mailto:info@aistaffcompliance.com"
              className="underline hover:text-zinc-400 transition-colors"
            >
              info@aistaffcompliance.com
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
