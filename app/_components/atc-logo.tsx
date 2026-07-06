// Athena brand lockup: the real "atc" monogram vector
// (landing page design resources/atc-athena-logo.svg) + the "athena." wordmark in
// Stack Sans Headline (thinnest weight).
//
// The source SVG's paths default to a black fill/stroke (invisible on the black
// hero), so the mark is inlined here with fill/stroke driven by currentColor —
// exact geometry, but recolored by the parent text color.

function AtcMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1080 1080"
      className={className}
      fill="currentColor"
      role="img"
      aria-label="Athena logo mark"
      style={{ fillRule: "evenodd", clipRule: "evenodd" }}
    >
      <g transform="matrix(3.31803,0,0,3.31803,-273.449,-73.9698)">
        <g transform="matrix(0.381791,0,0,0.381791,241.925,-74.4435)">
          <path
            d="M273.366,543.049L273.366,520.182L250.245,520.182L250.245,448.785L273.366,448.785L273.366,425.664L345.017,425.664L345.017,448.785L368.392,448.785L368.392,473.939L342.476,473.939L342.476,451.072L275.907,451.072L275.907,517.641L342.476,517.641L342.476,494.52L368.392,494.52L368.392,520.182L345.017,520.182L345.017,543.049L273.366,543.049Z"
            style={{ stroke: "currentColor", strokeWidth: "6.32px" }}
          />
        </g>
        <g transform="matrix(1,0,0,1,202.537,248.603)">
          <path
            d="M60.979,3.049L60.979,-19.564L38.112,-19.564L38.112,-87.404L15.245,-87.404L15.245,-115.861L38.112,-115.861L38.112,-160.833L65.807,-160.833L65.807,-115.861L134.917,-115.861L134.917,-87.404L65.807,-87.404L65.807,-25.408L129.835,-25.408L129.835,-48.275L157.784,-48.275L157.784,-19.564L134.917,-19.564L134.917,3.049L60.979,3.049Z"
            style={{ stroke: "currentColor", strokeWidth: "5.63px" }}
          />
        </g>
        <g transform="matrix(1,0,0,1,-142.498,-272.793)">
          <path
            d="M273.112,543.049L273.112,520.436L250.245,520.436L250.245,447.007L273.112,447.007L273.112,424.139L346.795,424.139L346.795,447.007L369.917,447.007L369.917,514.592L392.784,514.592L392.784,543.049L364.835,543.049L364.835,520.436L346.795,520.436L346.795,543.049L273.112,543.049ZM278.194,514.592L341.714,514.592L341.714,452.596L278.194,452.596L278.194,514.592Z"
            style={{ stroke: "currentColor", strokeWidth: "5.63px" }}
          />
        </g>
      </g>
    </svg>
  );
}

export function AtcLogo({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  // The whole lockup is sized by font-size so it scales as one unit: the
  // wordmark inherits it and the mark is em-based. Defaults to 1.5rem (≈ the
  // old text-2xl) so existing callers render unchanged; pass a fluid font-size
  // (e.g. clamp(…vw…)) via `style` to make it scale with the viewport.
  return (
    <div
      className={`flex items-center gap-[0.42em] text-white ${className}`}
      style={{ fontSize: "1.5rem", ...style }}
    >
      <AtcMark className="h-[1.35em] w-[1.35em]" />
      <span className="font-headline font-extralight lowercase tracking-tight leading-none">
        athena.
      </span>
    </div>
  );
}
