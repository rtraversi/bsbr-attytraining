import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isFirmNameBlank, normalizeFirmName } from '@/lib/firm-name'
import { getQuestion } from '@/lib/intake/questions'

/**
 * The firm name: captured once at onboarding, held by a middleware gate until
 * it exists, and still question one of the intake.
 *
 * ── Why the gate is asserted against the SOURCE ─────────────────────────────
 *
 * middleware.ts cannot be imported into vitest: it pulls in @supabase/ssr and
 * next/server, and its behaviour is a redirect decided from a live session and
 * a database row. Driving it would mean re-implementing the request, which
 * tests the re-implementation.
 *
 * So the pure decision — "is this name blank" — is tested directly, and the
 * things that would silently break the gate if someone edited middleware.ts are
 * pinned against the file itself. That is a weaker test than an integration
 * one, and it is deliberately narrow: it pins the exemptions and the fact that
 * the check runs in middleware AT ALL, which is the part that was got wrong on
 * 2026-08-26 by putting the equivalent gate in a layout.
 */

const ROOT = join(__dirname, '..')
const middlewareSrc = readFileSync(join(ROOT, 'middleware.ts'), 'utf8')

describe('normalizeFirmName — the one definition of a usable name', () => {
  it('trims', () => {
    expect(normalizeFirmName('  Chavez Law  ')).toBe('Chavez Law')
  })

  it('rejects empty and whitespace-only', () => {
    // The whole point. A whitespace-only name satisfies `not null`, satisfies a
    // truthiness check on the raw string, and then renders blank everywhere.
    expect(normalizeFirmName('')).toBeNull()
    expect(normalizeFirmName('   ')).toBeNull()
    expect(normalizeFirmName('\t\n  ')).toBeNull()
  })

  it('rejects non-strings rather than coercing them', () => {
    expect(normalizeFirmName(undefined)).toBeNull()
    expect(normalizeFirmName(null)).toBeNull()
    expect(normalizeFirmName(42)).toBeNull()
    expect(normalizeFirmName({ name: 'Chavez Law' })).toBeNull()
  })

  it('keeps a name that only looks empty', () => {
    expect(normalizeFirmName('  A  ')).toBe('A')
  })
})

describe('isFirmNameBlank — the gate predicate', () => {
  it('treats the webhook’s empty write as blank', () => {
    // app/api/webhooks/stripe/route.ts inserts name: ''. This is the state the
    // gate exists to catch.
    expect(isFirmNameBlank('')).toBe(true)
  })

  it('treats whitespace as blank, so a saved space cannot clear the gate', () => {
    expect(isFirmNameBlank('   ')).toBe(true)
  })

  it('treats a missing row as blank', () => {
    expect(isFirmNameBlank(null)).toBe(true)
    expect(isFirmNameBlank(undefined)).toBe(true)
  })

  it('lets a real name through, and never fires again', () => {
    expect(isFirmNameBlank('Chavez Law')).toBe(false)
  })

  it('agrees with the writers — anything written can be read back as present', () => {
    // If these two ever disagreed, a name accepted on write would read back as
    // blank and bounce the firm into a gate it had already cleared.
    for (const raw of ['Chavez Law', '  Byron & Lovelace LLP  ', 'A']) {
      const written = normalizeFirmName(raw)
      expect(written).not.toBeNull()
      expect(isFirmNameBlank(written)).toBe(false)
    }
  })
})

