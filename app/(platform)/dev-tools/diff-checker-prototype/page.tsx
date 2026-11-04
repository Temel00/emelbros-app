// PROTOTYPE (#239): throwaway route. Delete with the prototype branch.
import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { VARIANTS, type VariantId } from "./diff-model";
import { Prototype } from "./prototype";

export default async function DiffCheckerPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;
  const supabase = await createClient();
  const v = VARIANTS.includes(variant as VariantId)
    ? (variant as VariantId)
    : "A";

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="flex w-full flex-1 flex-col pb-16">
        <Prototype variant={v} />
      </main>
    </>
  );
}
