"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves.
 *
 * Round 3, after round 2's reaction: the month view (shared here as
 * `MonthGridView`, unchanged) landed on both D and E, so it's kept as-is
 * and shared across everything below. The week view didn't land on
 * either — "cluttered, hard to tell days apart" — so round 3 replaces it
 * with three structurally different attempts: F (day board — swipeable
 * per-day cards), G (slot lanes — a real day×slot grid), H (accordion —
 * one collapsed line per day, tap to expand). See each variant file for
 * what it's testing.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  addMonths,
  addWeeks,
  buildMockEntries,
  getMonthGrid,
  getWeekDays,
  MonthGridView,
  type MockPlanEntry,
  type RecipeSummary,
} from "@/modules/nutrition/components/prototype-meal-plan-shared";
import { PrototypeVariantF } from "@/modules/nutrition/components/prototype-meal-plan-variant-f";
import { PrototypeVariantG } from "@/modules/nutrition/components/prototype-meal-plan-variant-g";
import { PrototypeVariantH } from "@/modules/nutrition/components/prototype-meal-plan-variant-h";
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import type { RecipeRow } from "@/modules/nutrition/queries";

const VARIANTS = [
  { key: "F", name: "Day board" },
  { key: "G", name: "Slot lanes" },
  { key: "H", name: "Accordion" },
];

export function PrototypeMealPlanHarness({
  recipes,
  recipeSummaries,
}: {
  recipes: RecipeRow[];
  recipeSummaries: RecipeSummary[];
}) {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "F";

  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());

  const days = useMemo(() => getWeekDays(anchor), [anchor]);
  const monthGrid = useMemo(() => getMonthGrid(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const weekLabel = `${days[0].dayOfMonth} – ${days[6].dayOfMonth}`;

  // Seed once from the current week regardless of what's later browsed to,
  // so mock data stays put as you navigate — a real plan would fetch per
  // range instead (`getMealPlanEntries` already exists for that, #115).
  const [entries, setEntries] = useState<MockPlanEntry[]>(() =>
    buildMockEntries(recipes, getWeekDays(new Date())),
  );

  function assignEntry(
    date: string,
    slot: string,
    input: {
      recipeId: string | null;
      recipeTitle: string | null;
      freeformTitle: string | null;
      servingsPlanned: number;
    },
  ) {
    setEntries((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        planDate: date,
        mealSlot: slot,
        cookedAt: null,
        ...input,
      },
    ]);
  }

  function toggleCooked(entryId: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, cookedAt: e.cookedAt ? null : new Date().toISOString() }
          : e,
      ),
    );
  }

  function goPrev() {
    setAnchor((a) => (viewMode === "week" ? addWeeks(a, -1) : addMonths(a, -1)));
  }
  function goNext() {
    setAnchor((a) => (viewMode === "week" ? addWeeks(a, 1) : addMonths(a, 1)));
  }
  function goToday() {
    setAnchor(new Date());
  }

  const weekProps = {
    days,
    entries,
    recipes,
    recipeSummaries,
    onAssign: assignEntry,
    onToggleCooked: toggleCooked,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon-sm" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-semibold">
            {viewMode === "week" ? weekLabel : monthLabel}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={goNext} aria-label="Next">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>

        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          {(["week", "month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1 text-sm font-medium capitalize ${
                viewMode === mode
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "month" ? (
        <MonthGridView
          monthGrid={monthGrid}
          entries={entries}
          recipes={recipes}
          recipeSummaries={recipeSummaries}
          onAssign={assignEntry}
          onToggleCooked={toggleCooked}
        />
      ) : (
        <>
          {variant === "F" && <PrototypeVariantF {...weekProps} />}
          {variant === "G" && <PrototypeVariantG {...weekProps} />}
          {variant === "H" && <PrototypeVariantH {...weekProps} />}
        </>
      )}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </div>
  );
}
