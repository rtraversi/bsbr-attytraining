'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from './toast-provider'
import { Modal, ModalActions } from './modal'

interface ParsedRow {
  name: string
  email: string
  isAttorney: boolean
}

interface BulkResult {
  invited: number
  skipped: number
  invalid: number
  /** Rows created (and counted in `invited`) whose invite email failed to send. */
  emailFailed?: string[]
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const unquote = (s: string) => s.trim().replace(/^"|"$/g, '').trim()
  const firstCols = lines[0].split(',').map(c => unquote(c).toLowerCase())

  const nameIdx = firstCols.indexOf('name')
  const emailIdx = firstCols.indexOf('email')
  const attorneyIdx = firstCols.findIndex(c => c === 'attorney' || c === 'is_attorney')
  const hasHeader = nameIdx !== -1 || emailIdx !== -1
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines
    .map(line => {
      const cols = line.split(',').map(unquote)
      // If no header detected, assume name=col0 email=col1
      const name = nameIdx !== -1 ? (cols[nameIdx] ?? '') : (cols[0] ?? '')
      const email = emailIdx !== -1 ? (cols[emailIdx] ?? '') : (cols[1] ?? '')
      const attorneyValue = attorneyIdx !== -1 ? (cols[attorneyIdx] ?? '').toLowerCase() : ''
      return { name, email, isAttorney: ['1', 'true', 'yes', 'attorney'].includes(attorneyValue) }
    })
    .filter(r => r.name || r.email)
}

function summaryText(result: BulkResult): string {
  const parts: string[] = []
  if (result.invited > 0) parts.push(`${result.invited} invited`)
  if (result.skipped > 0) parts.push(`${result.skipped} already existed`)
  if (result.invalid > 0) parts.push(`${result.invalid} invalid email`)
  // Counted within `invited` — those members and their seats are real — so this
  // reads as a qualifier on the invited number, not another bucket beside it.
  const failed = result.emailFailed?.length ?? 0
  if (failed > 0) parts.push(`${failed} email${failed !== 1 ? 's' : ''} not delivered`)
  return parts.join(', ') || 'No rows processed'
}

/**
 * The Invitations card's bulk half: one button.
 *
 * ── Why the format explanation is a dialog ──────────────────────────────────
 *
 * It was two lines of 12px grey under the button — "CSV format: name,email,
 * attorney — use true for attorneys" — which is the whole of what a firm was
 * ever told about the only feature on this card that touches a file on their
 * computer. It could not say what a .csv IS, how to get one out of Excel, what
 * happens to a row that is already on the team, or that pressing the button
 * emails every person in the file at once. There was no room on the card, so it
 * said the least it could and left the rest to be discovered.
 *
 * Clicking the button now opens the instructions, and the file picker lives
 * inside them — so the explanation is unavoidable rather than optional, and it
 * costs the card nothing at rest. Max, 2026-08-27: "this is going to clear the
 * space ... and gives us the chance to explain how it works."
 *
 * The parsing, the preview and the upload are unchanged.
 */
export function CsvUploadForm({ seatsRemaining }: { seatsRemaining: number }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full border border-[#E5EEF5] py-3 text-center text-sm font-bold text-[#3D3D3D] transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)] dark:border-[#1F2429] dark:text-[#C4C9CE] dark:hover:border-[var(--brand-primary)] dark:hover:text-[var(--brand-primary)]"
      >
        Bulk invite (CSV)
      </button>

      {open && <CsvDialog seatsRemaining={seatsRemaining} onClose={() => setOpen(false)} />}
    </>
  )
}

