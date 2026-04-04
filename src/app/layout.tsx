import type { Metadata } from "next";
import { EB_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tribunal — Adversarial Due Process for AI Outputs",
  description:
    "Three adversarial AI agents examine claims through prosecution, defense, and judgment under your constitution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-tribunal antialiased">
        <svg className="grain-overlay" width="100%" height="100%">
          <filter id="grain-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.6"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-filter)" />
        </svg>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
