'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

export interface PolicyViewSection {
  key: string
  title: string
  blocks: { id: string; text: string }[]
}

export interface PolicyViewActionItem {
  id: string
  text: string
  /** Still an unwritten placeholder. None are today; kept so one never renders as policy. */
  todo: boolean
}

interface Props {
  firmName: string
  sections: PolicyViewSection[]
  actionItems: PolicyViewActionItem[]
}

type Tab = 'policy' | 'list'

/* ── Tokens ────────────────────────────────────────────────────────────────── */
// No borders anywhere (the 2026-09-25 rule in CLAUDE.md): state is fill, depth
// is shadow. Values follow the mockup (policy-page-v1.html, view B).
const CARD_SHADOW = 'shadow-[0_6px_28px_-14px_rgba(0,70,140,0.18)] dark:shadow-none'
const BTN =
  'inline-flex items-center justify-center gap-2 rounded-[14px] px-[18px] py-3 text-[15px] font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-emphasis)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0D0F12]'
const BTN_PRIMARY = `${BTN} bg-[var(--brand-emphasis)] text-white`
const BTN_TINT = `${BTN} bg-[#EAF5FF] text-[var(--brand-emphasis)] dark:bg-[var(--brand-emphasis)]/15 dark:text-[var(--brand-primary)]`
const MUTED = 'text-[#7C838B] dark:text-[#7A8189]'

/**
 * The policy page body: hero, tab switcher, and the two panes.
 *
 * Every label on this screen is Max's approved copy from mockup B (2026-09-25).
 * The stats are counts of what the firm actually sees, so they always agree
 * with the panes below and with the download.
 */
export function PolicyView({ firmName, sections, actionItems }: Props) {
  const [tab, setTab] = useState<Tab>('policy')
  const clauseCount = sections.reduce((n, s) => n + s.blocks.length, 0)

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section
        className={`grid gap-6 rounded-[28px] bg-[linear-gradient(135deg,#EAF5FF_0%,#FFFFFF_70%)] p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-11 dark:bg-[linear-gradient(135deg,#0F1A22_0%,#0D0F12_70%)] ${CARD_SHADOW}`}
      >
        <div className="min-w-0">
          {/* "Policy draft" sits on its own line under the firm name, in brand
              blue, a touch smaller (Max: about 2pt; the mockup's 1em - 3px). */}
          <h1 className="font-headline text-[clamp(30px,4vw,46px)] leading-[1.05] font-bold tracking-[-0.02em] break-words text-[#0A0A0A] dark:text-[#F5F7FA]">
            {firmName}
            <span className="mt-0.5 block text-[calc(1em-3px)] text-[var(--brand-emphasis)] dark:text-[var(--brand-primary)]">
              Policy draft
            </span>
          </h1>
          <div className="mt-[18px] flex flex-wrap gap-x-[22px] gap-y-3">
            <Stat value={sections.length} label="sections" />
            <Stat value={clauseCount} label="clauses" />
            <Stat value={actionItems.length} label="action items" />
          </div>
        </div>

        {/* Plain links, not fetch + blob. The route sets Content-Disposition,
            so the browser saves the file itself. Full width below lg, which is
            what stacks them cleanly at 390px. */}
        <div className="flex flex-col gap-2.5 lg:min-w-[230px]">
          <a className={BTN_PRIMARY} href="/api/policy?format=docx" download>
            <DownloadIcon />
            Download policy
          </a>
          <a className={BTN_TINT} href="/api/policy?format=docx&document=action-items" download>
            <DownloadIcon />
            Download action list
          </a>
        </div>
      </section>

      {/* ── Tab row ───────────────────────────────────────────────────── */}
      <div className="mt-7 mb-[18px] flex flex-wrap items-center gap-x-3.5 gap-y-3">
        <Tabs tab={tab} onChange={setTab} count={actionItems.length} />
        <EditAnswers />
      </div>

      {/* ── Panes ─────────────────────────────────────────────────────── */}
      <div className={`rounded-[28px] bg-white p-6 sm:p-8 lg:p-14 dark:bg-[#0D0F12] ${CARD_SHADOW}`}>
        <div
          role="tabpanel"
          id="policy-pane-policy"
          aria-labelledby="policy-tab-policy"
          hidden={tab !== 'policy'}
          className="mx-auto max-w-[72ch]"
        >
          <h2 className="font-headline mb-5 text-[clamp(24px,3vw,30px)] leading-[1.1] font-bold tracking-[-0.02em] text-[#0A0A0A] dark:text-[#F5F7FA]">
            Artificial Intelligence Policy for {firmName}
          </h2>
          <Accordion sections={sections} />
        </div>

        <div
          role="tabpanel"
          id="policy-pane-list"
          aria-labelledby="policy-tab-list"
          hidden={tab !== 'list'}
          className="mx-auto max-w-[72ch]"
        >
          <p className={`mb-2 ${MUTED}`}>The action list shows items missing to complete this policy.</p>
          {actionItems.length === 0 ? (
            <p className="py-3.5 text-[15.5px]">Nothing outstanding.</p>
          ) : (
            <ol>
              {actionItems.map((item, i) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-3.5 text-[15.5px] leading-[1.6]"
                >
                  <span
                    aria-hidden
                    className="mt-px grid h-7 w-7 place-items-center rounded-full bg-[#EAF5FF] text-[13px] font-bold text-[var(--brand-emphasis)] dark:bg-[var(--brand-emphasis)]/15 dark:text-[var(--brand-primary)]"
                  >
                    {i + 1}
                  </span>
                  <span
                    className={
                      item.todo
                        ? 'rounded-xl bg-[#FFF4F3] px-3 py-2 font-semibold whitespace-pre-line text-[#8C1D18] dark:bg-[#2A1614] dark:text-[#F2B8B5]'
                        : 'whitespace-pre-line'
                    }
                  >
                    {item.text}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <span className="font-headline block text-[26px] leading-tight font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
        {value}
      </span>
      <span className={`text-[13px] ${MUTED}`}>{label}</span>
    </div>
  )
}

/**
 * Policy | Action list. A real tablist: roving tabindex, aria-selected, and
 * Left/Right/Home/End move and select, per the WAI-ARIA tabs pattern.
 */
function Tabs({ tab, onChange, count }: { tab: Tab; onChange: (t: Tab) => void; count: number }) {
  const order: Tab[] = ['policy', 'list']
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ policy: null, list: null })

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = order.indexOf(tab)
    let next: Tab | null = null
    if (e.key === 'ArrowRight') next = order[(i + 1) % order.length]
    else if (e.key === 'ArrowLeft') next = order[(i - 1 + order.length) % order.length]
    else if (e.key === 'Home') next = order[0]
    else if (e.key === 'End') next = order[order.length - 1]
    if (!next) return
    e.preventDefault()
    onChange(next)
    refs.current[next]?.focus()
  }

  const button = (id: Tab, label: string, badge?: number) => {
    const on = tab === id
    return (
      <button
        ref={(el) => {
          refs.current[id] = el
        }}
        type="button"
        role="tab"
        id={`policy-tab-${id}`}
        aria-selected={on}
        aria-controls={`policy-pane-${id}`}
        tabIndex={on ? 0 : -1}
        onClick={() => onChange(id)}
        onKeyDown={onKeyDown}
        className={`inline-flex items-center rounded-full px-[18px] py-2.5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-emphasis)] ${
          on
            ? 'bg-[var(--brand-emphasis)] text-white'
            : 'text-[#3A4048] hover:bg-[#F5FAFF] dark:text-[#C4CBD2] dark:hover:bg-[#131A20]'
        }`}
      >
        {label}
        {badge !== undefined && (
          <span
            className={`ml-1.5 rounded-full px-[7px] py-0.5 text-xs ${
              on
                ? 'bg-white/25 text-white'
                : 'bg-[#EAF5FF] text-[var(--brand-emphasis)] dark:bg-[var(--brand-emphasis)]/15 dark:text-[var(--brand-primary)]'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      role="tablist"
      aria-label="Policy documents"
      className={`inline-flex gap-1 rounded-full bg-white p-[5px] dark:bg-[#0D0F12] ${CARD_SHADOW}`}
    >
      {button('policy', 'Policy')}
      {button('list', 'Action list', count)}
    </div>
  )
}

/**
 * Edit answers: the same behaviour as the submitted screen's button
 * (app/intake/_components/intake-review.tsx) — reopen the intake, then go to
 * it. Reopening an already-open intake is not an error server-side, so a
 * double click still lands on /intake.
 */
function EditAnswers() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function edit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/intake/reopen', { method: 'POST' })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'That did not go through. Try again in a moment.')
        setBusy(false)
        return
      }
      router.push('/intake')
    } catch {
      setError('That did not go through. Try again in a moment.')
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void edit()}
        disabled={busy}
        className="rounded-md px-1.5 py-1 text-[15px] font-semibold text-[var(--brand-emphasis)] underline decoration-2 underline-offset-[5px] transition-[text-decoration-thickness] hover:decoration-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-emphasis)] disabled:opacity-50 dark:text-[var(--brand-primary)]"
      >
        Edit answers
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm font-medium text-[#B42318] dark:text-[#F97066]">
          {error}
        </p>
      )}
    </>
  )
}

