import ScrabbleHero from "@/app/_components/scrabble-hero";

export default function HomePage() {
  return (
    <main style={{ background: "var(--brand-bg)" }}>
      {/* Section 1 — Scrabble tile hero */}
      <ScrabbleHero />

      {/* Sections 2–4 — placeholders, built after section 1 is approved */}
      <div
        id="how-it-works"
        className="h-screen flex items-center justify-center font-dm-sans text-sm text-[#1A1A1A]/25 tracking-widest uppercase"
        style={{ background: "var(--brand-bg)" }}
      >
        Section 2 — Feature showcase (coming soon)
      </div>
    </main>
  );
}
