import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeInitScript, ThemeStyles } from "@/components/layout/ThemeScript";
import { lightColors, darkColors } from "@/lib/design-tokens";

// Self-hosted, Latin-subset, display: swap (Section 15).
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
  variable: "--font-inter-tight",
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["500"],
  variable: "--font-jetbrains-mono",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cleanplate.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "CLEANPLATE — Remove watermarks, backgrounds, and upscale to 4K",
    template: "%s · CLEANPLATE",
  },
  description:
    "Three AI tools for images — erase watermarks, cut out backgrounds, upscale to 4K. No signup. Results in seconds.",
  applicationName: "CLEANPLATE",
  openGraph: {
    title: "CLEANPLATE",
    description:
      "Three AI tools for images — erase watermarks, cut out backgrounds, upscale to 4K.",
    url: APP_URL,
    siteName: "CLEANPLATE",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: lightColors.paper },
    { media: "(prefers-color-scheme: dark)", color: darkColors.paper },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${interTight.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        {/* Token-driven theme variables + no-FOUC init, before paint. */}
        <ThemeStyles />
        <ThemeInitScript />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
