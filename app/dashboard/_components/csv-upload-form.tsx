'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

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

  if (seatsRemaining <= 0) {
    return (
      <p className="text-sm text-yellow-400">
        All seats are in use. Contact us to add more before bulk-inviting.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500">
        CSV format: <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded">name,email</code> — one employee per row, header row required.
      </p>

      {/* File picker */}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <span className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors inline-block">
            {fileName || 'Choose CSV file'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        {phase === 'preview' && (
          <button
            onClick={handleUpload}
            className="rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors whitespace-nowrap"
          >
            Invite {rows.length} {rows.length === 1 ? 'employee' : 'employees'}
          </button>
        )}

        {phase === 'uploading' && (
          <span className="text-sm text-zinc-400">Sending invites…</span>
        )}
      </div>

      {/* Preview count */}
      {phase === 'preview' && (
        <p className="text-xs text-zinc-500">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'} found —{' '}
          {seatsRemaining} seat{seatsRemaining !== 1 ? 's' : ''} remaining
        </p>
      )}

      {/* Result */}
      {phase === 'done' && result && (
        <div className="flex items-center justify-between rounded-lg border border-teal-500/20 bg-teal-500/5 px-4 py-3">
          <p className="text-sm text-teal-400">{summaryText(result)}</p>
          <button
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-4 shrink-0"
          >
            Upload another
          </button>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}
    </div>
  )
}
