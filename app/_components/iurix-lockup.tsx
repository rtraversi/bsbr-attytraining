// The marketing lockup: the real Iurix mark (public/brand/iurix-mark.png —
// brushed-metal scales fused with a column, teal edge-lighting, rose-gold
// crescents) plus a type-set wordmark.
//
// Per 02-brand.md there is no wordmark ASSET and there will not be one during
// this engagement, so the type-setting below is the permanent design, not a
// placeholder waiting to be replaced.
//
// Plain <img>, not next/image: this project has no image-optimisation config for
// the OpenNext/Cloudflare target, and plain <img> is the established convention
// in this codebase. 326×326 transparent RGBA PNG, 78 KB.
//
// The source file was 500×500 with the artwork filling only 62.6% of it — about
// 19% dead transparent margin on every side. That margin was invisible but not
// harmless: every render was ~35% smaller than its CSS box implied, which is why
// doubling the header lockup still looked undersized. The asset is now trimmed to
// its alpha bounding box (96% fill), so a 2em box finally draws 2em of mark.
// Re-trim with scratchpad/croppng.js if the artwork is ever replaced.
//
// `tone` switches the wordmark for dark grounds. The mark itself needs no
// variant — it is transparent and reads on both.
export function IurixLockup({
  className = "",
  style,
  showDescriptor = true,
  tone = "light",
}: {
  className?: string;
  style?: React.CSSProperties;
  showDescriptor?: boolean;
  tone?: "light" | "dark";
}) {
  const word = tone === "dark" ? "text-marble" : "text-ink";
  const desc = tone === "dark" ? "text-silver" : "text-ink-mute";

  return (
    <span
      className={`inline-flex items-center gap-[0.55em] ${className}`}
      style={{ fontSize: "1.25rem", ...style }}
    >
      <img
        src="/brand/iurix-mark.png"
        alt=""
        width={326}
        height={326}
        className="h-[2em] w-[2em] shrink-0 select-none"
        draggable={false}
      />
      <span className="leading-none">
        <span
          className={`font-headline block font-extralight uppercase tracking-[0.14em] ${word}`}
        >
          Iurix
        </span>
        {showDescriptor && (
          <span
            className={`mt-[0.3em] hidden text-[0.4em] font-medium uppercase tracking-[0.3em] sm:block ${desc}`}
          >
            Accreditation
          </span>
        )}
      </span>
    </span>
  );
}
