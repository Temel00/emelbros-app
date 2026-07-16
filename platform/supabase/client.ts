import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/platform/supabase/env";

import type { Database } from "@/types/database";

/**
 * Typed Supabase client for Client Components (ADR-0009). Every module's
 * `queries.ts` (ADR-0003) that runs in the browser constructs its client
 * through this factory, never a hand-typed wrapper.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
