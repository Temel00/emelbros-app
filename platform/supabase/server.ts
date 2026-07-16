import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Typed Supabase client for Server Components, Server Actions, and Route
 * Handlers (ADR-0009). Reads/writes the session through Next's cookie jar so
 * RLS sees the signed-in member's `auth.uid()` (ADR-0011).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore when session refresh is handled by middleware instead.
          }
        },
      },
    },
  );
}
