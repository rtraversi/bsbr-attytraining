'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from './toast-provider'

interface ParsedRow {
  name: string
  email: string
}

interface BulkResult {
  invited: number
  skipped: number
  invalid: number
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
  const hasHeader = nameIdx !== -1 || emailIdx !== -1
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines
    .map(line => {
      const cols = line.split(',').map(unquote)
      // If no header detected, assume name=col0 email=col1
      const name = nameIdx !== -1 ? (cols[nameIdx] ?? '') : (cols[0] ?? '')
      const email = emailIdx !== -1 ? (cols[emailIdx] ?? '') : (cols[1] ?? '')
      return { name, email }
    })
    .filter(r => r.name || r.email)
}

function summaryText(result: BulkResult): string {
  const parts: string[] = []
  if (result.invited > 0) parts.push(`${result.invited} invited`)
  if (result.skipped > 0) parts.push(`${result.skipped} already existed`)
  if (result.invalid > 0) parts.push(`${result.invalid} invalid email`)
  return parts.join(', ') || 'No rows processed'
}

export function CsvUploadForm({ seatsRemaining }: { seatsRemaining: number }) {
  const router = useRouter()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [phase, setPhase] = useState<'idle' | 'preview' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<BulkResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

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
      if (parsed.length === 0) setErrorMsg('No rows found. Check that your CSV has name and email columns.')
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
      addToast(`${data.invited} invite${data.invited !== 1 ? 's' : ''} sent`)
    } catch {
      setErrorMsg('Network error. Please try again.')
      setPhase('error')
    }
  }

  function handleReset() {
    setPhase('idle')
    setRows([])
    setFileName('')
    setResult(null)
    setErrorMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Seats-full: the disabled affordance stays visible so the action is still
  // discoverable. The explanatory note is rendered once by the Invitations card.
  if (seatsRemaining <= 0) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-[#E5EEF5] py-3.5 text-sm font-bold text-[#B0B7BF] dark:border-[#1F2429] dark:text-[#4E555C]"
      >
        Bulk invite (CSV)
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="cursor-pointer">
        <span className="block w-full rounded-xl border border-[#E5EEF5] py-3.5 text-center text-sm font-bold text-[#3D3D3D] transition-colors hover:border-[#0094FF] hover:text-[#0094FF] dark:border-[#1F2429] dark:text-[#C4C9CE] dark:hover:border-[#32C7FF] dark:hover:text-[#32C7FF]">
          {fileName || 'Bulk invite (CSV)'}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>

      <p className="text-center text-xs text-[#8A8A8A] dark:text-[#7A8189]">
        CSV format: <code className="rounded bg-[#F5F7FA] px-1 py-0.5 dark:bg-[#131A20]">name,email</code> — one per row.
      </p>

      {phase === 'preview' && (
        <>
          <button
            onClick={handleUpload}
            className="w-full rounded-xl bg-black py-3.5 text-sm font-bold text-white transition-colors hover:bg-gray-800 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-white"
          >
            Invite {rows.length} {rows.length === 1 ? 'employee' : 'employees'}
          </button>
          <p className="text-center text-xs text-[#8A8A8A] dark:text-[#7A8189]">
            {rows.length} {rows.length === 1 ? 'row' : 'rows'} found — {seatsRemaining} seat
            {seatsRemaining !== 1 ? 's' : ''} remaining
          </p>
        </>
      )}

      {phase === 'uploading' && (
        <span className="text-[11px] text-[#8A8A8A] dark:text-[#7A8189]">Sending invites…</span>
      )}

      {phase === 'done' && result && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#EAF8FF] px-3 py-2 dark:bg-[#0094FF]/10">
          <p className="text-[11px] font-semibold text-[#0094FF]">{summaryText(result)}</p>
          <button
            onClick={handleReset}
            className="shrink-0 text-[10px] text-[#8A8A8A] transition-colors hover:text-[#0A0A0A] dark:hover:text-[#F5F7FA]"
          >
            Upload another
          </button>
        </div>
      )}

      {phase === 'error' && <p className="text-[11px] text-[#DC2626]">{errorMsg}</p>}
    </div>
  )
}
