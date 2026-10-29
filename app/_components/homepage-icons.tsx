// Line icons for the homepage: the four flip cards and the "What's included" list.
// Added 2026-10-29 (Rob). Drawn in teal-deep with one rose-gold detail each (the
// .icon-acc stroke), sized by the caller. Rob may swap in a sourced set later —
// keep the names, replace the paths.

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={`line-icon ${className ?? ""}`}>
      {children}
    </svg>
  );
}

/** A page with a folded corner and a seal — the written policy. */
export function PolicyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 6h17l9 9v27H12z" />
      <path d="M29 6v9h9" />
      <path d="M17 20h13M17 25h15M17 30h9" />
      <circle className="icon-acc" cx="32" cy="35" r="4.5" />
    </Svg>
  );
}

/** A screen with a play mark — online training. */
export function TrainingIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6" y="9" width="36" height="24" rx="2" />
      <path d="M18 40h12M24 33v7" />
      <path className="icon-acc" d="M21 16.5v9l7.5-4.5z" />
    </Svg>
  );
}

/** A pen over a signature — the signed attestation. */
export function AttestationIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 39h22" />
      <path className="icon-acc" d="M8 34c3-7 5-7 6-2.5s3 4 5-1 4-3 5 1.5" />
      <path d="M29 35l13-13-4.5-4.5-13 13L23 37z" />
      <path d="M34 21l4.5 4.5" />
    </Svg>
  );
}

/** An open eye — ongoing monitoring. */
export function MonitoringIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 24s7.5-12 20-12 20 12 20 12-7.5 12-20 12S4 24 4 24z" />
      <circle className="icon-acc" cx="24" cy="24" r="6" />
      <circle cx="24" cy="24" r="1.6" />
    </Svg>
  );
}

/** A certificate with a rosette — individual certifications. */
export function CertificateIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="8" width="31" height="23" rx="1.5" />
      <path d="M10 15h15M10 20h11" />
      <circle className="icon-acc" cx="35" cy="30" r="5.5" />
      <path className="icon-acc" d="M31.5 34.5 30 43l5-2.5 5 2.5-1.5-8.5" />
    </Svg>
  );
}

/** A badge with a check and ribbon tails — the yearly accredited token. */
export function TokenIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="24" cy="20" r="13" />
      <path className="icon-acc" d="M18.5 20.5l3.8 3.8 7.2-7.8" />
      <path d="M17 31l-3.5 11 5.5-2 3.5 3.5 1.2-9.5M31 31l3.5 11-5.5-2-3.5 3.5-1.2-9.5" />
    </Svg>
  );
}

/** A page with a padlock — the members-only decisions page. */
export function MembersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 6h20l8 8v28H10z" />
      <path d="M30 6v8h8" />
      <rect className="icon-acc" x="17" y="25" width="14" height="11" rx="1.5" />
      <path className="icon-acc" d="M20 25v-3.5a4 4 0 0 1 8 0V25" />
    </Svg>
  );
}
