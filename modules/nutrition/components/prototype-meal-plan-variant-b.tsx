"use client";

/** PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves. See prototype-meal-plan-harness.tsx. */

import { Apple, Coffee, Plus, Sandwich, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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

export function PrototypeVariantB({
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
  const [selected, setSelected] = useState(
    days.find((d) => d.date === todayIso)?.date ?? days[0].date,
  );
  const day = days.find((d) => d.date === selected) ?? days[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d) => {
          const filledCount = mealSlots().filter(
            (slot) => entryAt(entries, d.date, slot.key).length > 0,
          ).length;
          const active = d.date === selected;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelected(d.date)}
              className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-center ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-foreground hover:bg-muted"
              }`}
            >
              <span className="text-xs font-medium">{d.label}</span>
              <span
                className={`text-[0.65rem] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
                {d.dayOfMonth}
              </span>
              {filledCount > 0 && (
                <span
                  className={`mt-0.5 size-1.5 rounded-full ${active ? "bg-primary-foreground" : "bg-primary"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {mealSlots().map((slot) => {
          const slotEntries = entryAt(entries, day.date, slot.key);
          const Icon = SLOT_ICON[slot.key] ?? UtensilsCrossed;

          if (slotEntries.length === 0) {
            return (
              <AssignMealDialog
                key={slot.key}
                recipes={recipes}
                onAssign={(input) => onAssign(day.date, slot.key, input)}
                trigger={
                  <button
                    type="button"
                    className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Plus className="size-4" />
                    <span className="text-xs font-medium">
                      Add {slot.label.toLowerCase()}
                    </span>
                  </button>
                }
              />
            );
          }

          return (
            <div key={slot.key} className="flex flex-col gap-2">
              {slotEntries.map((entry) => {
                const cooked = Boolean(entry.cookedAt);
                return (
                  <div
                    key={entry.id}
                    className={`flex flex-col gap-2 rounded-xl border p-3 ${
                      cooked
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Icon className="size-3.5" />
                      {slot.label}
                    </div>
                    <p className="text-sm font-semibold">
                      {entryTitle(entry)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Serves {entry.servingsPlanned}
                    </p>

                    {cooked ? (
                      <div className="flex flex-col gap-1.5 pt-1">
                        <span className="text-xs font-medium text-primary">
                          ✓ Cooked
                        </span>
                        <Button size="sm" variant="outline">
                          Log this meal
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-1"
                        onClick={() => onToggleCooked(entry.id)}
                      >
                        Mark cooked
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
