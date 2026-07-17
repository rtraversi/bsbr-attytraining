'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

/* ── Shared tokens — same conventions as the Settings page ─────────────────── */
const CARD = 'rounded-3xl bg-white p-6 xl:p-8 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING = 'font-headline font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]'
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'
const ACCENT = 'text-[#0094FF] dark:text-[#32C7FF]'
const INPUT =
  'rounded-xl border border-[#E5EEF5] bg-white text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B7BF] focus:border-[#32C7FF] focus:ring-2 focus:ring-[#32C7FF]/30 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]'

/* ── Content — guide cards link to the FAQ section (intentional for now, no
      real article pages yet); copy describes the actual product features ───── */
const guides = [
  {
    title: 'Getting started',
    description: 'Invite your staff and launch their first training.',
  },
  {
    title: 'Manage your team',
    description: 'Invite staff, reassign seats, and track completion.',
  },
  {
    title: 'Reminders',
    description: 'Automate follow-ups for staff who haven’t finished.',
  },
  {
    title: 'Certificates & records',
    description: 'Download certificates and compliance records.',
  },
]

const faqs = [
  {
    question: 'How do I invite a new staff member?',
    answer:
      'From your dashboard, enter their email in the Invitations block — or upload a CSV to invite several people at once. They’ll receive a secure link to set a password and begin training.',
  },
  {
    question: 'What score is needed to pass the Certificate Assessment?',
    answer:
      'The passing threshold is 80%, scored on our side when the quiz is submitted. Retakes are unlimited, and each attempt draws a fresh set of questions.',
  },
  {
    question: 'Why hasn’t a reminder email been sent?',
    answer:
      'Automatic reminders go to staff who haven’t finished training after your reminder window — set the cadence in Settings under Notifications. You can also send one instantly from the Manage team table’s Remind action.',
  },
  {
    question: 'How long is a certificate valid?',
    answer:
      'Certificates are valid for 12 months from the issue date. The certificate holder and firm admin receive expiry reminders at 90, 30, and 7 days before it lapses.',
  },
  {
    question: 'Can I export training completion records?',
    answer:
      'Yes. Download any individual certificate from the team table, or generate the firm attestation PDF — a summary of all active certificates — from the Quick actions on your dashboard.',
  },
]

const TOPICS = ['Account and billing', 'Training and assignments', 'Technical issue', 'Something else']

const emptyRequest = { topic: '', subject: '', details: '' }

interface Props {
  /** Signed-in user's email, fetched server-side — shown in the "we'll reply to" confirmation. */
  userEmail: string
}

