// Section heading, shared by every homepage section.
//
// Numbered in roman rather than arabic: it reads as a document's article
// numbering instead of a marketing site's "step 1 / step 2", which is the
// register 01-brief.md asks for.
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
  const numColor = tone === "dark" ? "text-gold-soft" : "text-gold";
  const ruleColor = tone === "dark" ? "bg-marble/25" : "bg-silver";

  return (
    <div className="mb-14">
      <div className="mb-6 flex items-center gap-4">
        <span
          className={`font-gyrotrope text-[14px] tracking-[0.18em] ${numColor}`}
        >
          {num}
        </span>
        <span className={`h-px flex-1 ${ruleColor}`} aria-hidden />
      </div>
      <h2
        className={`font-gyrotrope max-w-[900px] text-[clamp(30px,3.8vw,44px)] font-normal leading-[1.12] tracking-[-0.015em] ${headingColor}`}
      >
        {heading}
      </h2>
      {intro && (
        <p className={`mt-5 max-w-[680px] text-[18px] leading-[1.65] ${introColor}`}>
          {intro}
        </p>
      )}
    </div>
  );
}
