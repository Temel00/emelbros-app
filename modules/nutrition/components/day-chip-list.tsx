import { Plus } from "lucide-react";

import { AssignMealDialog } from "@/modules/nutrition/components/assign-meal-dialog";
import { PlanChip } from "@/modules/nutrition/components/plan-chip";
import { entriesOnDate } from "@/modules/nutrition/lib/plan-calendar";
import type {
  MealPlanEntryWithRecipe,
  RecipeRow,
} from "@/modules/nutrition/queries";

/**
 * A day's items as wrapping chips, plus a trailing "+ Add" trigger that
 * offers every slot (nutrition.md §3.4, wayfinder #117). Adapted from the
 * settled prototype's `DayChipList` (#116) onto the real entry shape; used
 * inside the month view's day-peek dialog.
 */
export function DayChipList({
  date,
  entries,
  recipes,
}: {
  date: string;
  entries: MealPlanEntryWithRecipe[];
  recipes: RecipeRow[];
}) {
  const dayEntries = entriesOnDate(entries, date);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {dayEntries.length === 0 && (
        <span className="text-xs text-muted-foreground">Nothing planned</span>
      )}
      {dayEntries.map((entry) => (
        <PlanChip key={entry.id} entry={entry} />
      ))}
      <AssignMealDialog
        planDate={date}
        recipes={recipes}
        trigger={
          <button
            type="button"
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="size-3" aria-hidden />
            Add
          </button>
        }
      />
    </div>
  );
}
