"use client";

/** PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves. See prototype-meal-plan-harness.tsx. */

import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import {
  AssignMealDialog,
  Chip,
  entryAt,
  mealSlots,
  SLOT_ICON,
  todayIso,
  type AssignFn,
  type MockPlanEntry,
  type PlanDay,
  type RecipeSummary,
} from "@/modules/nutrition/components/prototype-meal-plan-shared";
import type { RecipeRow } from "@/modules/nutrition/queries";

type WeekProps = {
  days: PlanDay[];
  entries: MockPlanEntry[];
  recipes: RecipeRow[];
  recipeSummaries: RecipeSummary[];
  onAssign: AssignFn;
  onToggleCooked: (entryId: string) => void;
};

/**
 * "Slot lanes" — the week as a real grid: one row per meal slot, one
 * column per day, so days are separated by grid lines instead of
 * whitespace and it's easy to compare the same slot across the week (e.g.
 * "what are we having for dinner this week"). The slot-label column is
 * `sticky left-0` so it stays put while the day columns scroll on
 * narrow screens — the spreadsheet-style column-freeze the recipe box
 * (#114) already uses elsewhere in this module.
 */
export function PrototypeVariantG({
  days,
  entries,
  recipes,
  recipeSummaries,
  onAssign,
  onToggleCooked,
}: WeekProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="grid grid-cols-[88px_repeat(7,minmax(120px,1fr))]">
        <div className="sticky left-0 z-10 border-r border-b border-border bg-background" />
        {days.map((day) => (
          <div
            key={day.date}
            className={`border-r border-b border-border px-2 py-2 text-center last:border-r-0 ${
              day.date === todayIso ? "bg-primary/5" : "bg-muted/30"
            }`}
          >
            <div className="text-xs font-semibold">{day.label}</div>
            <div className="text-[0.65rem] text-muted-foreground">
              {day.dayOfMonth}
            </div>
          </div>
        ))}

        {mealSlots().map((slot) => {
          const Icon = SLOT_ICON[slot.key] ?? SLOT_ICON.dinner;
          return (
            <FragmentRow key={slot.key}>
              <div className="sticky left-0 z-10 flex items-center gap-1.5 border-r border-b border-border bg-background px-2 py-2">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {slot.label}
                </span>
              </div>
              {days.map((day) => {
                const items = entryAt(entries, day.date, slot.key);
                return (
                  <div
                    key={day.date}
                    className="flex min-h-16 flex-col items-start gap-1 border-r border-b border-border p-1.5 last:border-r-0"
                  >
                    {items.map((entry) => (
                      <Chip
                        key={entry.id}
                        entry={entry}
                        recipeSummaries={recipeSummaries}
                        onToggleCooked={onToggleCooked}
                      />
                    ))}
                    <AssignMealDialog
                      slots={[slot]}
                      recipes={recipes}
                      onAssign={(s, input) => onAssign(day.date, s, input)}
                      trigger={
                        <button
                          type="button"
                          aria-label={`Add ${slot.label.toLowerCase()} for ${day.label}`}
                          className="flex items-center gap-0.5 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[0.65rem] text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Plus className="size-2.5" />
                        </button>
                      }
                    />
                  </div>
                );
              })}
            </FragmentRow>
          );
        })}
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
function FragmentRow({ children }: { children: ReactNode }) {
  return <div className="contents">{children}</div>;
}
