import type { Metadata } from "next";
import { Bagel_Fat_One, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";

import { THEME_STORAGE_KEY } from "@/lib/theme";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
});

const bagelFatOne = Bagel_Fat_One({
  variable: "--font-brand",
  weight: "400",
  subsets: ["latin"],
});

// Reserved for strict tabular layouts that need a true monospace; UI text uses --font-sans.
const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Emelbros",
  description: "A private family web platform.",
};

// Resolves the theme before first paint — a stored manual override if one
// exists, otherwise the OS `prefers-color-scheme` — so there's no flash and
// the toggle wins over the system preference in both directions (#18).
const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var stored=localStorage.getItem(k);var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${nunito.variable} ${bagelFatOne.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