export function SupportClient({ userEmail }: Props) {
  const [query, setQuery] = useState('')
  const [contactOpen, setContactOpen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success'>('idle')
  const [error, setError] = useState('')
  const [request, setRequest] = useState(emptyRequest)

  function openContact(topic: string) {
    setRequest({ ...emptyRequest, topic })
    setPhase('idle')
    setError('')
    setContactOpen(true)
  }

  const closeContact = useCallback(() => {
    setContactOpen(false)
    setPhase('idle')
    setError('')
    setRequest(emptyRequest)
  }, [])

  useEffect(() => {
    if (!contactOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeContact()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [contactOpen, closeContact])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredGuides = useMemo(
    () => guides.filter(g => `${g.title} ${g.description}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery]
  )
  const filteredFaqs = useMemo(
    () => faqs.filter(f => `${f.question} ${f.answer}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery]
  )
  const noResults = normalizedQuery && filteredGuides.length === 0 && filteredFaqs.length === 0

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPhase('loading')
    setError('')
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Could not send your request. Please try again.')
        setPhase('idle')
        return
      }
      setPhase('success')
    } catch {
      setError('Network error. Please try again.')
      setPhase('idle')
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-6 py-10 md:px-10 xl:px-14 xl:py-14">
      {/* ── Header — left-aligned, no status chrome ─────────────────────────── */}
      <section className="border-b border-[#E5EEF5] pb-10 dark:border-[#1F2429]">
        <h1 className={`${HEADING} text-4xl md:text-5xl`}>What can we help you solve?</h1>
        <p className={`mt-4 max-w-xl text-base ${MUTED}`}>
          Find a quick answer, browse the guides, or send our team a message.
        </p>

        <div className="relative mt-8 max-w-2xl">
          <SearchIcon className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${MUTED}`} />
          <label htmlFor="support-search" className="sr-only">
            Search support
          </label>
          <input
            id="support-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search guides and common questions…"
            className={`${INPUT} h-14 w-full pl-12 pr-4 text-base`}
          />
        </div>
      </section>

      {noResults ? (
        <section className="flex flex-col items-start gap-2 py-16">
          <HelpCircleIcon className={`h-8 w-8 ${MUTED}`} />
          <h2 className={`${HEADING} mt-3 text-xl`}>No help articles found</h2>
          <p className={`max-w-sm text-sm ${MUTED}`}>
            Try a different search, or send us your question and we&apos;ll point you in the right
            direction.
          </p>
          <button
            onClick={() => openContact('Something else')}
            className="mt-4 cursor-pointer rounded-full bg-[#32C7FF] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Ask support
          </button>
        </section>
      ) : (
        <>
          {filteredGuides.length > 0 && (
            <section className="py-10 md:py-12" aria-labelledby="guides-heading">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className={`text-sm font-medium ${MUTED}`}>Browse by topic</p>
                  <h2 id="guides-heading" className={`${HEADING} mt-1 text-2xl md:text-3xl`}>
                    Popular guides
                  </h2>
                </div>
                {!normalizedQuery && (
                  <a
                    href="#questions"
                    className={`hidden items-center gap-2 text-sm font-semibold ${ACCENT} hover:underline sm:flex`}
                  >
                    View FAQs <ArrowRightIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {filteredGuides.map(({ title, description }) => (
                  <a
                    key={title}
                    href="#questions"
                    className={`${CARD} group flex min-h-40 flex-col justify-between border border-transparent transition-colors hover:border-[#32C7FF]/60`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className={`${HEADING} text-lg xl:text-xl`}>{title}</h3>
                      <ArrowRightIcon
                        className={`mt-1.5 h-4 w-4 shrink-0 ${MUTED} transition-transform group-hover:translate-x-1 motion-reduce:transition-none`}
                      />
                    </div>
                    <p className={`mt-6 text-base leading-relaxed ${MUTED}`}>{description}</p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {filteredFaqs.length > 0 && (
            <section
              id="questions"
              className="border-t border-[#E5EEF5] py-10 md:py-12 dark:border-[#1F2429]"
              aria-labelledby="questions-heading"
            >
              <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr] md:gap-12">
                <div>
                  <h2 id="questions-heading" className={`${HEADING} text-2xl md:text-3xl`}>
                    Common questions
                  </h2>
                  <p className={`mt-4 text-sm leading-relaxed ${MUTED}`}>
                    The details firms most often need while managing their team&apos;s training.
                  </p>
                </div>
                <div className="border-t border-[#E5EEF5] dark:border-[#1F2429]">
                  {filteredFaqs.map(faq => (
                    <details
                      key={faq.question}
                      className="group border-b border-[#E5EEF5] dark:border-[#1F2429]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold text-[#0A0A0A] marker:content-none dark:text-[#F5F7FA]">
                        {faq.question}
                        <ChevronDownIcon
                          className={`h-4 w-4 shrink-0 ${MUTED} transition-transform group-open:rotate-180 motion-reduce:transition-none`}
                        />
                      </summary>
                      <p className={`max-w-xl pb-5 text-sm leading-relaxed ${MUTED}`}>{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Contact cards ───────────────────────────────────────────────────── */}
      <section
        className="grid gap-4 border-t border-[#E5EEF5] py-10 md:grid-cols-2 md:py-12 dark:border-[#1F2429]"
        aria-labelledby="contact-heading"
      >
        <div className={CARD}>
          <h2 id="contact-heading" className={`${HEADING} text-2xl`}>
            Still need a hand?
          </h2>
          <p className={`mt-3 max-w-md text-base leading-relaxed ${MUTED}`}>
            Tell us what you&apos;re trying to do. Include the details and we&apos;ll get you to the
            right person.
          </p>
          <button
            onClick={() => openContact('Training and assignments')}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#32C7FF] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Contact support <SendIcon className="h-4 w-4" />
          </button>
        </div>
        <div className={CARD}>
          <h2 className={`${HEADING} text-2xl`}>Report a technical issue</h2>
          <p className={`mt-3 max-w-md text-base leading-relaxed ${MUTED}`}>
            Something broken or behaving unexpectedly? Send a report with the steps that led to it.
          </p>
          <button
            onClick={() => openContact('Technical issue')}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#32C7FF] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            File an issue <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Footer — the real legal links used everywhere else ──────────────── */}
      <nav
        className={`flex flex-wrap gap-x-6 gap-y-1 border-t border-[#E5EEF5] px-1 pt-6 text-sm ${MUTED} dark:border-[#1F2429]`}
      >
        <Link href="/privacy" className="hover:text-[#0094FF]">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-[#0094FF]">
          Terms of Service
        </Link>
        <Link href="/dpa" className="hover:text-[#0094FF]">
          Cookies
        </Link>
      </nav>

      {/* ── Contact modal ───────────────────────────────────────────────────── */}
      {contactOpen && (
        <div
          onClick={closeContact}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-dialog-title"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl md:p-7 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-medium ${ACCENT}`}>Send a request</p>
                <h2 id="support-dialog-title" className={`${HEADING} mt-1 text-2xl`}>
                  How can we help?
                </h2>
              </div>
              <button
                onClick={closeContact}
                className={`cursor-pointer rounded-xl p-2 ${MUTED} transition-colors hover:bg-[#F5F7FA] hover:text-[#0A0A0A] dark:hover:bg-[#131A20] dark:hover:text-[#F5F7FA]`}
                aria-label="Close support form"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {phase === 'success' ? (
              <div className="flex flex-col items-center py-12 text-center" role="status">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#32C7FF] text-white">
                  <CheckIcon className="h-6 w-6" />
                </span>
                <h3 className={`${HEADING} mt-5 text-xl`}>Request received</h3>
                <p className={`mt-2 max-w-sm text-sm leading-relaxed ${MUTED}`}>
                  Your{' '}
                  <span className="font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
                    {request.topic.toLowerCase()}
                  </span>{' '}
                  request is in. We&apos;ll reply to{' '}
                  <span className="font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
                    {userEmail}
                  </span>{' '}
                  within one business day.
                </p>
                <button
                  onClick={closeContact}
                  className="mt-6 cursor-pointer rounded-full border border-[#E5EEF5] px-6 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#F5F7FA] dark:border-[#1F2429] dark:text-[#F5F7FA] dark:hover:bg-[#131A20]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitRequest} className="mt-7 flex flex-col gap-5">
                <label className="flex flex-col gap-2 text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
                  Topic
                  <select
                    required
                    value={request.topic}
                    onChange={e => setRequest(prev => ({ ...prev, topic: e.target.value }))}
                    disabled={phase === 'loading'}
                    className={`${INPUT} h-11 px-3 text-sm disabled:opacity-50`}
                  >
                    <option value="" disabled>
                      Select a topic
                    </option>
                    {TOPICS.map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
                  Subject
                  <input
                    required
                    value={request.subject}
                    onChange={e => setRequest(prev => ({ ...prev, subject: e.target.value }))}
                    disabled={phase === 'loading'}
                    placeholder="Briefly describe the issue"
                    className={`${INPUT} h-11 px-3 text-sm disabled:opacity-50`}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
                  Details
                  <textarea
                    required
                    value={request.details}
                    onChange={e => setRequest(prev => ({ ...prev, details: e.target.value }))}
                    disabled={phase === 'loading'}
                    rows={5}
                    placeholder="What happened, and what did you expect?"
                    className={`${INPUT} resize-none p-3 text-sm leading-relaxed disabled:opacity-50`}
                  />
                </label>

                {error && <p className="text-sm text-[#DC2626]">{error}</p>}

                <button
                  type="submit"
                  disabled={phase === 'loading'}
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#32C7FF] px-6 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {phase === 'loading' ? 'Sending…' : 'Send request'} <SendIcon className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

/* ── Inline stroke icons — house style (24×24, currentColor, ~1.8–2 stroke) ── */

function iconProps(className?: string) {
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

function HelpCircleIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.5 2.5 0 015-.1c0 1.6-2.5 2-2.5 3.4" />
      <path d="M12 16.5h.01" />
    </svg>
  )
}

