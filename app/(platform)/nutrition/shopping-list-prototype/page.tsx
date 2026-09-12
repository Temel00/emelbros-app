import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { PrototypeShoppingListHarness } from "@/modules/nutrition/components/prototype-shopping-list-harness";
import { getPantryItems } from "@/modules/nutrition/queries";

/**
 * PROTOTYPE ONLY — throwaway route. Delete when wayfinder #119 resolves.
 *
 * Three variants of the shopping list, switchable via `?variant=`, on a new
 * `/nutrition/shopping-list-prototype` route (no real page exists yet — the
 * shopping-list schema and generate/check-off logic landed in #118, but the
 * UI is still unbuilt). Mounted in the real app shell so the owner judges it
 * against real chrome, not a blank canvas.
 *
 * Pantry items come from the real `nutrition_pantry_item` table (read-only)
 * so food names, units, and locations are the owner's own kitchen's. The
 * shopping-list lines themselves — quantities, auto/manual source, checked
 * state, and the three "Generate" scenarios (normal, plan-changed, empty) —
 * are in-memory mock data. Nothing here reads or writes
 * `nutrition_shopping_list_item`, and checking a line off never touches the
 * real pantry rows, even though it renders a restock note as if it had.
 */
export default async function ShoppingListPrototypePage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const pantryItems = await getPantryItems(supabase);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 pb-24 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold">Shopping list (prototype)</h1>
          <p className="text-sm text-muted-foreground">
            Three takes on the generated + manual shopping list: how auto vs
            manual lines read, where Generate lives and what its preview
            looks like (including an empty result), how a checked line
            behaves, whether the silent pantry restock is made visible, and
            flat vs grouped-by-location layout. Flip between them with the
            bar at the bottom.
          </p>
        </div>

        <Suspense>
          <PrototypeShoppingListHarness pantryItems={pantryItems} />
        </Suspense>
      </main>
    </>
  );
}
