'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Row } from './row'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg'])
const MAX_BYTES = 2 * 1024 * 1024

export function AvatarUpload({
  avatarUrl: initialAvatarUrl,
  fullName,
  email,
}: {
  avatarUrl: string | null
  fullName: string | null
  email: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initial = (fullName?.trim()[0] || email[0] || '?').toUpperCase()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after an error
    if (!file) return

    setError(null)

    if (!ALLOWED_TYPES.has(file.type)) {
      setError('PNG or JPG only.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('File must be under 2MB.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/account/avatar', { method: 'POST', body: formData })
      const data = (await res.json()) as { avatarUrl?: string; error?: string }

      if (!res.ok || !data.avatarUrl) {
        setError(data.error ?? 'Upload failed. Please try again.')
        return
      }

      setAvatarUrl(data.avatarUrl)
      router.refresh() // picks up the new avatar in the nav pill on next render
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Row first>
      <div>
        <span className="mb-0 block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
          Profile photo
        </span>
        <p className="text-sm text-[#8A8A8A] dark:text-[#7A8189]">PNG or JPG, up to 2MB.</p>
        {error && <p className="mt-1 text-sm text-[#DC2626]">{error}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-emphasis)] text-[22px] font-bold text-white">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- no next/image remote-pattern config in this project; plain <img> matches the codebase convention
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EEF5] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#1F2429]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </Row>
  )
}
