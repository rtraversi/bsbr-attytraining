'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InviteFormProps {
  seatsRemaining: number
}

export function InviteForm({ seatsRemaining }: InviteFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
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

    const data = (await res.json()) as { error?: string; devLink?: string }

    if (!res.ok) {
      setErrorMsg(data.error ?? 'Something went wrong.')
      setPhase('error')
      return
    }

    setDevLink(data.devLink)
    setEmail('')
    setPhase('done')
    router.refresh() // Re-fetch server component data so member list + seat count update
  }

  if (seatsRemaining <= 0) {
    return (
      <p className="text-sm text-yellow-400">
        All seats are in use. Contact us to add more.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="email"
          required
          placeholder="employee@yourfirm.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={phase === 'loading'}
          className="flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={phase === 'loading'}
          className="rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {phase === 'loading' ? 'Sending…' : 'Send invite'}
        </button>
      </form>

      {phase === 'done' && (
        <p className="text-sm text-teal-400">Invite sent!</p>
      )}

      {phase === 'error' && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}

      {devLink && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
          <p className="text-xs text-yellow-400 mb-1 font-mono">DEV — invite link (email not sent):</p>
          <a
            href={devLink}
            className="text-xs text-yellow-300 break-all underline hover:text-yellow-200"
          >
            {devLink}
          </a>
        </div>
      )}
    </div>
  )
}