describe('the gate lives in middleware, not a layout', () => {
  it('middleware.ts performs the blank-name check itself', () => {
    // 🔴 This is the assertion that matters. A shared layout does not re-render
    // on a soft navigation, so the same gate written there passes once and is
    // then absent for every client-side link afterwards — how the 2026-08-26
    // gate was got wrong.
    expect(middlewareSrc).toContain('isFirmNameBlank')
    expect(middlewareSrc).toContain('/onboarding/firm-name')
  })

  it('redirects rather than rendering', () => {
    expect(middlewareSrc).toMatch(/onboarding\/firm-name[\s\S]{0,400}NextResponse\.redirect/)
  })

  it('does not gate employees', () => {
    // The firm name is the admin's field. Gating staff would trap them behind
    // something they have no way to fix.
    expect(middlewareSrc).toContain("role === 'admin'")
  })

  it('fails open', () => {
    // A database hiccup must not lock every admin behind a name step whose own
    // save would also be failing.
    expect(middlewareSrc).toContain('[middleware] firm-name gate check failed')
    // The catch has to sit around the query, not around the redirect — a catch
    // that swallowed the redirect would make the gate silently do nothing.
    expect(middlewareSrc).toMatch(
      /try \{[\s\S]*isFirmNameBlank[\s\S]*\} catch[\s\S]{0,600}firm-name gate check failed/,
    )
  })
})

describe('the gate exemptions', () => {
  // Each of these would either loop or break the flow the firm needs in order
  // to reach the name step at all.
  const mustBeExempt = [
    '/onboarding', // the name step itself → infinite redirect
    '/api/', // the write behind it, and the sign-out POST
    '/auth/', // mid-handshake: dropping the code strands the user
    '/update-password', // password recovery, and an invite's first visit
    '/forgot-password',
    '/login', // always able to leave
    '/terms', // entitled to read what they accepted
    '/privacy',
    '/cookies',
  ]

  for (const path of mustBeExempt) {
    it(`exempts ${path}`, () => {
      expect(middlewareSrc).toContain(`'${path}'`)
    })
  }

  it('names the exemptions in one function rather than inline', () => {
    // One list, so adding a route cannot half-exempt it.
    expect(middlewareSrc).toContain('function isNameGateExempt')
  })
})

describe('the server rejects a blank name — not only the UI', () => {
  const completeSrc = readFileSync(
    join(ROOT, 'app/api/onboarding/complete/route.ts'),
    'utf8',
  )
  const nameRouteSrc = readFileSync(join(ROOT, 'app/api/firm/name/route.ts'), 'utf8')

  it('/api/onboarding/complete normalises and refuses', () => {
    expect(completeSrc).toContain('normalizeFirmName')
    expect(completeSrc).toMatch(/if \(!firmName\)[\s\S]{0,200}status: 400/)
  })

  it('/api/firm/name normalises and refuses', () => {
    expect(nameRouteSrc).toContain('normalizeFirmName')
    expect(nameRouteSrc).toMatch(/if \(!firmName\)[\s\S]{0,200}status: 400/)
  })

  it('/api/firm/name scopes the write to the caller’s own firm', () => {
    // No firmId parameter, deliberately: accepting one would let any signed-in
    // user rename any firm.
    expect(nameRouteSrc).toContain("user.app_metadata?.firm_id")
    expect(nameRouteSrc).not.toMatch(/body\.firm_id|body\.firmId/)
  })

  it('/api/firm/name refuses a non-admin', () => {
    expect(nameRouteSrc).toMatch(/role !== 'admin'[\s\S]{0,200}403/)
  })
})

