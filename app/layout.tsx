import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: false,
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Medical Guidelines Assistant",
  description: "Clinical assistant and mind-mapping system for Egyptian healthcare doctors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans bg-background text-foreground min-h-[100dvh]">
        {children}
      </body>
    </html>
  );
}
