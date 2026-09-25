import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeIntake } from '@/lib/intake/session'
import { firmVisibleSections } from '@/lib/policy/docx'
import { policyForFirm, type PolicyForFirm } from '@/lib/policy/for-firm'
import { PolicyView } from './_components/policy-view'

export const metadata = {
  title: "Your firm's AI policy — IURIX",
}

/**
 * The firm's assembled AI policy, on screen and as a download.
 *
 * Layout is mockup B, "Tabs" (`policy-page-v1.html`, approved by Max
 * 2026-09-25): a hero card with the firm name, "Policy draft", three counts and
 * the two downloads; then a Policy | Action list tab switcher with Edit
 * answers beside it. The rendering lives in PolicyView (a client component, for
 * the tabs and the Edit answers call); this page only decides what to show.
 *
 * ── The gate is the intake's, unchanged ─────────────────────────────────────
 * authorizeIntake() — admin of a firm, claims read from app_metadata, which the
 * user cannot edit. The same gate the four /api/intake routes use, and the same
 * one /api/policy uses. The policy is assembled from the intake's answers, so
 * anyone who may not read the intake may not read this. Staff never see it: it
 * carries the firm's disclosures, its tool inventory and its vendor positions.
 *
 * ── Server-rendered, and it calls the assembler rather than its own API ─────
 * A server component fetching its own route would pay a round trip to re-do the
 * auth it has already done. Both this page and /api/policy call
 * policyForFirm(), which is the single place that decides what this firm's
 * policy IS — so what is on screen and what downloads cannot disagree.
 */
export default async function PolicyPage() {
  const auth = await authorizeIntake()
  // Not signed in → login. Signed in but not an admin of a firm → wherever they
  // belong. Same redirect split /intake makes.
  if (!auth.ok) redirect(auth.status === 401 ? '/login' : '/dashboard')

  const found = await policyForFirm(createAdminClient(), auth.actor.firmId)

  if (!found.ok) return <Unavailable found={found} />

  // 🔴 THE SAME CLAUSES AS THE DOWNLOAD. `todo` blocks (and the title clause,
  // see FIRM_HIDDEN_BLOCK_IDS) are dropped here exactly as the firm's .docx
  // drops them (firmVisibleSections, lib/policy/docx.ts), so the screen, the
  // counts in the hero and the file can never disagree.
  const sections = firmVisibleSections(found.result.policy)

  return (
    <Page>
      <PolicyView
        firmName={found.firmName}
        sections={sections.map((s) => ({
          key: s.key,
          title: s.title,
          blocks: s.blocks.map((b) => ({ id: b.id, text: b.text })),
        }))}
        // 🔴 D2: the action list is a SEPARATE document, not an appendix. It
        // gets its own tab and its own download, never a place in the policy.
        actionItems={found.result.actionItems.map((i) => ({
          id: i.id,
          text: i.text,
          todo: i.status === 'todo',
        }))}
      />
    </Page>
  )
}

/**
 * The two reasons there is no policy to show: no intake yet, or one open for
 * editing.
 *
 * The third, `intake-submitted`, was a waiting screen ("Your answers are with
 * the attorney...") and was removed 2026-09-24 with the approval gate. A
 * submitted intake IS the firm's policy now; see lib/policy/for-firm.ts.
 */
function Unavailable({ found }: { found: Extract<PolicyForFirm, { ok: false }> }) {
  return (
    <Page>
      <section className="rounded-[28px] bg-white p-6 shadow-[0_6px_28px_-14px_rgba(0,70,140,0.18)] md:p-10 dark:bg-[#0D0F12] dark:shadow-none">
        <p className="text-[15px] leading-relaxed">
          {found.reason === 'no-intake' ? (
            <>Your policy is assembled from your intake, and you have not completed one yet.</>
          ) : (
            <>
              Your intake is open for editing, so there are no settled answers to assemble a policy
              from yet. Send it again when you are done.
            </>
          )}
        </p>
        <Link
          href="/intake"
          className="mt-5 inline-flex items-center gap-2 rounded-[14px] bg-[var(--brand-emphasis)] px-[18px] py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          {found.reason === 'no-intake' ? 'Start your intake' : 'Go to your intake'}
        </Link>
      </section>
    </Page>
  )
}

/**
 * Page width matches the nav's measure: about 1240px at most, fluid below it,
 * with the shell's own 16px / 24px gutters. Replaces the old fixed 1000px Shell
 * and its "Your AI policy" heading (Max, 2026-09-25).
 */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 md:px-6 md:pt-8">{children}</main>
  )
}
