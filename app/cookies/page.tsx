import { Footer } from '@/app/_components/footer'

export const metadata = {
  title: 'Cookie Policy — IURIX',
}

/**
 * STRUCTURE ONLY — THIS PAGE HAS NO COPY AND MUST NOT SHIP.
 *
 * Deliberately not linked from any nav or footer. The route exists so the copy
 * has somewhere to land; every section below is an empty placeholder.
 *
 * Ownership: Max drafts the copy, Katy or Rob approves it before it ships.
 * Nothing here is legal language and nothing here is a draft — the markers are
 * loud on purpose so this cannot be mistaken for finished text or deployed by
 * accident. Match app/privacy/page.tsx once real copy lands.
 */
export default function CookiesPage() {
  return (
    <>
      <main className="min-h-screen bg-zinc-950 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">IURIX</p>
          <h1 className="text-3xl text-white mb-2" style={{ fontFamily: 'var(--font-gyrotrope)' }}>
            Cookie Policy
          </h1>
          <p className="text-sm text-zinc-500 mb-12">
            🚧 UNWRITTEN PAGE — NOT FOR DEPLOY 🚧
          </p>

          <div className="space-y-10 text-sm text-zinc-400 leading-relaxed">
            <Section title="1. What Cookies Are" />
            <Section title="2. Cookies We Set" />
            <Section title="3. Third-Party Cookies" />
            <Section title="4. How Long Cookies Last" />
            <Section title="5. Managing and Disabling Cookies" />
            <Section title="6. Changes to This Policy" />
            <Section title="7. Contact" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-200 mb-3">{title}</h2>
      <div className="space-y-2">
        <p className="rounded border border-dashed border-red-500/60 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-400">
          ▮▮▮ NO COPY WRITTEN ▮▮▮ Max to draft · Katy/Rob to approve · do not deploy
        </p>
      </div>
    </div>
  )
}
