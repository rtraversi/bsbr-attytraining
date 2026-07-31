import Link from 'next/link'
import { LoginForm } from './_components/login-form'
import { SignInBackground } from './_components/sign-in-background'
import { AtcLogo } from '@/app/_components/atc-logo'

export const metadata = {
  title: 'Sign in — IURIX',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="font-headline relative min-h-screen w-full">
      {/* Full-page drone footage + dark overlay behind everything. The white form
          panel (opaque) covers the top of the right column; the footer sits below
          it so the footage shows through the translucent bar — but only within the
          right column's width, not across the whole page. */}
      <SignInBackground />

      <div className="relative z-10 flex min-h-screen flex-col md:flex-row">
        {/* Left ~65%: video pane — transparent, footage + centered wordmark show through */}
        <div className="relative flex h-52 w-full shrink-0 items-center justify-center md:h-auto md:w-[65%]">
          {/* Fluid size — scales with the viewport instead of a fixed pixel size */}
          <AtcLogo
            className="pointer-events-none"
            style={{ fontSize: "clamp(2rem, 4.2vw, 5.5rem)" }}
          />
        </div>

        {/* Right ~35%: white form panel + its own footer bar */}
        <div className="flex w-full flex-1 flex-col md:w-[35%] md:flex-none">
          {/* Form panel — opaque white */}
          <div className="flex flex-1 flex-col justify-center bg-white px-6 py-12 sm:px-8 md:px-10 md:py-16 lg:px-14">
            <h1 className="whitespace-nowrap text-center font-semibold leading-tight text-zinc-900 text-[clamp(1.4rem,2.4vw,2.6rem)]">
              Good to see you again
            </h1>
            <p className="mt-2 text-center text-lg font-extralight text-[#7F7F7F]">
              ready to get started?
            </p>

            <div className="mt-10">
              <LoginForm errorParam={error} />
            </div>
          </div>

          {/* Footer bar — translucent #00B9FF over the footage, right column only */}
          <div className="bg-[#00B9FF]/50 px-6 py-4">
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs font-extralight text-[#FFE5E5]">
              <Link href="/terms" className="transition-opacity hover:opacity-70">
                Terms
              </Link>
              <Link href="/privacy" className="transition-opacity hover:opacity-70">
                Privacy
              </Link>
              {/* Cookies is intentionally absent, not forgotten. The /cookies
                  route now exists but is an empty shell — it carries no copy
                  until Max drafts it and Katy or Rob approves it. Restore the
                  <Link href="/cookies"> here, styled like its siblings, once
                  that copy is approved. */}
              {/* TEMPORARY — pending Rob's business address (cutover item C4).
                  This pointed at info@aistaffcompliance.com, a RETIRED domain,
                  so support mail sent from the sign-in page may have been
                  silently dropped. solarsaiko@gmail.com is already the live
                  support inbox (app/api/support/contact/route.ts:8), so this
                  matches where the in-app support form already delivers. */}
              <a
                href="mailto:solarsaiko@gmail.com"
                className="transition-opacity hover:opacity-70"
              >
                Contact support
              </a>
              <Link href="/pricing" className="transition-opacity hover:opacity-70">
                Want to sign up?
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}
