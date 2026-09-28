import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://iurixaccreditation.com'

// The public surface is the marketing site and the legal pages. Everything else
// is behind a login (or is a certificate lookup, which carries its own noindex)
// and has nothing a searcher could land on. Disallowing it keeps Google from
// spending crawl budget on login redirects and reporting them as soft 404s.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        '/dashboard',
        '/intake',
        '/onboarding',
        '/ops',
        '/mockup',
        '/training-content/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
