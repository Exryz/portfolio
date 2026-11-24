import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-text",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Exeryze — AI/ML Engineer Portfolio",
  description:
    "Interactive AI/ML engineering portfolio for Exeryze showcasing grounded RAG + MCP agents (helpdesk-agent) and verified Document AI pipelines (docextract).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
      data-mode="dark"
      data-ground="painting"
      data-radius="soft"
    >
      <body className="min-h-screen bg-[#090a0d] text-[#f3f1ea] antialiased selection:bg-[#7ab8d6]/25 selection:text-[#f3f1ea]">
        {children}
      </body>
    </html>
  );
}
