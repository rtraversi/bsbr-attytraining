import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Fraunces, DM_Sans, Lora } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  axes: ["opsz"],
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  weight: ["700"],
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
        fraunces.variable,
        dmSans.variable,
        lora.variable
      )}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
