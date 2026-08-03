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
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[#E5EEF5] bg-white p-6 shadow-2xl dark:border-[#1F2429] dark:bg-[#0D0F12]">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-[#8A8A8A] dark:text-[#7A8189]">Certificate</p>
          <button
            onClick={onClose}
            className="text-[#8A8A8A] transition-colors hover:text-[#0A0A0A] dark:text-[#7A8189] dark:hover:text-[#F5F7FA]"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <p className="font-mono text-xs text-[#8A8A8A] dark:text-[#7A8189]">#{certNumber ?? '—'}</p>
          <p className="text-base font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">{employeeName}</p>
          <div className="space-y-1.5 text-sm text-[#3D3D3D] dark:text-[#C4C9CE]">
            <p>
              <span className="text-[#8A8A8A] dark:text-[#7A8189]">Issued:&nbsp;</span>
              {fmt(issuedAt)}
            </p>
            <p>
              <span className="text-[#8A8A8A] dark:text-[#7A8189]">Expires:&nbsp;</span>
              {fmt(expiresAt)}
            </p>
            <p>
              <span className="text-[#8A8A8A] dark:text-[#7A8189]">Course:&nbsp;</span>
              Responsible Use of AI within the Legal Industry
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex-1 rounded-xl bg-[var(--brand-emphasis)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Opening…' : 'Download PDF'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#E5EEF5] bg-[#F2F4F7] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#E5EEF5] dark:border-[#1F2429] dark:bg-[#131A20] dark:text-[#F5F7FA] dark:hover:bg-[#1F2429]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
