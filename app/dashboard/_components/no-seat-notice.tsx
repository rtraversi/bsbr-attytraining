// Shown on the three training surfaces (Overview / Training / Quizzes) when the
// signed-in member holds no seat — see lib/seats.ts for the predicate.
//
// Deliberately a rendered state rather than a redirect: these routes are the
// employee shell's own tabs, so redirecting to /dashboard would bounce an
// unentitled employee between two pages neither of which explains anything.

import { canSelfEnroll, type SeatAccessRow } from '@/lib/seats'
import { EnrollSelfButton } from './enroll-self-button'

const HEADING = 'font-semibold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]'
const BODY = 'font-extralight text-[#3D3D3D] dark:text-[#C4CBD2]'
const CARD =
  'rounded-[28px] border border-[#E5EEF5] bg-[#F2F4F7] px-6 py-8 dark:border-[#1F2429] dark:bg-[#0D0F12] md:rounded-[36px] md:px-10 md:py-12'

export function NoSeatNotice({
  title = 'You’re not enrolled in the training',
  body = 'Your account doesn’t currently hold a training seat, so the course and the certification assessment aren’t available. Your firm’s administrator can enroll you from their Team page.',
  children,
}: {
  title?: string
  body?: string
  /** Optional action — e.g. the admin self-enrollment button. */
  children?: React.ReactNode
}) {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-8 md:py-12 lg:px-10">
      <div className={`${CARD} max-w-2xl`}>
        <h1 className={`mb-4 text-2xl md:text-3xl ${HEADING}`}>{title}</h1>
        <p className={`text-base leading-relaxed ${BODY}`}>{body}</p>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </main>
  )
}

/**
 * The seat gate's whole failure branch. An admin who declined training at
 * onboarding gets a way back in; everyone else gets the explanation. Kept in one
 * place so the three training pages can't drift on which case says what.
 */
export function SeatGate({ member }: { member: SeatAccessRow | null }) {
  if (canSelfEnroll(member)) {
    return (
      <NoSeatNotice
        title="You’re not enrolled in the training"
        body="You chose not to take the training when you set up your firm, so you don’t hold a seat. You can claim one now — it counts against your firm’s purchased seats, the same as any team member."
      >
        <EnrollSelfButton />
      </NoSeatNotice>
    )
  }

  return <NoSeatNotice />
}
