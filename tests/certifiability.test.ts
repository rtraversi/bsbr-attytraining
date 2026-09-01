import { describe, expect, it } from 'vitest'
import { isCertifiableMember } from '@/lib/seats'

describe('isCertifiableMember', () => {
  it('separates the open training experience from certificate eligibility', () => {
    // Training pages intentionally do not call this predicate. It is only for
    // certification routes and dashboard completion counts.
    expect(isCertifiableMember({ status: 'active', occupies_seat: true, is_attorney: false })).toBe(true)
    expect(isCertifiableMember({ status: 'active', occupies_seat: false, is_attorney: true })).toBe(false)
  })

  it('keeps the existing paid-member and membership-status requirements', () => {
    expect(isCertifiableMember({ status: 'active', occupies_seat: false, is_attorney: false })).toBe(false)
    expect(isCertifiableMember({ status: 'deactivated', occupies_seat: true, is_attorney: false })).toBe(false)
  })
})