describe('firm_name stays question one of the intake', () => {
  // Katy, 2026-08-25 11:04: "I dont want the name part to move, I want the
  // whole intake there." Capturing it at onboarding did not move it.
  it('is still a question, still required', () => {
    const question = getQuestion('firm_name')
    expect(question).toBeTruthy()
    expect(question!.required).toBe(true)
    expect(question!.type).toBe('text')
  })

  it('🔴 the seed is a REAL saved answer, not a display-only prop', () => {
    // The bug this closes, reported from a browser 2026-09-02: "it wouldnt let
    // me send intake if i didnt re edit the firm name even if i had already
    // written it before intake".
    //
    // The name was passed as `firmNamePrefill`, so it was never in `answers`,
    // so missingRequired() reported firm_name missing and Send refused until
    // the firm retyped what it had already given at the gate.
    const pageSrc = readFileSync(join(ROOT, 'app/intake/page.tsx'), 'utf8')
    const clientSrc = readFileSync(
      join(ROOT, 'app/intake/_components/intake-client.tsx'),
      'utf8',
    )

    expect(pageSrc).toContain('seedAutoAnswers')
    // The prop is gone entirely — no second path to the same value.
    expect(pageSrc).not.toContain('firmNamePrefill')
    expect(clientSrc).not.toContain('firmNamePrefill')

    // Editable means it is NOT special-cased as readOnly/disabled anywhere.
    expect(clientSrc).not.toMatch(/firm_name[\s\S]{0,120}(readOnly|disabled)/)
  })

  it('a saved answer wins over the seed', () => {
    // Otherwise an edit made in the intake would be silently reverted to
    // firms.name on the next page load.
    const sessionSrc = readFileSync(join(ROOT, 'lib/intake/session.ts'), 'utf8')
    expect(sessionSrc).toMatch(
      /answers\['firm_name'\] !== undefined\)\s*return answers/,
    )
  })

  it('🔴 the seed does not make a new session look visited', () => {
    // Both halves of Max's instruction have to hold at once: the name counts as
    // a real answer AND a session carrying only the auto-filled name still
    // reads as untouched, so the walkthrough renders.
    const clientSrc = readFileSync(
      join(ROOT, 'app/intake/_components/intake-client.tsx'),
      'utf8',
    )
    const sessionSrc = readFileSync(join(ROOT, 'lib/intake/session.ts'), 'utf8')

    // untouched discounts auto-seeded keys rather than requiring zero answers.
    expect(clientSrc).toContain('AUTO_SEEDED_KEYS.has(key)')
    expect(clientSrc).not.toContain('Object.keys(initialAnswers).length === 0')

    // The other half of the pairing: the seed must NOT touch the session, or
    // resumeAt goes non-null and untouched fails for a different reason.
    expect(sessionSrc).not.toMatch(/seedAutoAnswers[\s\S]{0,900}touchSession/)
  })

  it('AUTO_SEEDED_KEYS lives in a client-safe module', () => {
    // It is imported by a 'use client' component. lib/intake/session.ts
    // statically imports the SERVICE-ROLE client, so importing the constant
    // from there would pull that into the browser bundle.
    const typesSrc = readFileSync(join(ROOT, 'lib/intake/types.ts'), 'utf8')
    expect(typesSrc).toContain('AUTO_SEEDED_KEYS')
    expect(typesSrc).not.toContain('@/lib/supabase/admin')
  })

  it('an edit there still writes through to firms.name', () => {
    const answerSrc = readFileSync(join(ROOT, 'app/api/intake/answer/route.ts'), 'utf8')
    expect(answerSrc).toContain('promoteFirmName')
    expect(answerSrc).toContain("questionKey === 'firm_name'")
  })
})

describe('deliver-policy refuses a blank name', () => {
  const src = readFileSync(join(ROOT, 'scripts/deliver-policy.mjs'), 'utf8')

  it('does not fall back to a display string before the confirmation', () => {
    // The old code was `firm?.name ?? '(unknown firm)'`, and `??` does not fire
    // on '', so the prompt read `Type the firm name to confirm (""):` and a
    // bare Enter passed it.
    //
    // Asserted against findSession's RETURN rather than the whole file: the old
    // expression is quoted verbatim in a comment there explaining why it went,
    // and that comment is worth keeping.
    const findSession = src.slice(src.indexOf('async function findSession'))
    const returned = findSession.slice(0, findSession.indexOf('async function renderTo'))
    expect(returned).toContain('normalizeFirmName(firm?.name)')
    expect(returned).not.toMatch(/return \{[\s\S]*firmName: firm\?\.name \?\?/)
  })

  it('dies rather than prompting for a name that does not exist', () => {
    expect(src).toMatch(/if \(!firmName\)[\s\S]{0,400}die\(/)
  })
})

describe('the webhook does not fabricate a name', () => {
  it('inserts an empty name, not a placeholder', () => {
    const src = readFileSync(join(ROOT, 'app/api/webhooks/stripe/route.ts'), 'utf8')
    expect(src).not.toContain("name: 'My Firm'")
    expect(src).toContain("name: ''")
  })
})