function CsvDialog({
  seatsRemaining,
  onClose,
}: {
  seatsRemaining: number
  onClose: () => void
}) {
  const router = useRouter()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [phase, setPhase] = useState<'idle' | 'preview' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<BulkResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const staffRows = rows.filter(r => !r.isAttorney).length
  const attorneyRows = rows.length - staffRows
  const overSeats = Math.max(0, staffRows - seatsRemaining)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setResult(null)
    setErrorMsg('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCsv(text)
      setRows(parsed)
      setPhase(parsed.length > 0 ? 'preview' : 'error')
      if (parsed.length === 0) {
        setErrorMsg('No rows found. Check that your file has a name and an email on each line.')
      }
    }
    reader.readAsText(file)
  }

  async function handleUpload() {
    setPhase('uploading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/invite/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = (await res.json()) as BulkResult & { error?: string }

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Upload failed.')
        setPhase('error')
        return
      }

      setResult(data)
      setPhase('done')
      router.refresh()
      // Don't claim invites were sent when some weren't — those rows are badged
      // "Invite not delivered" on the team table until a resend succeeds.
      const failed = data.emailFailed?.length ?? 0
      addToast(
        failed > 0
          ? `${data.invited} member${data.invited !== 1 ? 's' : ''} added, ${failed} invite email${failed !== 1 ? 's' : ''} couldn’t be sent`
          : `${data.invited} invite${data.invited !== 1 ? 's' : ''} sent`,
      )
    } catch {
      setErrorMsg('Network error. Please try again.')
      setPhase('error')
    }
  }

  function reset() {
    setPhase('idle')
    setRows([])
    setFileName('')
    setResult(null)
    setErrorMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const busy = phase === 'uploading'

  // ── Finished ──────────────────────────────────────────────────────────────
  if (phase === 'done' && result) {
    return (
      <Modal title="Invites sent" onClose={onClose} wide>
        <p className="rounded-xl bg-[#EAF8FF] px-4 py-3 text-sm font-semibold text-[var(--brand-emphasis)] dark:bg-[var(--brand-emphasis)]/10">
          {summaryText(result)}
        </p>
        {(result.emailFailed?.length ?? 0) > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-[#B45309] dark:text-[#F0B357]">
            Those people are on your team and their seats are real — only the email did not go.
            They are badged “Invite not delivered” in the team table, where you can resend.
          </p>
        )}
        {/* Not ModalActions: neither button here is a cancel or a confirm —
            one starts a second upload and the other closes. Forcing them into
            that shape would have mislabelled both. */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-full border border-[#E5EEF5] bg-[#F2F4F7] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#E5EEF5] dark:border-[#1F2429] dark:bg-[#131A20] dark:text-[#F5F7FA] dark:hover:bg-[#1F2429]"
          >
            Upload another
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#262626] dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
          >
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Invite your team from a file"
      description="Upload one file and everyone in it is invited at once — one email each, sent when you press Send."
      onClose={onClose}
      busy={busy}
      wide
    >
      {/* ── 1. The file ─────────────────────────────────────────────────────── */}
      <Section n={1} title="It has to be a .csv file">
        <p>
          A CSV is a plain spreadsheet. In Excel, Numbers or Google Sheets, open your staff list
          and choose <Kbd>File → Save As</Kbd> (or <Kbd>Download</Kbd>) and pick{' '}
          <Kbd>CSV</Kbd>. An <Kbd>.xlsx</Kbd>, <Kbd>.numbers</Kbd> or <Kbd>.pdf</Kbd> will not
          open here.
        </p>
      </Section>

      {/* ── 2. The columns ──────────────────────────────────────────────────── */}
      <Section n={2} title="Three columns, one person per row">
        <pre className="overflow-x-auto rounded-lg border border-[#E5EEF5] bg-[#F7F9FB] p-3 font-mono text-[11px] leading-relaxed text-[#0A0A0A] dark:border-[#1F2429] dark:bg-[#131A20] dark:text-[#F5F7FA]">
{`name,email,attorney
Jane Ruiz,jane@yourfirm.com,true
Marcus Bell,marcus@yourfirm.com,
Dana Whitfield,dana@yourfirm.com,false`}
        </pre>
        <ul className="mt-3 flex flex-col gap-2">
          <Col name="name">
            Their full name — first and last, written the way you would write it formally, not a
            nickname or an initial.
          </Col>
          <Col name="email">
            Where their invite goes. Check these carefully: a transposed character means that
            person never hears from us, and you will not find out until a certificate does not
            arrive.
          </Col>
          <Col name="attorney">
            <Kbd>true</Kbd> for an attorney. Leave it blank or put <Kbd>false</Kbd> for everyone
            else. Getting this wrong on a staff member is what spends a seat you did not mean to
            spend.
          </Col>
        </ul>
        <p className="mt-3">
          The header row is optional — without one we read the first column as the name and the
          second as the email.
        </p>
      </Section>

      {/* ── 3. What sending does ────────────────────────────────────────────── */}
      <Section n={3} title="What happens when you send">
        <ul className="flex list-disc flex-col gap-1.5 pl-4">
          <li>Everyone in the file is emailed an invite at the same time.</li>
          <li>
            Staff each take one seat. Attorneys take none, and are not issued a certificate.
          </li>
          <li>Anyone already on your team is skipped rather than invited twice.</li>
          <li>Rows without a usable email are reported back and nothing is created for them.</li>
        </ul>
      </Section>

      {/* ── The picker ──────────────────────────────────────────────────────── */}
      <div className="mt-5 border-t border-[#E5EEF5] pt-5 dark:border-[#1F2429]">
        <label className="cursor-pointer">
          <span className="block w-full rounded-full border border-[#E5EEF5] py-3 text-center text-sm font-bold text-[#3D3D3D] transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)] dark:border-[#1F2429] dark:text-[#C4C9CE] dark:hover:border-[var(--brand-primary)] dark:hover:text-[var(--brand-primary)]">
            {fileName || 'Choose a .csv file'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            disabled={busy}
            className="sr-only"
          />
        </label>

        {/* Keyed on the parsed rows, not on the phase. A failed send moves the
            phase to 'error' — if this were phase-gated, the row count and the
            Send button would both vanish and the only way to retry a network
            blip would be to pick the same file again. */}
        {rows.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-[#8A8A8A] dark:text-[#7A8189]">
            <span className="font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
              {rows.length} {rows.length === 1 ? 'row' : 'rows'} found
            </span>{' '}
            — {staffRows} staff, {attorneyRows} {attorneyRows === 1 ? 'attorney' : 'attorneys'}.
            You have {seatsRemaining} staff {seatsRemaining === 1 ? 'seat' : 'seats'} left.
            {overSeats > 0 && (
              // Said before Send, not after a rejection. The server enforces the
              // cap; this is so nobody presses Send expecting all of them to go.
              <>
                {' '}
                <span className="font-semibold text-[#B45309] dark:text-[#F0B357]">
                  That is {overSeats} more staff than you have seats for
                </span>{' '}
                —{' '}
                <a
                  href="/api/portal"
                  className="font-semibold underline underline-offset-2 hover:opacity-80"
                >
                  add seats in Billing
                </a>{' '}
                first, or take them out of the file.
              </>
            )}
          </p>
        )}

        {errorMsg && <p className="mt-3 text-xs text-[#DC2626] dark:text-[#F87171]">{errorMsg}</p>}

        <div className="mt-4">
          <ModalActions
            onCancel={onClose}
            busy={busy}
            disabled={rows.length === 0}
            confirmLabel={
              rows.length > 0
                ? `Send ${rows.length} ${rows.length === 1 ? 'invite' : 'invites'}`
                : 'Send invites'
            }
            busyLabel="Sending…"
            onConfirm={handleUpload}
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Small local pieces ───────────────────────────────────────────────────────

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className={n === 1 ? '' : 'mt-5'}>
      <h3 className="flex items-center gap-2 text-[13px] font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
        <span
          aria-hidden
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--brand-emphasis)] text-[11px] font-bold text-white"
        >
          {n}
        </span>
        {title}
      </h3>
      <div className="mt-2 pl-7 text-xs leading-relaxed text-[#8A8A8A] dark:text-[#7A8189]">
        {children}
      </div>
    </section>
  )
}

function Col({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <li>
      <Kbd>{name}</Kbd>{' '}
      <span className="leading-relaxed">{children}</span>
    </li>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-[#F2F4F7] px-1 py-0.5 font-mono text-[11px] text-[#0A0A0A] dark:bg-[#1F2429] dark:text-[#F5F7FA]">
      {children}
    </code>
  )
}
