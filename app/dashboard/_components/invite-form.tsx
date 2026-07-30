'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from './toast-provider'

interface InviteFormProps {
  seatsRemaining: number
}

export function InviteForm({ seatsRemaining }: InviteFormProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'email_failed' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [devLink, setDevLink] = useState<string | undefined>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhase('loading')
    setErrorMsg('')
    setDevLink(undefined)

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = (await res.json()) as { error?: string; devLink?: string; emailSent?: boolean }

    if (!res.ok) {
      setErrorMsg(data.error ?? 'Something went wrong.')
      setPhase('error')
      return
    }

    // A 200 with emailSent: false means the member and their seat are real but
    // the invite email didn't go out. Saying "Invite sent" there is how a broken
    // Resend key stayed invisible for days — say both halves. The row is badged
    // "Invite not delivered" on the team table until a resend succeeds.
    const sentEmail = email
    const emailSent = data.emailSent !== false
    setDevLink(data.devLink)
    setEmail('')
    setPhase(emailSent ? 'done' : 'email_failed')
    router.refresh() // Re-fetch server component data so member list + seat count update
    addToast(
      emailSent
        ? `Invite sent to ${sentEmail}`
        : `${sentEmail} was added, but the invite email couldn’t be sent.`
    )
  }

  // Seats-full: the disabled affordance stays visible so the action is still
  // discoverable. The explanatory note is rendered once by the Invitations card.
  if (seatsRemaining <= 0) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-[#F2F4F7] py-4 text-base font-bold text-[#B0B7BF] dark:bg-[#1A1F24] dark:text-[#4E555C]"
      >
        Invite by email
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="employee@yourfirm.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={phase === 'loading'}
          className="w-full rounded-xl border border-[#E5EEF5] bg-white px-4 py-4 text-base text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B7BF] focus:border-[#32C7FF] focus:ring-2 focus:ring-[#32C7FF]/30 disabled:opacity-50 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
        />
        <button
          type="submit"
          disabled={phase === 'loading'}
          className="w-full rounded-xl bg-black py-4 text-base font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-white"
        >
          {phase === 'loading' ? 'Sending…' : 'Invite by email'}
        </button>
      </form>

      {phase === 'done' && <p className="text-sm font-semibold text-[#0094FF]">Invite sent.</p>}
      {phase === 'email_failed' && (
        <p className="text-sm font-semibold text-[#B45309] dark:text-[#F0B357]">
          Member added, but the invite email couldn’t be sent. Use the bell in the team table to
          resend it.
        </p>
      )}
      {phase === 'error' && <p className="text-sm text-[#DC2626]">{errorMsg}</p>}

      {devLink && (
        <div className="rounded-xl border border-[#FDE8B8] bg-[#FFF7E6] p-2.5">
          <p className="mb-1 font-mono text-[10px] text-[#B45309]">DEV — invite link (email not sent):</p>
          <a href={devLink} className="break-all text-[10px] text-[#B45309] underline hover:opacity-80">
            {devLink}
          </a>
        </div>
      )}
    </div>
  )
}
