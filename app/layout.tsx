import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
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

export const metadata: Metadata = {
  title: "AI Staff Compliance Training — Built Smart by Rob",
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
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        gyrotrope.variable,
        hostGrotesk.variable
      )}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
