import type { Metadata } from "next";
import { Playfair_Display, Space_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "HH Goa 2026 - Identity Generator",
  description: "Generate your official Hacker House Goa 2026 PFP Frame or Builder ID Card with interactive controls.",
  authors: [{ name: "Hacker House Goa Team" }],
  keywords: ["Hacker House Goa", "Identity Generator", "Solana", "AI", "Crypto", "PFP Frame", "Builder ID"],
  openGraph: {
    title: "HH Goa 2026 - Identity Generator",
    description: "Generate your official Hacker House Goa 2026 PFP Frame or Builder ID Card with interactive controls.",
    siteName: "Hacker House Goa 2026",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@247pmstudio",
    title: "HH Goa 2026 - Identity Generator",
    description: "Generate your official Hacker House Goa 2026 PFP Frame or Builder ID Card with interactive controls.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className={`${playfair.variable} ${spaceMono.variable} min-h-screen flex flex-col antialiased`}>
        {children}
      </body>
    </html>
  );
}
