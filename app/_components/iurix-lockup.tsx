import { AtcMark } from "./atc-logo";

// The marketing lockup. Per 02-brand.md there is no wordmark asset and there
// will not be one during this engagement, so the lockup is TYPE-SET and that is
// the permanent design, not a placeholder: the monogram, "IURIX" in Stack Sans
// Headline, and the descriptor "Accreditation" beneath it in Host Grotesk.
//
// The descriptor is dropped at nav size on small screens, where it would set
// below ~8px. It stays on the footer and hero uses.
//
// Colour is inherited (the mark is currentColor-driven), so this works on the
// marble ground and on the deep-teal closing section without a second variant.
export function IurixLockup({
  className = "",
  style,
  showDescriptor = true,
}: {
  className?: string;
  style?: React.CSSProperties;
  showDescriptor?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-[0.5em] text-ink ${className}`}
      style={{ fontSize: "1.25rem", ...style }}
    >
      <AtcMark className="h-[1.6em] w-[1.6em] shrink-0" />
      <span className="leading-none">
        <span className="font-headline block font-extralight uppercase tracking-[0.06em]">
          Iurix
        </span>
        {showDescriptor && (
          <span className="mt-[0.25em] hidden text-[0.42em] font-medium uppercase tracking-[0.26em] text-ink-mute sm:block">
            Accreditation
          </span>
        )}
      </span>
    </div>
  );
}
