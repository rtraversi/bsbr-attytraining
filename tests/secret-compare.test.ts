import { describe, it, expect } from 'vitest'
import { secretsMatch } from '@/lib/secret-compare'

describe('secretsMatch', () => {
  it('matches identical secrets', () => {
    expect(secretsMatch('s3cret-value', 's3cret-value')).toBe(true)
  })

  it.each([
    ['s3cret-valuf', 's3cret-value'],
    ['s3cret', 's3cret-value'],
    ['s3cret-value-and-more', 's3cret-value'],
    ['', 's3cret-value'],
    [null, 's3cret-value'],
    ['s3cret-value', undefined],
    ['', ''],
  ])('rejects %j against %j', (provided, expected) => {
    expect(secretsMatch(provided, expected)).toBe(false)
  })
})
