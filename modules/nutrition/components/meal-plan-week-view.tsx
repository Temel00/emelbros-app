import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { AssignMealDialog } from "@/modules/nutrition/components/assign-meal-dialog";
import { mealSlotDotClass, mealSlotIcon } from "@/modules/nutrition/components/meal-slot-badge";
import { PlanChip } from "@/modules/nutrition/components/plan-chip";
import { mealSlots } from "@/modules/nutrition/lib/meal-slots";
import { entriesAt, todayIso, type PlanDay } from "@/modules/nutrition/lib/plan-calendar";
import type {
  MealPlanEntryWithRecipe,
  RecipeRow,
} from "@/modules/nutrition/queries";

/**
 * "Slot lanes" — the week as a real grid: one row per meal slot, one
 * column per day, so days are separated by grid lines instead of
 * whitespace and it's easy to compare the same slot across the week
 * (nutrition.md §3.4, wayfinder #117). Adapted from the settled
 * prototype's Variant G (#116) onto the real entry shape and server
 * actions. The slot-label column is `sticky left-0` so it stays put while
 * the day columns scroll on narrow screens, the same column-freeze the
 * recipe box (#114) uses elsewhere in this module.
 */
export function MealPlanWeekView({
  days,
  entries,
  recipes,
}: {
  days: PlanDay[];
  entries: MealPlanEntryWithRecipe[];
  recipes: RecipeRow[];
}) {
  const today = todayIso();

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="grid grid-cols-[96px_repeat(7,minmax(150px,1fr))]">
        <div className="sticky left-0 z-10 border-r border-b border-border bg-background" />
        {days.map((day) => (
          <div
            key={day.date}
            className={`min-w-0 border-r border-b border-border px-2 py-2 text-center last:border-r-0 ${
              day.date === today ? "bg-primary/5" : "bg-muted/30"
            }`}
          >
            <div className="truncate text-xs font-semibold">{day.label}</div>
            <div className="truncate text-[0.65rem] text-muted-foreground">
              {day.dayOfMonth}
            </div>
          </div>
        ))}

        {mealSlots().map((slot) => (
          <GridRow key={slot.key}>
            <div className="sticky left-0 z-10 flex items-center gap-1.5 border-r border-b border-border bg-background px-2 py-2">
              <span
                className={`size-1.5 shrink-0 rounded-full ${mealSlotDotClass(slot.key)}`}
                aria-hidden
              />
              {mealSlotIcon(slot, "size-3.5 shrink-0 text-muted-foreground")}
              <span className="text-xs font-medium text-muted-foreground">
                {slot.label}
              </span>
            </div>
            {days.map((day) => {
              const items = entriesAt(entries, day.date, slot.key);
              return (
                <div
                  key={day.date}
                  className="flex min-h-16 min-w-0 flex-col items-stretch gap-1 border-r border-b border-border p-1.5 last:border-r-0"
                >
                  {items.map((entry) => (
                    <PlanChip
                      key={entry.id}
                      entry={entry}
                      showSlotIndicator={false}
                      className="w-full rounded-md"
                    />
                  ))}
                  <AssignMealDialog
                    planDate={day.date}
                    slots={[slot]}
                    recipes={recipes}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Add ${slot.label.toLowerCase()} for ${day.label}`}
                        className="flex items-center gap-0.5 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[0.65rem] text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <Plus className="size-2.5" aria-hidden />
                      </button>
                    }
                  />
                </div>
              );
            })}
          </GridRow>
        ))}
      </div>
    </div>
  );
}

/**
 * A grid row spread across the shared 8-column template. `contents` keeps
 * these children direct grid items of the outer grid (so row lines align
 * across slots) without an extra wrapping box that would break the
 * column layout.
 */
function GridRow({ children }: { children: ReactNode }) {
  return <div className="contents">{children}</div>;
}