/** One expand/collapse row per section; the first two start open (mockup B). */
function Accordion({ sections }: { sections: PolicyViewSection[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(sections.slice(0, 2).map((s) => s.key)))

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="flex flex-col gap-2">
      {sections.map((section) => {
        const isOpen = open.has(section.key)
        const panelId = `policy-section-${section.key}`
        return (
          <div key={section.key}>
            {/* A button, not <summary>: the open set is React state, so a
                re-render (switching tabs) can never fight the DOM over it. */}
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(section.key)}
                className="font-headline flex w-full items-center justify-between gap-4 rounded-2xl bg-[#F5FAFF] px-[18px] py-4 text-left text-[18px] font-bold text-[#0A0A0A] transition-colors hover:bg-[#EAF5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-emphasis)] dark:bg-[#131A20] dark:text-[#F5F7FA] dark:hover:bg-[#18212A]"
              >
                {/* No section number: the spine's numbers are deliberately not
                    contiguous, so shown they read as gaps (Max, 2026-09-24). */}
                <span>{section.title}</span>
                <span
                  aria-hidden
                  className="shrink-0 font-sans text-[22px] leading-none font-normal text-[var(--brand-emphasis)] dark:text-[var(--brand-primary)]"
                >
                  {isOpen ? '–' : '+'}
                </span>
              </button>
            </h3>
            <div id={panelId} hidden={!isOpen} className="px-[18px] pt-4 pb-1.5">
              {section.blocks.map((block) => (
                // whitespace-pre-line: Katy double-spaces after full stops and
                // the transcription preserved that deliberately.
                <p
                  key={block.id}
                  className="mb-3 text-[16px] leading-[1.7] whitespace-pre-line text-[#1F2328] last:mb-0 dark:text-[#D5DADF]"
                >
                  {block.text}
                </p>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden
      className="h-[17px] w-[17px] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
    </svg>
  )
}
