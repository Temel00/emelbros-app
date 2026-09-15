import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { NutritionNav } from "@/modules/nutrition/components/nutrition-nav";
import { ShoppingListView } from "@/modules/nutrition/components/shopping-list-view";
import { weekRange } from "@/modules/nutrition/lib/plan-calendar";
import {
  getPantryItems,
  getShoppingListItems,
} from "@/modules/nutrition/queries";

/**
 * The shopping list view (nutrition.md §3.4, wayfinder #120). The list
 * itself is a flat table with no stored date range (§4) — it's always
 * shown in full. Generating targets the current week's plan, matching the
 * settled prototype (#119, Variant E), which has no date picker of its
 * own either.
 */
export default async function ShoppingListPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const [items, pantryItems] = await Promise.all([
    getShoppingListItems(supabase),
    getPantryItems(supabase),
  ]);

  const range = weekRange(new Date());

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <NutritionNav active="shopping" />

        <div>
          <h1 className="text-xl font-semibold">Shopping list</h1>
          <p className="text-sm text-muted-foreground">
            What the household needs to buy. Anyone can add, check off, or
            regenerate from the plan.
          </p>
        </div>

        <ShoppingListView items={items} pantryItems={pantryItems} range={range} />
      </main>
    </>
  );
}
