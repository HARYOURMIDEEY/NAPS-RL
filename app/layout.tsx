import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { getAppUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "NAPS FUTMinna Physics E-Learning Platform",
    template: "%s · NAPS E-Learning",
  },
  description:
    "Study materials, quizzes, timed examinations and an AI Physics tutor for FUTMinna Physics students.",
  applicationName: "NAPS E-Learning",
  openGraph: {
    title: "NAPS FUTMinna Physics E-Learning Platform",
    description:
      "Study materials, quizzes, timed examinations and an AI Physics tutor for FUTMinna Physics students.",
    type: "website",
    siteName: "NAPS E-Learning",
  },
};

export const viewport: Viewport = {
  themeColor: "#5C2D82",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
