import type { NextConfig } from "next";

// Bag photos are served from the public `coffee-bag-photos` Storage bucket
// through the next/image optimizer (map #229).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl) : null;

const nextConfig: NextConfig = {
  images: {
    qualities: [60, 75],
    remotePatterns: supabaseHost
      ? [
          {
            protocol: supabaseHost.protocol === "http:" ? "http" : "https",
            hostname: supabaseHost.hostname,
            port: supabaseHost.port,
            pathname: "/storage/v1/object/public/coffee-bag-photos/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
