'use client'

import { useState } from 'react'

interface Props {
  certId: string
  certNumber: string | null
  employeeName: string
  issuedAt: string | null
  expiresAt: string | null
  onClose: () => void
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function CertPreviewModal({ certId, certNumber, employeeName, issuedAt, expiresAt, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/certificates/${certId}/url`)
      const data = (await res.json()) as { url?: string }
      if (data.url) window.open(data.url, '_blank')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Certificate</p>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-xs text-zinc-500 font-mono">
            #{certNumber ?? '—'}
          </p>
          <p className="text-base font-semibold text-white">{employeeName}</p>
          <div className="space-y-1.5 text-sm text-zinc-400">
            <p>
              <span className="text-zinc-600">Issued:&nbsp;</span>
              {fmt(issuedAt)}
            </p>
            <p>
              <span className="text-zinc-600">Expires:&nbsp;</span>
              {fmt(expiresAt)}
            </p>
            <p>
              <span className="text-zinc-600">Course:&nbsp;</span>
              Responsible Use of AI within the Legal Industry
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex-1 rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Opening…' : 'Download PDF'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
