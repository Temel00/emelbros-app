"use client";

/** PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves. See prototype-meal-plan-harness.tsx. */

import {
  AssignMealDialog,
  Chip,
  entriesOnDate,
  entryAt,
  mealSlots,
  todayIso,
  type AssignFn,
  type MockPlanEntry,
  type PlanDay,
  type RecipeSummary,
} from "@/modules/nutrition/components/prototype-meal-plan-shared";
import type { RecipeRow } from "@/modules/nutrition/queries";
import { Plus } from "lucide-react";

type WeekProps = {
  days: PlanDay[];
  entries: MockPlanEntry[];
  recipes: RecipeRow[];
  recipeSummaries: RecipeSummary[];
  onAssign: AssignFn;
  onToggleCooked: (entryId: string) => void;
};

/**
 * "Day board" — each day is its own bordered, shadowed card in a
 * swipeable horizontal strip (snap-scroll), so the boundary between days
 * is a literal card edge rather than a divider line to squint at. Items
 * inside a card are grouped under their meal slot so a three-item
 * breakfast still reads as one block, not three peers of dinner.
 */
export function PrototypeVariantF({
  days,
  entries,
  recipes,
  recipeSummaries,
  onAssign,
  onToggleCooked,
}: WeekProps) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {days.map((day) => {
        const dayEntries = entriesOnDate(entries, day.date);
        const filledSlots = mealSlots().filter(
          (slot) => entryAt(entries, day.date, slot.key).length > 0,
        );
        const isToday = day.date === todayIso;

        return (
          <div
            key={day.date}
            className={`flex w-[80%] shrink-0 snap-center flex-col overflow-hidden rounded-xl border shadow-sm sm:w-auto sm:shrink ${
              isToday ? "border-primary/40" : "border-border"
            }`}
          >
            <div
              className={`flex items-baseline justify-between border-b border-border px-3 py-2 ${
                isToday ? "bg-primary/5" : "bg-muted/40"
              }`}
            >
              <span className="text-sm font-semibold">{day.label}</span>
              <span className="text-xs text-muted-foreground">
                {day.dayOfMonth}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2.5 bg-card p-3">
              {dayEntries.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nothing planned
                </p>
              )}
              {filledSlots.map((slot) => (
                <div key={slot.key} className="flex flex-col gap-1">
                  <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                    {slot.label}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {entryAt(entries, day.date, slot.key).map((entry) => (
                      <Chip
                        key={entry.id}
                        entry={entry}
                        recipeSummaries={recipeSummaries}
                        onToggleCooked={onToggleCooked}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <AssignMealDialog
                slots={mealSlots()}
                recipes={recipes}
                onAssign={(slot, input) => onAssign(day.date, slot, input)}
                trigger={
                  <button
                    type="button"
                    className="mt-auto flex w-fit items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Plus className="size-3" />
                    Add
                  </button>
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
