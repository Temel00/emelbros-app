"use client";

/** PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves. See prototype-meal-plan-harness.tsx. */

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
  DayChipList,
  entriesOnDate,
  SLOT_DOT,
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
 * "Accordion" — the week collapsed to one line per day by default (a
 * handful of slot-colour dots plus a count), so the whole week fits
 * without scrolling and nothing competes with today. Tap a day to expand
 * its full chip list in place. Today starts expanded; the rest start
 * closed — this is the most direct answer to "cluttered, hard to tell
 * days apart": collapsed days simply take one row each.
 */
export function PrototypeVariantH({
  days,
  entries,
  recipes,
  recipeSummaries,
  onAssign,
  onToggleCooked,
}: WeekProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([todayIso]));

  function toggle(date: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col rounded-lg border border-border">
      {days.map((day) => {
        const dayEntries = entriesOnDate(entries, day.date);
        const isOpen = open.has(day.date);
        const isToday = day.date === todayIso;

        return (
          <div
            key={day.date}
            className="border-b border-border last:border-b-0"
          >
            <button
              type="button"
              onClick={() => toggle(day.date)}
              aria-expanded={isOpen}
              className={`flex w-full items-center justify-between px-3 py-2.5 text-left ${isToday ? "bg-primary/5" : ""}`}
            >
              <span className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{day.label}</span>
                <span className="text-xs text-muted-foreground">
                  {day.dayOfMonth}
                </span>
                {isToday && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary">
                    Today
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                {!isOpen && (
                  <span className="flex items-center gap-1">
                    <span className="flex gap-0.5">
                      {dayEntries.slice(0, 5).map((entry) => (
                        <span
                          key={entry.id}
                          className={`size-1.5 rounded-full ${SLOT_DOT[entry.mealSlot] ?? "bg-muted-foreground"} ${entry.cookedAt ? "opacity-40" : ""}`}
                        />
                      ))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dayEntries.length === 0
                        ? "Nothing planned"
                        : `${dayEntries.length} planned`}
                    </span>
                  </span>
                )}
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {isOpen && (
              <div className="px-3 pb-3">
                <DayChipList
                  date={day.date}
                  entries={entries}
                  recipes={recipes}
                  recipeSummaries={recipeSummaries}
                  onAssign={onAssign}
                  onToggleCooked={onToggleCooked}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
