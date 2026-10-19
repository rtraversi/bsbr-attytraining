// Resolves a caller-supplied `next` value to an in-app path, or the fallback.
//
// A prefix check alone is not enough: the URL parser strips tabs and newlines
// before resolving, so `/\t/evil.com` passes /^\/[^/\\]/ and still lands on
// evil.com. Resolving against a placeholder origin and checking the result
// stayed on it is what actually decides "same site".
const PLACEHOLDER_ORIGIN = 'https://iurix.invalid'

export function safeNextPath(next: unknown, fallback: string): string {
  if (typeof next !== 'string' || !next.startsWith('/')) return fallback
  try {
    const url = new URL(next, PLACEHOLDER_ORIGIN)
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}
