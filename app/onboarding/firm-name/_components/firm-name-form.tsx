'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * The name step's form.
 *
 * Reached only via the middleware gate, so the person here is a signed-in admin
 * whose firm has no name. One field, because one field is what is missing —
 * Katy's reversal of the hard intake gate (2026-08-26 12:11) stands, and this
 * is deliberately not a way to reintroduce it.
 */
export function FirmNameForm({ next }: { next: string }) {
  const router = useRouter()
  const [firmName, setFirmName] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const trimmed = firmName.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trimmed) {
      setErrorMsg('Enter your firm’s name.')
      return
    }

    setBusy(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/firm/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firm_name: trimmed }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Request failed')
      }
      // refresh() BEFORE push: the gate is in middleware and reads the database,
      // so the next navigation must not be served from a cached router entry
      // taken while the name was still blank.
      router.refresh()
      router.push(next)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-center text-3xl font-semibold text-zinc-900">
        What is your firm called?
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <label htmlFor="firm-name" className="text-base font-medium text-zinc-900">
            Firm name
          </label>
          <input
            id="firm-name"
            type="text"
            required
            autoFocus
            autoComplete="organization"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            disabled={busy}
            placeholder="Chavez Law"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-50"
          />
          <p className="text-sm font-extralight text-zinc-500">You can change it later.</p>
        </div>

        {errorMsg ? <p className="text-base text-red-600">{errorMsg}</p> : null}

        <button
          type="submit"
          disabled={busy || !trimmed}
          className="mt-1 w-full rounded-2xl bg-[var(--brand-primary)] px-6 py-4 text-lg font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save & continue'}
        </button>
      </form>
    </div>
  )
}
