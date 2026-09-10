"use client";

/** PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves. See prototype-meal-plan-harness.tsx. */

import { Apple, Coffee, Plus, Sandwich, UtensilsCrossed } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  AssignMealDialog,
  entryAt,
  entryTitle,
  mealSlots,
  type MockPlanEntry,
  type PlanDay,
} from "@/modules/nutrition/components/prototype-meal-plan-shared";
import type { RecipeRow } from "@/modules/nutrition/queries";

const SLOT_ICON: Record<string, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Sandwich,
  dinner: UtensilsCrossed,
  snack: Apple,
};

const todayIso = new Date().toISOString().slice(0, 10);

export function PrototypeVariantA({
  days,
  entries,
  recipes,
  onAssign,
  onToggleCooked,
}: {
  days: PlanDay[];
  entries: MockPlanEntry[];
  recipes: RecipeRow[];
  onAssign: (
    date: string,
    slot: string,
    input: {
      recipeId: string | null;
      recipeTitle: string | null;
      freeformTitle: string | null;
      servingsPlanned: number;
    },
  ) => void;
  onToggleCooked: (entryId: string) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      {days.map((day) => {
        const filledSlots = mealSlots().filter(
          (slot) => entryAt(entries, day.date, slot.key).length > 0,
        );
        const emptySlots = mealSlots().filter(
          (slot) => entryAt(entries, day.date, slot.key).length === 0,
        );

        return (
          <section key={day.date} className="flex flex-col gap-1.5">
            <h2 className="flex items-baseline gap-2 text-sm font-semibold">
              {day.label}
              <span className="font-normal text-muted-foreground">
                {day.dayOfMonth}
              </span>
              {day.date === todayIso && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary">
                  Today
                </span>
              )}
            </h2>

            {filledSlots.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing planned</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
                {filledSlots.map((slot) =>
                  entryAt(entries, day.date, slot.key).map((entry) => {
                    const Icon = SLOT_ICON[slot.key] ?? UtensilsCrossed;
                    const cooked = Boolean(entry.cookedAt);
                    return (
                      <li
                        key={entry.id}
                        className="flex items-center gap-2.5 px-3 py-2"
                      >
                        <Checkbox
                          checked={cooked}
                          onCheckedChange={() => onToggleCooked(entry.id)}
                          aria-label={
                            cooked ? "Mark not cooked" : "Mark cooked"
                          }
                        />
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${cooked ? "text-muted-foreground line-through" : ""}`}
                          >
                            {entryTitle(entry)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {slot.label} · ×{entry.servingsPlanned}
                          </p>
                        </div>
                        {cooked && (
                          <button
                            type="button"
                            className="shrink-0 text-xs font-medium text-primary hover:underline"
                          >
                            Log this meal →
                          </button>
                        )}
                      </li>
                    );
                  }),
                )}
              </ul>
            )}

            {emptySlots.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 pl-0.5">
                {emptySlots.map((slot) => (
                  <AssignMealDialog
                    key={slot.key}
                    recipes={recipes}
                    onAssign={(input) => onAssign(day.date, slot.key, input)}
                    trigger={
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Plus className="size-3" />
                        {slot.label}
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
