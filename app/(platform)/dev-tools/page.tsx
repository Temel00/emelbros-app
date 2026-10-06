// PROTOTYPE (#196): Dev Tools gallery home — four style variants via ?variant=A..D.
// Throwaway; the real home is specced by #197. Read-only, dummy data.
import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { PrototypeSwitcher } from "./_prototype/switcher";
import { VariantA, VariantB, VariantC, VariantD } from "./_prototype/variants";

export default async function DevToolsPage({
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
      {variant === "A" && <VariantA />}
      {variant === "B" && <VariantB />}
      {variant === "C" && <VariantC />}
      {variant === "D" && <VariantD />}
      <PrototypeSwitcher />
    </>
  );
}
