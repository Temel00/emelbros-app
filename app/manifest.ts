import type { MetadataRoute } from "next";

/**
 * PWA web app manifest (ADR-0015): standalone display and icons so the app
 * is "Add to Home Screen"-installable. No offline support — deliberately
 * out of scope, so there is no service worker alongside this file.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Emelbros",
    short_name: "Emelbros",
    description: "A private family web platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f7",
    theme_color: "#ef486f",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
