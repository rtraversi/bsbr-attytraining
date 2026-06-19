'use client'

import { useState } from 'react'

export function CertDownloadButton({ certId }: { certId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
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
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-teal-400 hover:text-teal-300 text-xs underline underline-offset-2 disabled:opacity-50 transition-colors"
    >
      {loading ? '…' : 'Download'}
    </button>
  )
}
