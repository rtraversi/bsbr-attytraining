import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { consumeVerificationToken } from '@/lib/email-verification'
import { IurixLockup } from '@/app/_components/iurix-lockup'

export const metadata = {
  title: 'Confirm your email — IURIX',
}

/**
 * The far end of the deliverability link.
 *
 * Deliberately UNAUTHENTICATED. The recipient is often somebody who has not set
 * a password yet — a roster row the admin typed and has not invited — so
 * requiring a session would make the link unusable by exactly the people whose
 * addresses are least proven. The token IS the proof, it is single-use, and it
 * grants no session and no access to anything.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  const outcome = token
    ? await consumeVerificationToken(createAdminClient(), token)
    : ({ ok: false, reason: 'unknown_token' } as const)

  return (
    <main className="font-headline min-h-screen bg-[#FAFAF8] text-[#0A0A0A]">
      <div className="border-b border-[#E5EEF5] bg-white px-5 py-10">
        <div className="flex items-center justify-center">
          <IurixLockup style={{ fontSize: '2.6rem' }} />
        </div>
      </div>

      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        {outcome.ok ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">Thank you — that&rsquo;s confirmed.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#8A8A8A]">
              We know we can reach you at this address now, so your training invitation and your
              certificate will land where they should. There is nothing else to do here.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">That link has already been used.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#8A8A8A]">
              Confirmation links work once and then stop. If you have already confirmed, you are
              done. If not, ask whoever manages your firm&rsquo;s account to send you a fresh one.
            </p>
          </>
        )}

        <Link
          href="/"
          className="mt-8 inline-block rounded-full border border-[var(--brand-emphasis)] bg-[var(--brand-emphasis)] px-6 py-2.5 text-sm font-semibold text-white"
        >
          Go to IURIX
        </Link>
      </div>
    </main>
  )
}
