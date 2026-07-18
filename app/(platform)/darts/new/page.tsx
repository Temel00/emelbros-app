import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

/**
 * Placeholder for New game setup (darts.md §3, §10) — the real form and
 * live-scoring flow land in #31. This exists so the darts home's "New game"
 * shortcut (#32) has somewhere to go rather than 404ing.
 */
export default async function NewDartsGamePage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          New game setup and live scoring are coming soon (#31).
        </p>
      </main>
    </>
  );
}
