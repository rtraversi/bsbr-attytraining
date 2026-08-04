// The marketing lockup: the Iurix mark beside the Iurix wordmark.
//
// ⚠️ This supersedes 02-brand.md's "one hard constraint", which stated that no
// wordmark asset existed or would exist during the engagement and that the
// lockup must therefore be type-set. Rob supplied one on 2026-08-04, so the
// type-set "IURIX / ACCREDITATION" it used to render is gone. Treat the brand
// doc's wordmark section as out of date, not as a rule being broken.
//
// Both files are trimmed to their alpha bounding boxes. The originals carried
// huge transparent margins — the wordmark's artwork was 392×148 inside a 500×500
// canvas — which made every render far smaller than its CSS box implied. Re-trim
// with scratchpad/croprect.js if either asset is replaced.
//
//   mark      326×326  (1:1)
//   wordmark  400×156  (2.56:1)
//
// Plain <img>, not next/image: no image-optimisation config exists for the
// OpenNext/Cloudflare target, and plain <img> is this codebase's convention.
//
// ⚠️ LIGHT GROUNDS ONLY. The wordmark is dark teal and rose gold baked into
// pixels; there is no light-on-dark variant. It is used on the marble header and
// footer only. Putting this lockup on the closing panel or any dark ground needs
// a second asset — do not try to solve it with a CSS filter.
export function IurixLockup({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  // Sized as one unit off font-size so a single value scales the whole lockup.
  // The mark is square at 2em; the wordmark is set to 1.55em tall, which lands
  // its "IURIX" cap-height close to the mark's optical centre band.
  return (
    <span
      className={`inline-flex items-center gap-[0.5em] ${className}`}
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
      <img
        src="/brand/iurix-wordmark.png"
        alt="Iurix Accreditation"
        width={400}
        height={156}
        className="h-[1.55em] w-auto shrink-0 select-none"
        draggable={false}
      />
    </span>
  );
}
