import { describe, expect, it } from 'vitest'
import {
  PROD_PROJECT_REF,
  STAGING_PROJECT_REF,
  ResultStatus,
  classifyBundleRefs,
  classifyResults,
  extractNextChunkUrls,
  extractSupabaseProjectRefs,
} from '../scripts/verify-cutover-helpers.mjs'

/**
 * These cover only pure parsing and classification. Mocking fetch would merely
 * prove a mock matches the code, so the real network round trip is deliberately
 * not covered here; the read-only verifier performs it against the live domain.
 */

describe('extractNextChunkUrls', () => {
  it('finds every referenced Next chunk and resolves relative paths', () => {
    const html = [
      '<script src="/_next/static/chunks/a.js"></script>',
      '<link href="/_next/static/chunks/b.js?dpl=123" rel="preload">',
      '<script src="/_next/static/chunks/a.js"></script>',
      '<script src="/not-a-next-chunk.js"></script>',
    ].join('')

    expect(extractNextChunkUrls(html, 'https://iurixaccreditation.com/login')).toEqual([
      'https://iurixaccreditation.com/_next/static/chunks/a.js',
      'https://iurixaccreditation.com/_next/static/chunks/b.js?dpl=123',
    ])
  })
})

describe('Supabase ref classification', () => {
  it('recognises the known refs in fetched asset text', () => {
    expect(extractSupabaseProjectRefs(`url=${PROD_PROJECT_REF}; old=${STAGING_PROJECT_REF}`)).toEqual([
      PROD_PROJECT_REF,
      STAGING_PROJECT_REF,
    ])
  })

  it('passes only when the fetched bundle contains PROD and not staging', () => {
    expect(classifyBundleRefs([PROD_PROJECT_REF])).toMatchObject({ status: ResultStatus.PASS })
  })

  it('fails for staging or a mixed browser bundle', () => {
    expect(classifyBundleRefs([STAGING_PROJECT_REF])).toMatchObject({ status: ResultStatus.FAIL })
    expect(classifyBundleRefs([PROD_PROJECT_REF, STAGING_PROJECT_REF])).toMatchObject({
      status: ResultStatus.FAIL,
    })
  })

  it('makes a missing ref loudly inconclusive instead of passing it', () => {
    expect(classifyBundleRefs([])).toMatchObject({ status: ResultStatus.INCONCLUSIVE })
  })
})

describe('overall result classification', () => {
  it('uses distinct exit semantics for pass, failure and inconclusive evidence', () => {
    expect(classifyResults([{ status: ResultStatus.PASS }])).toEqual({
      status: ResultStatus.PASS,
      exitCode: 0,
    })
    expect(classifyResults([{ status: ResultStatus.INCONCLUSIVE }])).toEqual({
      status: ResultStatus.INCONCLUSIVE,
      exitCode: 2,
    })
    expect(classifyResults([{ status: ResultStatus.INCONCLUSIVE }, { status: ResultStatus.FAIL }])).toEqual({
      status: ResultStatus.FAIL,
      exitCode: 1,
    })
  })
})
