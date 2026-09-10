"use client";

/** PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves. See prototype-meal-plan-harness.tsx. */

import { Check, Plus } from "lucide-react";

import {
  AssignMealDialog,
  entryAt,
  entryTitle,
  mealSlots,
  type MockPlanEntry,
  type PlanDay,
} from "@/modules/nutrition/components/prototype-meal-plan-shared";
import type { RecipeRow } from "@/modules/nutrition/queries";

type VariantProps = {
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
};

/**
 * The one variant that keeps the literal 7×4 grid — but only on desktop,
 * where a spreadsheet-dense grid (recipe box's language) reads fine. On
 * phone the grid is dropped entirely for a horizontal-scroll rail per meal
 * slot: scroll sideways through the week within one slot at a time, rather
 * than down through 28 cramped cells.
 */
export function PrototypeVariantC(props: VariantProps) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="hidden md:block">
        <DesktopGrid {...props} />
      </div>
      <div className="flex flex-col gap-4 md:hidden">
        <MobileRails {...props} />
      </div>
    </div>
  );
}

function DesktopGrid({
  days,
  entries,
  recipes,
  onAssign,
  onToggleCooked,
}: VariantProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <th className="w-24 px-3 py-2 text-left font-medium">Slot</th>
            {days.map((day) => (
              <th key={day.date} className="px-2 py-2 text-left font-medium">
                {day.label}{" "}
                <span className="font-normal">{day.dayOfMonth}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mealSlots().map((slot) => (
            <tr key={slot.key} className="border-b border-border last:border-0">
              <td className="px-3 py-2 align-top text-xs font-medium text-muted-foreground">
                {slot.label}
              </td>
              {days.map((day) => {
                const slotEntries = entryAt(entries, day.date, slot.key);
                return (
                  <td key={day.date} className="min-w-32 p-1.5 align-top">
                    {slotEntries.length === 0 ? (
                      <AssignMealDialog
                        recipes={recipes}
                        onAssign={(input) => onAssign(day.date, slot.key, input)}
                        trigger={
                          <button
                            type="button"
                            className="flex h-14 w-full items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        }
                      />
                    ) : (
                      <div className="flex flex-col gap-1">
                        {slotEntries.map((entry) => {
                          const cooked = Boolean(entry.cookedAt);
                          return (
                            <div
                              key={entry.id}
                              className={`relative rounded-md border p-1.5 pr-5 ${
                                cooked
                                  ? "border-primary/30 bg-primary/5"
                                  : "border-border bg-card"
                              }`}
                            >
                              <p
                                className={`truncate text-xs font-medium ${cooked ? "text-muted-foreground line-through" : ""}`}
                              >
                                {entryTitle(entry)}
                              </p>
                              <p className="text-[0.65rem] text-muted-foreground">
                                ×{entry.servingsPlanned}
                              </p>
                              <button
                                type="button"
                                onClick={() => onToggleCooked(entry.id)}
                                aria-label={
                                  cooked ? "Mark not cooked" : "Mark cooked"
                                }
                                className={`absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full border ${
                                  cooked
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40"
                                }`}
                              >
                                {cooked && <Check className="size-2.5" strokeWidth={3} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileRails({
  days,
  entries,
  recipes,
  onAssign,
  onToggleCooked,
}: VariantProps) {
  return (
    <>
      {mealSlots().map((slot) => (
        <section key={slot.key} className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold">{slot.label}</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day) => {
              const slotEntries = entryAt(entries, day.date, slot.key);

              if (slotEntries.length === 0) {
                return (
                  <AssignMealDialog
                    key={day.date}
                    recipes={recipes}
                    onAssign={(input) => onAssign(day.date, slot.key, input)}
                    trigger={
                      <button
                        type="button"
                        className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-2 text-muted-foreground"
                      >
                        <span className="text-[0.65rem] font-medium">
                          {day.label}
                        </span>
                        <Plus className="size-3.5" />
                      </button>
                    }
                  />
                );
              }

              return slotEntries.map((entry) => {
                const cooked = Boolean(entry.cookedAt);
                return (
                  <div
                    key={entry.id}
                    className={`relative w-24 shrink-0 rounded-xl border p-2 ${
                      cooked
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <p className="text-[0.65rem] font-medium text-muted-foreground">
                      {day.label}
                    </p>
                    <p
                      className={`mt-1 line-clamp-2 text-xs font-semibold ${cooked ? "text-muted-foreground line-through" : ""}`}
                    >
                      {entryTitle(entry)}
                    </p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      ×{entry.servingsPlanned}
                    </p>
                    <button
                      type="button"
                      onClick={() => onToggleCooked(entry.id)}
                      aria-label={cooked ? "Mark not cooked" : "Mark cooked"}
                      className={`absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full border ${
                        cooked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {cooked && <Check className="size-3" strokeWidth={3} />}
                    </button>
                  </div>
                );
              });
            })}
          </div>
        </section>
      ))}
    </>
  );
}
