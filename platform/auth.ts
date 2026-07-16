import { createClient } from "@/platform/supabase/server";

export type CurrentMember = {
  id: string;
  email: string;
};

/**
 * The signed-in member, read from a cryptographically-verified JWT
 * (`getClaims()`, never `getSession()` — ADR-0011). `auth.uid()` in RLS
 * policies and this helper's `id` are the same identity. Returns `null`
 * when signed out; middleware is what actually protects routes.
 */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;

  return { id: data.claims.sub, email: data.claims.email as string };
}
