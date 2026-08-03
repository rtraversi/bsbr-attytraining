// Numbered section heading, shared by every homepage section. The numbering is
// deliberate: it makes the page read as a structured instrument rather than a
// stack of marketing blocks, which is the register 01-brief.md asks for.
export function SectionHead({
  num,
  heading,
  intro,
  tone = "light",
}: {
  num: string;
  heading: string;
  intro?: string;
  tone?: "light" | "dark";
}) {
  const headingColor = tone === "dark" ? "text-marble" : "text-ink";
  const introColor = tone === "dark" ? "text-mint" : "text-ink-soft";
  const numColor = tone === "dark" ? "text-gold-pale" : "text-gold-deep";

  return (
    <div className="mb-13 grid grid-cols-[44px_1fr] items-baseline gap-3 md:grid-cols-[64px_1fr]">
      <span className={`pt-[0.55em] text-[12px] font-medium tracking-[0.16em] ${numColor}`}>
        {num}
      </span>
      <h2
        className={`font-gyrotrope text-[clamp(30px,4vw,46px)] font-normal leading-[1.1] tracking-[-0.015em] ${headingColor}`}
      >
        {heading}
      </h2>
      {intro && (
        <p className={`col-start-2 mt-3.5 max-w-[620px] text-[18px] ${introColor}`}>
          {intro}
        </p>
      )}
    </div>
  );
}
