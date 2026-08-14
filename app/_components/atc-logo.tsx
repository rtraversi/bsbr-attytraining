// IURIX brand lockup: the Iurix mark (scales) + an "IURIX" wordmark set in Stack
// Sans Headline (thinnest weight).
//
// The wordmark is TEXT, not an asset. A real wordmark asset does exist
// (public/brand/iurix-wordmark.png, used by the marketing lockup), but it is
// dark teal and rose gold baked into pixels with no light-on-dark variant, and
// these four auth screens set the lockup on a black header. So the wordmark
// stays type-set here and the auth pages read "IURIX", not "IURIX
// Accreditation" — unchanged from before, and deliberate.
//
// The mark itself is no longer a placeholder. It was the retired Athena
// monogram, inlined, until Rob supplied a white vector of the real scales mark
// (2026-08-14). Path data below is that file, verbatim, from
// public/brand/iurix-mark-white.svg — which is kept as the source of record but
// is NOT fetched at runtime; the geometry is inlined here exactly as the
// monogram was. Re-inline from that file if the mark is ever revised.
//
// The source SVG's paths are all fill:white. Each one is fill:currentColor here
// instead, so the mark is recolored by the parent's text color rather than
// being locked to white. AtcLogo wraps it in a text-white div, so it renders
// white today with no other change — and it drops onto a light ground later
// without touching this file.

// AtcMark is separate from AtcLogo so the mark can be used without the
// wordmark. Its only consumer today is AtcLogo, below. (A comment here used to
// claim the marketing lockup reused this geometry — it does not, and never did:
// iurix-lockup.tsx renders <img> tags for the mark and wordmark PNGs and
// imports nothing from this file.)
export function AtcMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 8334 8334"
      className={className}
      fill="currentColor"
      role="img"
      aria-label="IURIX logo mark"
      style={{ fillRule: "evenodd", clipRule: "evenodd" }}
    >
      <g transform="matrix(6.67521,0,0,6.67521,-2417.44,-2645.47)">
        <path d="M848.171,775.673L847.697,800C885.671,802.926 907.346,809.958 910.114,814.136C920.525,819.699 923.549,842.661 927.851,887.5C927.851,887.5 930.666,1127.88 928.092,1241.81C927.685,1259.81 924.559,1276.07 922.429,1295.91C921.165,1309.39 917.086,1322.49 910.194,1335.23C895.702,1355.79 861.129,1361.87 821.795,1364.51L821.231,1386.2L1168.75,1386.89L1168.17,1365.1C1151.45,1364.34 1133.32,1361.9 1112.5,1356.25C1102.53,1353.08 1092.71,1350.53 1080.26,1336.11C1073.39,1324.91 1070.55,1316.25 1070.19,1309.14C1056.71,1168.94 1060.54,1027.61 1062.5,880.602C1062.68,867.181 1066.79,843.569 1068.75,837.5C1071.7,828.362 1076.45,818.848 1084.14,812.5C1093.81,804.008 1100.82,803.307 1143.75,800L1143.75,775.807L848.171,775.673Z" style={{ fill: "currentColor" }}/>
        <path d="M1567.36,1440.05C1526.2,1515.34 1467.08,1570.54 1390.92,1606.7C1260.92,1657.26 1121.68,1647.71 1000,1605.75C833.56,1547.53 720.251,1459.37 625,1347.37C726.958,1432.19 900,1517.27 900,1517.27C1097.85,1600.01 1407.61,1617.88 1528.29,1375C1573.86,1304.28 1589.65,1197.79 1573.76,1050C1600.12,1128 1613.38,1206.83 1610.05,1286.57C1605.89,1351.25 1587.78,1397.21 1567.36,1440.05Z" style={{ fill: "currentColor" }}/>
        <path d="M1106.65,1075L1200,820.623L1141.2,1068.56L1430.77,1069.84L1283.18,745.252L1462.5,1069.89C1430.67,1147.11 1371.28,1185.49 1287.54,1192.39C1199.23,1190.31 1142.27,1146.77 1106.65,1075Z" style={{ fill: "currentColor" }}/>
        <g transform="matrix(1,0,0,1,-5.59303,1.39836)">
          <path d="M403.759,990.928C309.792,719.158 429.409,566.541 429.409,566.541C454.527,532.662 497.518,479.749 575,441.671C627.547,415.847 690.663,406.012 761.607,400C989.362,380.698 1261.65,565.597 1343.44,684.426C1186.4,569.772 994.86,446.964 733.649,500C506.157,560.641 390.517,751.25 403.759,990.928Z" style={{ fill: "currentColor" }}/>
        </g>
        <path d="M512.865,1075L675,775L545.378,1069.3L833.822,1071.05L774.314,824.76L870.292,1072.35C829.348,1152.81 767.073,1194.16 681.25,1192.33C647.297,1191.53 609.122,1179.43 578.5,1158.07C545.01,1134.71 515.782,1089.27 512.865,1075Z" style={{ fill: "currentColor" }}/>
        <path d="M962.5,687.5L962.5,643.75L985.453,600L1012.5,643.75L1012.5,687.5L962.5,687.5Z" style={{ fill: "currentColor" }}/>
        <path d="M722.746,807.894C723.067,769.066 723.26,731.417 747.001,700C754.644,703.488 761.868,707.121 775,708.709C938.578,716.236 1058.27,718.351 1200,708.968L1225,697.72C1232.99,691.468 1257.18,801.285 1252.63,806.023C1251.88,806.805 1247.57,808.024 1247.57,808.024C1238.63,789.8 1227.9,772.37 1207.91,759.06C1200.01,754.506 1187.43,751.705 1169.37,750.956L797.911,751.795C792.238,752.197 783.483,753.827 772.982,757.263C756.86,761.156 744.555,774.093 729.71,807.912L722.746,807.894Z" style={{ fill: "currentColor" }}/>
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
      <span className="font-headline font-extralight uppercase tracking-tight leading-none">
        IURIX
      </span>
    </div>
  );
}
