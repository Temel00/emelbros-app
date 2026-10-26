// PROTOTYPE (#223) — throwaway route. The real page replaces this.
import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { CoffeePrototype } from "@/modules/coffee/components/prototype/coffee-prototype";

export default async function CoffeePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) return null;
  const supabase = await createClient();
  const { variant = "A" } = await searchParams;

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <CoffeePrototype variant={variant} />
      </main>
    </>
  );
}
