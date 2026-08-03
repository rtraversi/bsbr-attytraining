import { Footer } from '@/app/_components/footer'

/**
 * Shared chrome for the four legal pages (/privacy, /terms, /dpa, /cookies).
 *
 * All four previously inlined an identical <main> wrapper and their own private
 * copy of a `Section` helper, so a typography change meant four edits that could
 * silently drift apart. The shell lives here now; the pages carry only their
 * own copy.
 *
 * Styling follows the current system rather than the retired one these pages
 * were built in. What changed and why:
 *
 *   bg-zinc-950  → bg-black       matches the shared Footer, which is pure
 *                                 black — the old near-black left a visible
 *                                 seam where the page met its own footer.
 *   font-gyrotrope → font-headline  Gyrotrope is the retired scrabble-era
 *                                 serif; Stack Sans Headline is what the
 *                                 Footer and the rest of the app use.
 *   text-teal-400 → --brand-primary  teal predates the rebrand entirely.
 *   zinc-400/500  → white/opacity   same scale the Footer uses, so the two
 *                                 halves of the page agree.
 *
 * Links use --brand-primary rather than --brand-emphasis: on black the lighter
 * blue carries far more contrast (~11:1 vs ~6.6:1), and these are long-form
 * documents people actually have to read.
 *
 * ⚠ No body copy belongs in this file. The pages own their words, including
 * every [ATTORNEY TO COMPLETE] marker.
 */
export function LegalPage({
  title,
  /** The dateline under the title. Rendered verbatim — it carries a marker. */
  updated,
  children,
}: {
  title: string
  updated: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <main className="min-h-screen bg-black px-6 py-20 md:px-10 md:py-28">
        {/* ~70 characters per line at this size — a readable measure for
            long-form legal text, where the old max-w-3xl at text-sm ran long. */}
        <div className="mx-auto max-w-[46rem]">
          <p className="font-headline text-[11px] uppercase tracking-[0.22em] text-white/35">
            IURIX
          </p>

          <h1 className="font-headline mt-5 text-3xl font-extralight tracking-tight text-white md:text-[2.75rem] md:leading-[1.1]">
            {title}
          </h1>

          <p className="mt-5 text-sm text-white/40">{updated}</p>

          <hr className="my-12 border-white/10 md:my-16" />

          <div className="space-y-12 md:space-y-14">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}

/** One numbered clause. Heading + its paragraphs. */
export function LegalSection({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <section>
      <h2 className="font-headline text-lg font-normal tracking-tight text-white md:text-xl">
        {title}
      </h2>
      {children ? (
        <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-white/55">{children}</div>
      ) : null}
    </section>
  )
}

/** Inline link inside legal copy. */
export function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-[var(--brand-primary)] underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[var(--brand-primary)]"
    >
      {children}
    </a>
  )
}

/**
 * The "no copy written" marker used by /cookies. Loud on purpose — it exists so
 * an unwritten page cannot be mistaken for a finished one or shipped by
 * accident. Do not soften it.
 */
export function LegalPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded border border-dashed border-red-500/60 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-400">
      {children}
    </p>
  )
}
