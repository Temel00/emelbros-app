import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseAnonKey, supabaseUrl } from "@/platform/supabase/env";

import type { Database } from "@/types/database";

/**
 * Shared plumbing for a module's `*.rls.test.ts` suite (#13): seed fake
 * family members via a service-role client, then assert visibility through
 * per-member clients authenticated the same way the app is — the real
 * PostgREST + Supabase Auth path, not a mocked one. Requires the local
 * Supabase stack (`supabase start`) and `SUPABASE_SERVICE_ROLE_KEY`.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for RLS integration tests — see .env.example",
    );
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

/**
 * Creates a confirmed fake member and returns a `supabase-js` client
 * authenticated as them, via a magic-link token verified through the normal
 * `auth.verifyOtp` flow — sidestepping Google sign-in (ADR-0011) without
 * bypassing RLS the way a service-role client would.
 */
export async function createMemberClient(
  service: SupabaseClient<Database>,
  email: string,
): Promise<{ id: string; client: SupabaseClient<Database> }> {
  const { data: created, error: createError } =
    await service.auth.admin.createUser({ email, email_confirm: true });
  if (createError) throw createError;

  const { data: link, error: linkError } =
    await service.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw linkError;

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey);

  const { error: verifyError } = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) throw verifyError;

  return { id: created.user.id, client };
}
