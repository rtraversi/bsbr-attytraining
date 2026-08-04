import { Footer } from '@/app/_components/footer'

/**
 * Chrome for the two verification surfaces.
 *
 * Deliberately NOT LegalPage, despite looking similar: that component is
 * documentation chrome (numbered clauses, long measure, a dateline) and this is
 * a result page. Sharing it would couple a security surface to whatever the
 * legal documents need next. It follows the same visual system by hand — black
 * ground, font-headline, --brand-primary — so the two agree without being
 * welded together.
 */
export function VerifyShell({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <>
      <main className="min-h-screen bg-black px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-[42rem]">
          <p className="font-headline text-[11px] uppercase tracking-[0.22em] text-white/35">
            IURIX
          </p>

          <h1 className="font-headline mt-5 text-3xl font-extralight tracking-tight text-white md:text-[2.75rem] md:leading-[1.1]">
            {title}
          </h1>

          <p className="mt-5 max-w-[34rem] text-[15px] leading-[1.7] text-white/45">{intro}</p>

          <hr className="my-10 border-white/10 md:my-12" />

          {children}
        </div>
      </main>
      <Footer />
    </>
  )
}
