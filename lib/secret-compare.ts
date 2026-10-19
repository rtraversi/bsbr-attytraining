// Compares a caller-supplied secret against the expected one in time that
// depends only on the expected value's length, so response timing can't be
// used to guess it a byte at a time. Pure JS rather than
// crypto.subtle.timingSafeEqual (a Workers-only extension) or node:crypto's
// timingSafeEqual, so the same check runs in middleware, route handlers and
// `next dev` alike. Missing on either side is never a match.
export function secretsMatch(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false
  const a = new TextEncoder().encode(provided)
  const b = new TextEncoder().encode(expected)
  let diff = a.length ^ b.length
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i]
  return diff === 0
}
