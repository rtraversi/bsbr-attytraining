import { describe, it, expect } from 'vitest'
import {
  requiresSubmittedIntake,
  INTAKE_GATE_EXEMPT_PATHS,
  INTAKE_GATE_REDIRECT,
} from '@/lib/intake/gate'

/**
 * The gate is a hard one: two exemptions and nothing else. The failure that
 * matters is not "a route was wrongly gated" — that is loud and someone reports
 * it in a minute. It is a route wrongly EXEMPT, which is silent, and lands a
 * paying firm on a dashboard that has no idea the intake exists.
 */
describe('requiresSubmittedIntake', () => {
  it('gates /dashboard and every child', () => {
    for (const path of [
      '/dashboard',
      '/dashboard/',
      '/dashboard/overview',
      '/dashboard/quizzes',
      '/dashboard/settings',
      '/dashboard/training',
      '/dashboard/training/lesson/3',
    ]) {
      expect({ path, gated: requiresSubmittedIntake(path) }).toEqual({ path, gated: true })
    }
  })

  it('exempts billing and support, and their children', () => {
    for (const path of [
      '/dashboard/billing',
      '/dashboard/billing/',
      '/dashboard/billing/history',
      '/dashboard/support',
      '/dashboard/support/ticket/9',
    ]) {
      expect({ path, gated: requiresSubmittedIntake(path) }).toEqual({ path, gated: false })
    }
  })

  it('does NOT exempt a route that merely starts with an exempt path', () => {
    // The whole reason this is segment-aware rather than a bare startsWith. A
    // route named /dashboard/billing-export is not billing, and letting it
    // through would open a door nobody meant to open.
    for (const path of ['/dashboard/billingexport', '/dashboard/billing-export', '/dashboard/supported']) {
      expect({ path, gated: requiresSubmittedIntake(path) }).toEqual({ path, gated: true })
    }
  })

  it('leaves everything outside /dashboard alone', () => {
    for (const path of [
      '/',
      '/intake',
      '/login',
      '/onboarding',
      '/pricing',
      '/verify/abc',
      '/update-password',
      // Not a child of /dashboard, however much it looks like one.
      '/dashboards',
      '/dashboard-preview',
    ]) {
      expect({ path, gated: requiresSubmittedIntake(path) }).toEqual({ path, gated: false })
    }
  })

  it('never gates the route it redirects to', () => {
    // A gate that catches its own destination is an infinite loop.
    expect(requiresSubmittedIntake(INTAKE_GATE_REDIRECT)).toBe(false)
  })

  it('keeps the exemption list to exactly two', () => {
    // Deliberately brittle. Adding an exemption should require changing this
    // test, because every exemption is a door back to an empty dashboard.
    expect([...INTAKE_GATE_EXEMPT_PATHS]).toEqual(['/dashboard/billing', '/dashboard/support'])
  })
})
