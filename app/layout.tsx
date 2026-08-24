import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

const gyrotrope = localFont({
  src: "../public/fonts/GyrotropeVF.ttf",
  variable: "--font-gyrotrope",
  display: "swap",
});

const hostGrotesk = localFont({
  src: [
    { path: "../public/fonts/HostGrotesk[wght].ttf", style: "normal" },
    { path: "../public/fonts/HostGrotesk-Italic[wght].ttf", style: "italic" },
  ],
  variable: "--font-host-grotesk",
  display: "swap",
});

// Cycling italic hero word. Brief §2: Bethany Elingston is the licensed primary
// (picked up from Font Book if present); Instrument Serif Italic is the shippable
// free fallback. Exposed as --font-instrument-serif; the CSS stack lists Bethany
// Elingston first so a future licensed webfont swaps in without code changes.
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// Stack Sans Headline — the real, self-hosted OFL-1.1 variable font (brief §2).
// Single variable file covers ExtraLight→Bold; the thinnest weight is used for the
// "athena." wordmark, Regular/Medium for headlines and body.
const stackSans = localFont({
  src: "../public/fonts/StackSansHeadline-VariableFont_wght.ttf",
  variable: "--font-headline",
  display: "swap",
  weight: "200 700",
});

// Kapakana — self-hosted variable font, Light→Regular only (fvar wght axis: 300–400).
const kapakana = localFont({
  src: "../public/fonts/Kapakana-VariableFont_wght.ttf",
  variable: "--font-kapakana",
  display: "swap",
  weight: "300 400",
});

// The site had no og: or twitter: tags at all, so sharing a link anywhere —
// Slack, iMessage, LinkedIn, a client email — rendered a bare URL with no title,
// no description and no image. For a product sold on looking like a credential,
// that is a first impression made by absence.
//
// metadataBase is what makes the relative image path below resolve to an
// absolute URL. Open Graph requires absolute URLs; without this Next emits the
// relative path and every scraper silently ignores it.
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://iurixaccreditation.com";

const TITLE = "IURIX — AI compliance certification for law firms";
const DESCRIPTION =
  "A written AI use policy for your firm, training and signed attestations for your staff, and a record you can produce. One annual fee per seat.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Deliberately a plain string, NOT { default, template }. Every page in this
  // app already writes its own full title ending in " — IURIX" (14 of them, from
  // /privacy to /dashboard/billing). A template applies to plain-string page
  // titles too, so adding one would render "Dashboard — IURIX — IURIX"
  // everywhere. Converting the pages to bare titles would mean editing the legal
  // pages, which are Max's drafting surface right now.
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "IURIX",
    title: TITLE,
    description: DESCRIPTION,
    // ⚠️ THIS FILE DOES NOT EXIST YET. Max is exporting it from Affinity; there
    // is no SVG rasteriser on this machine, so generating a placeholder would
    // mean shipping a broken-looking card rather than none at all.
    //
    // Wired so that dropping a 1200×630 PNG at public/og-image.png completes it
    // with no code change. Until then scrapers fall back to title + description,
    // which is already the whole improvement over a bare URL.
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IURIX — AI compliance certification for law firms",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    // summary_large_image, not summary: the 1200×630 asset is a wide card, and
    // `summary` would centre-crop it to a square and cut the wordmark off.
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // ThemeScript stamps `dark` onto <html> before paint to avoid a FOUC, so the
      // class attribute React rendered on the server never matches the client's.
      suppressHydrationWarning
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        gyrotrope.variable,
        hostGrotesk.variable,
        instrumentSerif.variable,
        stackSans.variable,
        kapakana.variable
      )}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
