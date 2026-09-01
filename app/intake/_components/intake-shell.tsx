import { IurixLockup } from '@/app/_components/iurix-lockup'
import { MUTED, PAGE } from './intake-styles'

/**
 * The frame around every state of the intake: the masthead, the firm's name,
 * and the measure.
 *
 * Extracted 2026-08-28, when the submitted intake stopped being a dead end and
 * became a second screen. Both screens are the same page to the firm — same
 * masthead, same title, same width — and two copies of that would drift the
 * first time either was touched.
 *
 * No hooks, so it renders on the server for the read-back screen and gets
 * bundled with the client for the editable one, without either caller caring.
 */
export function IntakeShell({
  firmName,
  subtitle,
  measure = 'max-w-3xl',
  children,
}: {
  firmName: string | null
  subtitle?: React.ReactNode
  /** The editable intake widens for the roster and the tool grid; see its client. */
  measure?: string
  children: React.ReactNode
}) {
  return (
    <main className={PAGE}>
      {/*
        Permanently white in both themes: the mark is artwork with its own
        ground, and inverting the page underneath it made it read as a different
        logo. (Same note as the mockup, and the lockup is light-grounds-only.)
      */}
      <div className="border-b border-[#E5EEF5] bg-white px-5 py-10">
        <div className="flex items-center justify-center">
          <IurixLockup style={{ fontSize: '2.6rem' }} />
        </div>
      </div>

      <div className={`mx-auto ${measure} px-6 pb-24 pt-10 transition-[max-width] duration-200`}>
        <header className="mb-8 border-b border-[#E5EEF5] pb-6 dark:border-[#1F2429]">
          <h1 className="mb-2 text-[1.9rem] font-semibold leading-tight tracking-tight">
            {firmName ? `${firmName}’s AI policy` : 'Your firm’s AI policy'}
          </h1>
          {subtitle ? <div className={`max-w-[34rem] text-[14.5px] ${MUTED}`}>{subtitle}</div> : null}
        </header>

        {children}
      </div>
    </main>
  )
}
