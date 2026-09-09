import { AddPantryItemForm } from "@/modules/nutrition/components/add-pantry-item-form";
import { locationIcon } from "@/modules/nutrition/components/location-icon";
import { PantryItemRow } from "@/modules/nutrition/components/pantry-item-row";
import { groupByLocation } from "@/modules/nutrition/lib/grouping";
import type { FoodRow, PantryItemWithFood } from "@/modules/nutrition/queries";

/**
 * The pantry view (docs/modules/nutrition.md §3.2): household inventory
 * grouped by where it's kept, plus the add form. Server component — the
 * interactive bits (the form, each row's edit/delete) are the client
 * islands beneath it.
 */
export function PantryHome({
  items,
  foods,
}: {
  items: PantryItemWithFood[];
  foods: FoodRow[];
}) {
  const groups = groupByLocation(items);

  return (
    <>
      <AddPantryItemForm foods={foods} />

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          The pantry is empty — add what&apos;s in the fridge above.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.location.key} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              {locationIcon(group.location, "size-4")}
              {group.location.label}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.items.map((item) => (
                <PantryItemRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
