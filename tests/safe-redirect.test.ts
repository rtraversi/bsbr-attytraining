import { describe, it, expect } from 'vitest'
import { safeNextPath } from '@/lib/safe-redirect'

describe('safeNextPath', () => {
  it('keeps in-app paths, query and hash', () => {
    expect(safeNextPath('/dashboard', '/x')).toBe('/dashboard')
    expect(safeNextPath('/reset-password?step=2#top', '/x')).toBe('/reset-password?step=2#top')
  })

  it.each([
    ['//evil.com'],
    ['https://evil.com'],
    ['/\\evil.com'],
    ['\\\\evil.com'],
    ['/\t/evil.com'],
    ['/\n/evil.com'],
    ['javascript:alert(1)'],
    ['evil.com'],
    [''],
  ])('falls back for %j', (next) => {
    expect(safeNextPath(next, '/dashboard')).toBe('/dashboard')
  })

  it('falls back for non-strings', () => {
    expect(safeNextPath(undefined, '/dashboard')).toBe('/dashboard')
    expect(safeNextPath(['/a', '/b'], '/dashboard')).toBe('/dashboard')
  })
})
