"use client";

import { useState } from "react";

import {
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayChipList } from "@/modules/nutrition/components/day-chip-list";
import { mealSlotDotClass } from "@/modules/nutrition/components/meal-slot-badge";
import {
  entriesOnDate,
  entryTitle,
  parseIsoDate,
  todayIso,
  type MonthDay,
} from "@/modules/nutrition/lib/plan-calendar";
import type {
  MealPlanEntryWithRecipe,
  RecipeRow,
} from "@/modules/nutrition/queries";

/**
 * A Monday-aligned 6-week grid of dot-summary cells; tap a day for a
 * chip-list peek with the ability to add right there (nutrition.md §3.4,
 * wayfinder #117). Adapted from the settled prototype's `MonthGridView`
 * (#116) onto the real entry shape.
 */
export function MealPlanMonthView({
  monthGrid,
  entries,
  recipes,
}: {
  monthGrid: MonthDay[][];
  entries: MealPlanEntryWithRecipe[];
  recipes: RecipeRow[];
}) {
  const [peekDate, setPeekDate] = useState<string | null>(null);
  const today = todayIso();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="grid grid-cols-7 gap-1.5">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div
            key={label}
            className="px-1 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {monthGrid.flat().map((day) => {
          const dayEntries = entriesOnDate(entries, day.date);
          const shown = dayEntries.slice(0, 4);
          const overflow = dayEntries.length - shown.length;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setPeekDate(day.date)}
              className={`flex min-h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left ${
                day.inCurrentMonth
                  ? "border-border bg-card"
                  : "border-transparent text-muted-foreground/50"
              } ${day.date === today ? "ring-1 ring-primary" : ""}`}
            >
              <span className="text-xs font-medium">{day.dayNumber}</span>
              <div className="flex flex-wrap gap-0.5">
                {shown.map((entry) => (
                  <span
                    key={entry.id}
                    title={entryTitle(entry)}
                    className={`size-1.5 rounded-full ${mealSlotDotClass(entry.meal_slot)} ${
                      entry.cooked_at ? "opacity-40" : ""
                    }`}
                  />
                ))}
                {overflow > 0 && (
                  <span className="text-[0.6rem] text-muted-foreground">
                    +{overflow}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <DialogRoot
        open={peekDate !== null}
        onOpenChange={(next) => !next && setPeekDate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {peekDate &&
                parseIsoDate(peekDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
            </DialogTitle>
          </DialogHeader>
          {peekDate && (
            <div className="pt-2">
              <DayChipList date={peekDate} entries={entries} recipes={recipes} />
            </div>
          )}
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
