'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { verifyCertificateAction, type VerifyFormState } from '../actions'
import { ResultCard, NotFoundCard } from './result-card'

const FIELD =
  'w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--brand-emphasis)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? 'Checking…' : 'Verify certificate'}
    </button>
  )
}

export function VerifyForm() {
  const [state, formAction] = useActionState<VerifyFormState, FormData>(
    verifyCertificateAction,
    { kind: 'idle' }
  )

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-5">
        <div>
          <label
            htmlFor="certificateNumber"
            className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/35"
          >
            Certificate number
          </label>
          <input
            id="certificateNumber"
            name="certificateNumber"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="IX-20260921-4821"
            className={FIELD}
          />
        </div>

        <div>
          <label
            htmlFor="surname"
            className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/35"
          >
            Holder&rsquo;s surname
          </label>
          <input id="surname" name="surname" required autoComplete="off" className={FIELD} />
          {/* Says why a second field is required, so it does not read as
              friction someone should try to route around. */}
          <p className="mt-2 text-sm text-white/30">
            Both are required. The certificate number alone is not enough to look up a
            holder&rsquo;s details.
          </p>
        </div>

        <SubmitButton />
      </form>

      {state.kind === 'found' ? <ResultCard result={state.result} /> : null}

      {state.kind === 'not_found' ? <NotFoundCard /> : null}

      {state.kind === 'invalid' ? (
        <NotFoundCard>Enter both the certificate number and the holder&rsquo;s surname.</NotFoundCard>
      ) : null}

      {state.kind === 'rate_limited' ? (
        <NotFoundCard>
          Too many verification attempts from this network. Wait a few minutes and try again.
        </NotFoundCard>
      ) : null}
    </div>
  )
}
