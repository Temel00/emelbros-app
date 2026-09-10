"use client";

/** PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves. See prototype-meal-plan-harness.tsx. */

import { Check, Plus } from "lucide-react";
import { useState } from "react";

import {
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AssignMealDialog,
  entriesOnDate,
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
 * One item, one chip: an icon dot for its meal slot, the title (a button
 * that opens the recipe quick-view when there's a recipe behind it, plain
 * text when it's freeform), and a trailing check button that toggles
 * cooked. Chips wrap in a flex row so a three-item breakfast just grows
 * sideways then down, rather than needing its own sub-list.
 */
function Chip({
  entry,
  recipeSummaries,
  onToggleCooked,
}: {
  entry: MockPlanEntry;
  recipeSummaries: RecipeSummary[];
  onToggleCooked: (entryId: string) => void;
}) {
  const Icon = SLOT_ICON[entry.mealSlot] ?? SLOT_ICON.dinner;
  const cooked = Boolean(entry.cookedAt);
  const recipe = entry.recipeId
    ? recipeSummaries.find((r) => r.id === entry.recipeId)
    : undefined;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2 text-sm ${
        cooked ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <span className={`size-1.5 rounded-full ${SLOT_DOT[entry.mealSlot] ?? "bg-muted-foreground"}`} />
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {recipe ? (
        <RecipeQuickView
          recipe={recipe}
          trigger={
            <button
              type="button"
              className={`max-w-32 truncate font-medium hover:underline ${cooked ? "text-muted-foreground line-through" : ""}`}
            >
              {entryTitle(entry)}
            </button>
          }
        />
      ) : (
        <span
          className={`max-w-32 truncate font-medium ${cooked ? "text-muted-foreground line-through" : ""}`}
        >
          {entryTitle(entry)}
        </span>
      )}
      {entry.servingsPlanned !== 1 && (
        <span className="text-xs text-muted-foreground">
          ×{entry.servingsPlanned}
        </span>
      )}
      <button
        type="button"
        onClick={() => onToggleCooked(entry.id)}
        aria-label={cooked ? "Mark not cooked" : "Mark cooked"}
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
          cooked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40"
        }`}
      >
        {cooked && <Check className="size-2.5" strokeWidth={3} />}
      </button>
    </div>
  );
}

function DayChipRow({
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
  const dayEntries = entriesOnDate(entries, date);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {dayEntries.length === 0 && (
        <span className="text-xs text-muted-foreground">Nothing planned</span>
      )}
      {dayEntries.map((entry) => (
        <Chip
          key={entry.id}
          entry={entry}
          recipeSummaries={recipeSummaries}
          onToggleCooked={onToggleCooked}
        />
      ))}
      <AssignMealDialog
        slots={mealSlots()}
        recipes={recipes}
        onAssign={(slot, input) => onAssign(date, slot, input)}
        trigger={
          <button
            type="button"
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="size-3" />
            Add
          </button>
        }
      />
    </div>
  );
}

export function PrototypeVariantD(props: VariantProps) {
  if (props.viewMode === "week") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        {props.days.map((day) => (
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
            <DayChipRow
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
          const dayEntries = entriesOnDate(props.entries, day.date);
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
              <DayChipRow
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
