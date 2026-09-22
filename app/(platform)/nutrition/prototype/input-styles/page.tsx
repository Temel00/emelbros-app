// PROTOTYPE: Input style variants — Nutrition module
// Route: /nutrition/prototype/input-styles?variant=C|D|E
// Throwaway. Do not promote to main.

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { NutritionNav } from "@/modules/nutrition/components/nutrition-nav";

import { InputStyleVariants, PrototypeSwitcher } from "./variants";
import type { Variant } from "./variants";

export default async function InputStylesPrototypePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const params = await searchParams;

  const raw = params.variant;
  const v: Variant = raw === "D" ? "D" : raw === "E" ? "E" : "C";

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 pb-24 sm:p-6">
        <NutritionNav active="settings" />

        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            Prototype
          </span>
          <div>
            <h1 className="text-xl font-semibold">Input Styles</h1>
            <p className="text-sm text-muted-foreground">
              Three candidate styles for qty, dropdown, and text inputs across
              Nutrition modals and pages. Use ← → or the bar below to switch.
            </p>
          </div>
        </div>

        <InputStyleVariants variant={v} />
      </main>

      <PrototypeSwitcher current={v} />
    </>
  );
}
