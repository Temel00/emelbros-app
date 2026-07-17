import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Geist_Mono, Nunito } from "next/font/google";
import Script from "next/script";
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

// Matches the pink bright's per-theme value in globals.css (#18) so the
// installed PWA's browser chrome/status bar tints with the active theme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ef486f" },
    { media: "(prefers-color-scheme: dark)", color: "#ff6c8f" },
  ],
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
      <body className="min-h-full flex flex-col">
        {/* `beforeInteractive` has Next.js inject this straight into the
            document and run it ahead of hydration — a plain <script> tag in
            JSX is only ever executed by the browser's HTML parser on the
            initial load, never by React itself, so it can't be relied on
            the same way (React 19 now warns on it directly). */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {children}
      </body>
    </html>
  );
}
