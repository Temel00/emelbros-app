"use client";

/** PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves. See prototype-meal-plan-harness.tsx. */

import { Info, Plus } from "lucide-react";
import { useState } from "react";

import {
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AssignMealDialog,
  entryAt,
  entryTitle,
  mealSlots,
  RecipeQuickView,
  SLOT_DOT,
  SLOT_ICON,
  type MockPlanEntry,
  type MonthDay,
  type PlanDay,
  type RecipeSummary,
} from "@/modules/nutrition/components/prototype-meal-plan-shared";
import type { RecipeRow } from "@/modules/nutrition/queries";

type VariantProps = {
  viewMode: "week" | "month";
  days: PlanDay[];
  monthGrid: MonthDay[][];
  entries: MockPlanEntry[];
  recipes: RecipeRow[];
  recipeSummaries: RecipeSummary[];
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

const todayIso = new Date().toISOString().slice(0, 10);

/**
 * The item's name is the tap target for "mark cooked" (cycles on/off) —
 * the opposite of variant D, where the name opens the recipe and a
 * separate control marks cooked. A small info glyph, shown only when
 * there's a recipe behind the item, is the separate control here for
 * peeking at the recipe without toggling cooked by accident.
 */
function Item({
  entry,
  recipeSummaries,
  onToggleCooked,
}: {
  entry: MockPlanEntry;
  recipeSummaries: RecipeSummary[];
  onToggleCooked: (entryId: string) => void;
}) {
  const cooked = Boolean(entry.cookedAt);
  const recipe = entry.recipeId
    ? recipeSummaries.find((r) => r.id === entry.recipeId)
    : undefined;

  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onToggleCooked(entry.id)}
        className={`text-sm ${cooked ? "text-muted-foreground line-through" : "text-foreground hover:underline"}`}
      >
        {entryTitle(entry)}
        {entry.servingsPlanned !== 1 ? ` ×${entry.servingsPlanned}` : ""}
      </button>
      {recipe && (
        <RecipeQuickView
          recipe={recipe}
          trigger={
            <button
              type="button"
              aria-label={`View ${recipe.title}`}
              className="text-muted-foreground hover:text-primary"
            >
              <Info className="size-3" />
            </button>
          }
        />
      )}
    </span>
  );
}

function DayLines({
  date,
  entries,
  recipes,
  recipeSummaries,
  onAssign,
  onToggleCooked,
}: {
  date: string;
  entries: MockPlanEntry[];
  recipes: RecipeRow[];
  recipeSummaries: RecipeSummary[];
  onAssign: VariantProps["onAssign"];
  onToggleCooked: VariantProps["onToggleCooked"];
}) {
  const filledSlots = mealSlots().filter(
    (slot) => entryAt(entries, date, slot.key).length > 0,
  );

  return (
    <div className="flex flex-col gap-1">
      {filledSlots.length === 0 && (
        <p className="text-xs text-muted-foreground">Nothing planned</p>
      )}
      {filledSlots.map((slot) => {
        const Icon = SLOT_ICON[slot.key] ?? SLOT_ICON.dinner;
        const items = entryAt(entries, date, slot.key);
        return (
          <div key={slot.key} className="flex items-baseline gap-1.5 text-sm">
            <span
              className={`mt-1 size-1.5 shrink-0 rounded-full ${SLOT_DOT[slot.key] ?? "bg-muted-foreground"}`}
            />
            <Icon className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground" />
            <span className="shrink-0 font-medium text-muted-foreground">
              {slot.label}
            </span>
            <span className="flex flex-wrap items-center gap-x-1">
              {items.map((entry, i) => (
                <span key={entry.id} className="flex items-center gap-1">
                  <Item
                    entry={entry}
                    recipeSummaries={recipeSummaries}
                    onToggleCooked={onToggleCooked}
                  />
                  {i < items.length - 1 && (
                    <span className="text-muted-foreground">·</span>
                  )}
                </span>
              ))}
            </span>
          </div>
        );
      })}
      <AssignMealDialog
        slots={mealSlots()}
        recipes={recipes}
        onAssign={(slot, input) => onAssign(date, slot, input)}
        trigger={
          <button
            type="button"
            className="mt-0.5 flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <Plus className="size-3" />
            Add
          </button>
        }
      />
    </div>
  );
}

export function PrototypeVariantE(props: VariantProps) {
  if (props.viewMode === "week") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col divide-y divide-border">
        {props.days.map((day) => (
          <section key={day.date} className="flex flex-col gap-1 py-2.5">
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
            <DayLines
              date={day.date}
              entries={props.entries}
              recipes={props.recipes}
              recipeSummaries={props.recipeSummaries}
              onAssign={props.onAssign}
              onToggleCooked={props.onToggleCooked}
            />
          </section>
        ))}
      </div>
    );
  }

  return <MonthGrid {...props} />;
}

function MonthGrid(props: VariantProps) {
  const [peekDate, setPeekDate] = useState<string | null>(null);

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
        {props.monthGrid.flat().map((day) => {
          const dayEntries = mealSlots().flatMap((slot) =>
            entryAt(props.entries, day.date, slot.key),
          );
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
              } ${day.date === todayIso ? "ring-1 ring-primary" : ""}`}
            >
              <span className="text-xs font-medium">{day.dayNumber}</span>
              <div className="flex flex-wrap gap-0.5">
                {shown.map((entry) => (
                  <span
                    key={entry.id}
                    title={entryTitle(entry)}
                    className={`size-1.5 rounded-full ${SLOT_DOT[entry.mealSlot] ?? "bg-muted-foreground"} ${entry.cookedAt ? "opacity-40" : ""}`}
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
                new Date(`${peekDate}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
            </DialogTitle>
          </DialogHeader>
          {peekDate && (
            <div className="pt-2">
              <DayLines
                date={peekDate}
                entries={props.entries}
                recipes={props.recipes}
                recipeSummaries={props.recipeSummaries}
                onAssign={props.onAssign}
                onToggleCooked={props.onToggleCooked}
              />
            </div>
          )}
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
