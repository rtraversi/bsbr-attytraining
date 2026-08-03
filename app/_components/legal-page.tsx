import { SiteHeader } from "./site-header";
import { Footer } from "./footer";

// The shared long-form document template — one container, five instances
// (/privacy, /terms, /dpa, and later /ai-policy and /accessibility).
//
// 01-brief.md asks for the CONTAINER to be designed, not the content: the
// drafts are under attorney review, so the words change but the shape does not.
// Measure is held at ~68 characters, which is the comfortable band for prose
// read carefully by people who read carefully.

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-marble text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-[1140px] px-6 py-16 md:px-8">
        <div className="mx-auto max-w-[68ch]">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep">
            Iurix
          </p>
          <h1 className="font-gyrotrope text-[clamp(30px,4vw,44px)] font-normal leading-[1.1] tracking-[-0.015em]">
            {title}
          </h1>
          <p className="mt-3 border-b border-mint-line pb-8 text-[14px] text-ink-mute">
            {updated}
          </p>

          <div className="mt-10 space-y-9 text-[16px] leading-[1.7] text-ink-soft">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// A numbered top-level section. Headings go to two levels; deeper nesting is a
// sign the document wants splitting, not a third heading size.
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-gyrotrope mb-3 text-[21px] font-normal leading-[1.3] text-ink">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalSubheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-[15px] font-semibold text-ink">{children}</h3>
  );
}

// The plain-language "short version" block. The AI Use Policy opens with one and
// it is the most-quoted part of the document, so it is styled to look
// deliberate rather than like an afterthought.
export function LegalCallout({
  label = "In short",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="border-l-2 border-gold bg-marble-deep px-6 py-5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep">
        {label}
      </p>
      <div className="space-y-2 text-[16px] leading-[1.65] text-ink">{children}</div>
    </aside>
  );
}

// All-caps conspicuousness blocks (warranty, liability, disclaimer). Capitals
// are a legal convention, not a design choice — the job here is to keep them
// legible: wider tracking, shorter measure, and a tinted ground so the reader
// can see where the block starts and ends.
export function LegalDisclaimer({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-steel bg-white px-6 py-5">
      <div className="space-y-3 text-[13.5px] uppercase leading-[1.7] tracking-[0.02em] text-ink-soft">
        {children}
      </div>
    </div>
  );
}

// Tables must scroll rather than overflow on mobile — the wrapper is the whole
// point of this component.
export function LegalTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
      <table className="w-full min-w-[420px] border-collapse text-[15px]">
        {children}
      </table>
    </div>
  );
}
