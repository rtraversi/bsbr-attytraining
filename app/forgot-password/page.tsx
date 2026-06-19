import { ForgotForm } from './_components/forgot-form'

export const metadata = {
  title: 'Reset password — AI Staff Compliance Training',
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
            Built Smart by Rob
          </p>
          <h1
            className="text-2xl text-white"
            style={{ fontFamily: 'var(--font-gyrotrope)' }}
          >
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            We&apos;ll email you a link to sign in and set a new one.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <ForgotForm />
        </div>
      </div>
    </main>
  )
}
