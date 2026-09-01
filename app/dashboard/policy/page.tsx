import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeIntake } from '@/lib/intake/session'
import { policyForFirm, type PolicyForFirm } from '@/lib/policy/for-firm'
import type { AssembledSection, ActionItem } from '@/lib/policy/types'

export const metadata = {
  title: "Your firm's AI policy — IURIX",
}

/* ── Shared tokens — the same values app/dashboard/settings/page.tsx uses ──── */
const CARD = 'rounded-3xl bg-white p-6 xl:p-8 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING = 'font-headline font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]'
const SECTION_HEADING = `${HEADING} mb-4 text-2xl md:text-3xl`
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'
const BTN =
  'inline-flex items-center gap-2 rounded-xl bg-[var(--brand-emphasis)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90'
const BTN_SECONDARY =
  'inline-flex items-center gap-2 rounded-xl border border-[#E5EEF5] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[#EAF8FF] dark:border-[#1F2429] dark:hover:bg-[var(--brand-emphasis)]/10'

/**
 * The firm's assembled AI policy, on screen and as a download.
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

  const blocks = found.result.policy.sections.flatMap((s) => s.blocks)
  const todoCount = blocks.filter((b) => b.status === 'todo').length

  return (
    <Shell>
      <section className={`${CARD} mb-10`}>
        <h2 className={`${HEADING} text-2xl`}>{found.firmName}</h2>
        <p className={`mt-2 text-[14.5px] leading-relaxed ${MUTED}`}>
          Assembled from the answers you gave.{' '}
          {found.result.policy.sections.length} sections, {blocks.length} clauses
          {todoCount > 0 ? `, ${todoCount} still being written` : ''}. Change any answer and this
          document is rebuilt from the new ones.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Plain links, not fetch + blob. The route sets Content-Disposition,
              so the browser saves the file itself and this page needs no client
              component to offer a download. */}
          <a className={BTN} href="/api/policy?format=docx" download>
            Download the policy (.docx)
          </a>
          <a
            className={BTN_SECONDARY}
            href="/api/policy?format=docx&document=action-items"
            download
          >
            Download the action items (.docx)
          </a>
          <Link className={BTN_SECONDARY} href="/intake">
            Change your answers
          </Link>
        </div>

        {todoCount > 0 && (
          // 🔴 SAID BEFORE THEY SCROLL, NOT DISCOVERED HALFWAY DOWN. An
          // unfinished clause is visible wherever it falls (see PolicyBlock),
          // but a firm reading a long document should know the count up front
          // rather than meeting the first one as a surprise.
          <p className="mt-5 rounded-xl bg-[#FFF4F3] px-4 py-3 text-[13px] leading-relaxed text-[#8C1D18] dark:bg-[#2A1614] dark:text-[#F2B8B5]">
            {todoCount} {todoCount === 1 ? 'clause is' : 'clauses are'} still being drafted and are
            marked below. This is not a finished policy yet — do not adopt it until they are
            resolved.
          </p>
        )}
      </section>

      <article className={`${CARD} mb-10`}>
        <h2 className={SECTION_HEADING}>
          Artificial Intelligence Policy for {found.firmName}
        </h2>
        {found.result.policy.sections.map((section) => (
          <PolicySection key={section.key} section={section} />
        ))}
      </article>

      {/* 🔴 A SEPARATE DOCUMENT, NOT AN APPENDIX — D2. A firm's adopted policy
          must not contain a list of what the firm has not done yet. Its own
          card, its own heading, its own download, and it says so in words. */}
      <section className={CARD}>
        <h2 className={SECTION_HEADING}>Action items</h2>
        <p className={`mb-6 text-[14.5px] leading-relaxed ${MUTED}`}>
          Things to confirm or decide. These accompany your policy and are deliberately not part of
          it — your adopted policy should not contain a list of what you have not done yet.
        </p>
        {found.result.actionItems.length === 0 ? (
          <p className="text-[14.5px]">Nothing outstanding.</p>
        ) : (
          <ul className="space-y-4">
            {found.result.actionItems.map((item: ActionItem) => (
              <li key={item.id} className="text-[14.5px] leading-relaxed">
                {item.status === 'todo' ? <TodoText text={item.text} /> : item.text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  )
}

/**
 * The three reasons there is no policy to show, each said as the firm should
 * hear it.
 *
 * 🔴 `intake-submitted` IS A WAITING ROOM, NOT AN ERROR. It is the state most
 * firms will sit in, and until 2026-09-01 it did not exist here at all — a
 * submitted intake rendered the assembled draft, so a firm saw its own
 * unreviewed policy with every unwritten clause marked in red. What it says now
 * is the truth: the answers are in, an attorney has them, and the document
 * arrives when they have read it.
 *
 * There is deliberately no download and no preview on this screen. A firm that
 * could read the draft while waiting would be reading the thing the review
 * exists to catch.
 */
function Unavailable({ found }: { found: Extract<PolicyForFirm, { ok: false }> }) {
  if (found.reason === 'intake-submitted') {
    return (
      <Shell>
        <section className={CARD}>
          <p className="text-[15px] leading-relaxed">
            Your answers are with the attorney
            {found.submittedAt ? <> since {date(found.submittedAt)}</> : null}. Your policy will
            appear here once it has been reviewed, and we will email you when it does.
          </p>
          <p className={`mt-4 text-[14px] leading-relaxed ${MUTED}`}>
            You can still change any answer in the meantime. Doing so sends it back for review.
          </p>
          <Link href="/intake" className={`mt-5 ${BTN_SECONDARY}`}>
            Review your answers
          </Link>
        </section>
      </Shell>
    )
  }

  return (
    <Shell>
      <section className={CARD}>
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
        <Link href="/intake" className={`mt-5 ${BTN}`}>
          {found.reason === 'no-intake' ? 'Start your intake' : 'Go to your intake'}
        </Link>
      </section>
    </Shell>
  )
}

/**
 * 🔴 FORMATTED IN UTC, for the same reason app/intake/_components/intake-review.tsx
 * is — see that file's note. Formatting a midnight-UTC date in local time west
 * of Greenwich prints the day before, and the two screens must not disagree
 * about when a firm submitted.
 */
const date = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1000px] px-6 py-10 md:px-10 xl:py-14">
      <div className="mb-10">
        <h1 className={`${HEADING} text-4xl`}>Your AI policy</h1>
        <p className={`mt-2 text-base ${MUTED}`}>
          The written policy your firm adopts, and the training your staff take against it.
        </p>
      </div>
      {children}
    </main>
  )
}

/**
 * One section, on its SPINE number.
 *
 * Not renumbered to be contiguous. A firm that does no document review has no
 * §11, and closing the gap would make two firms cite different numbers for the
 * same rule — see the note on section numbering in lib/policy/assemble.ts.
 */
function PolicySection({ section }: { section: AssembledSection }) {
  return (
    <div className="mt-8 first:mt-0">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-emphasis)]">
        §{section.number} {section.title}
      </h3>
      <div className="space-y-4">
        {section.blocks.map((block) =>
          block.status === 'todo' ? (
            <TodoText key={block.id} text={block.text} />
          ) : (
            // whitespace-pre-line: Katy double-spaces after full stops and the
            // transcription preserved that deliberately. HTML would collapse it.
            <p key={block.id} className="whitespace-pre-line text-[15px] leading-relaxed">
              {block.text}
            </p>
          ),
        )}
      </div>
    </div>
  )
}

/**
 * An unwritten clause, kept in place and impossible to mistake for policy.
 *
 * 🔴 NEVER HIDDEN. A section that quietly dropped its unfinished clauses would
 * look finished, and a firm would adopt a document with holes in it believing
 * it was complete. That is the same rule assemble() follows when it emits a
 * loud marker instead of silence, and the Markdown and .docx renderers follow
 * with a blockquote and red bold text. Three renderers, one rule.
 */
function TodoText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-line rounded-xl border border-[#F2B8B5] bg-[#FFF4F3] px-4 py-3 text-[13.5px] font-semibold leading-relaxed text-[#8C1D18] dark:border-[#8C1D18] dark:bg-[#2A1614] dark:text-[#F2B8B5]">
      {text}
    </p>
  )
}
