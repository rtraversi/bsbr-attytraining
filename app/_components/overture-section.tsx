// Katy's three-line argument — the "competent, zealous advocate" sentence.
//
// This used to sit at the foot of the hero, set at 18px in a 820px column under
// a hairline rule, where it read as a caption to the section above it. It is the
// strongest sentence in the copy, and it is the page's first light moment after
// the dark hero, so it now holds a section on its own and is set in Gyrotrope at
// display size.
//
// Deliberately unnumbered and unheaded: it is the transition into the argument,
// not an article of it. Numbering it would push "The standard" to II and break
// the correspondence between the section numerals and the nav.
export function OvertureSection() {
  return (
    <section className="border-b border-silver py-[72px] md:py-[100px]">
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <p className="font-gyrotrope max-w-[900px] text-[clamp(23px,3vw,34px)] font-normal leading-[1.42] tracking-[-0.012em] text-ink">
          Clients know that a firm that doesn&apos;t use AI may be missing things, and
          wasting billable hours. They want their lawyers using it. But they also want
          to know their data is safe, and that their attorney is{" "}
          <em className="font-serif-italic not-italic text-teal-mid">
            a competent, zealous advocate — not a figurehead.
          </em>
        </p>
      </div>
    </section>
  );
}
