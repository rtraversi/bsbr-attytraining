import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export const AVATAR_BUCKET = 'avatars'

// One hour. Certificates sign for 60 seconds, but a certificate URL is clicked
// once, immediately, by someone who just pressed a button. Avatars are <img>
// sources on long-lived dashboard pages — the team table can hold dozens, they
// may lazy-load on scroll, and the page is often left open. A 60-second token
// would leave broken images below the fold. Still far short of the unlimited,
// unauthenticated lifetime a public URL had.
export const AVATAR_URL_TTL_SECONDS = 60 * 60

/**
 * Resolve the storage path for a user's avatar, tolerating both metadata shapes.
 *
 * New shape (0019 onward): `avatar_path` holds the storage path.
 * Legacy shape: `avatar_url` holds a full public URL, from when the bucket was
 * public.
 *
 * The legacy branch deliberately does NOT parse the stored URL. The object path
 * has always been the bare user id (supabase/migrations/0013, and the upload
 * route), so the presence of the value is the only signal needed — a stale
 * hostname from the retired domain cannot mislead it, and there is no
 * URL-parsing edge case to get wrong.
 *
 * Returns null when the user has never set a photo, which is the common case and
 * must stay cheap: callers skip signing entirely rather than requesting a URL
 * for an object that does not exist.
 */
export function resolveAvatarPath(
  user: { id: string; user_metadata?: Record<string, unknown> | null } | null | undefined
): string | null {
  if (!user) return null
  const metadata = user.user_metadata ?? {}

  const path = metadata.avatar_path
  if (typeof path === 'string' && path.length > 0) return path

  const legacyUrl = metadata.avatar_url
  if (typeof legacyUrl === 'string' && legacyUrl.length > 0) return user.id

  return null
}

/** Sign one avatar path. Returns null on any failure — a missing photo is never an error. */
export async function signAvatarUrl(
  admin: AdminClient,
  path: string | null
): Promise<string | null> {
  if (!path) return null

  const { data, error } = await admin.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    // Downgraded from an error: an avatar that will not sign should render as
    // the initials placeholder, never break the page it sits on.
    console.warn('[avatars] failed to sign avatar url:', error?.message ?? 'no url returned')
    return null
  }

  return data.signedUrl
}

/**
 * Sign many avatar paths in one round trip — the dashboard renders one per firm
 * member, so signing serially would be N sequential network calls per page load.
 *
 * Returns an array positionally aligned with `paths`, so callers can zip it
 * straight back onto their member list. Nulls in, nulls out, at the same index.
 */
export async function signAvatarUrls(
  admin: AdminClient,
  paths: (string | null)[]
): Promise<(string | null)[]> {
  const present = [...new Set(paths.filter((p): p is string => !!p))]
  if (present.length === 0) return paths.map(() => null)

  const { data, error } = await admin.storage
    .from(AVATAR_BUCKET)
    .createSignedUrls(present, AVATAR_URL_TTL_SECONDS)

  if (error || !data) {
    console.warn('[avatars] failed to batch-sign avatar urls:', error?.message ?? 'no data returned')
    return paths.map(() => null)
  }

  // Index by path rather than trusting positional order. createSignedUrls
  // reports per-item errors inside the array, so a single missing object must
  // not shift every subsequent member's photo onto the wrong person.
  const byPath = new Map<string, string>()
  for (const row of data) {
    if (row.signedUrl && row.path) byPath.set(row.path, row.signedUrl)
  }

  return paths.map((p) => (p ? byPath.get(p) ?? null : null))
}
