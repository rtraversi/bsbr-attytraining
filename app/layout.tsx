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

export const metadata: Metadata = {
  title: "IURIX",
  description:
    "Certify your staff on proper AI use under ABA Model Rule 5.3. One annual fee, instant certificates.",
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
