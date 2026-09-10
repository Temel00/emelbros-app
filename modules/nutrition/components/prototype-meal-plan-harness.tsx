"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves.
 *
 * Round 2, after round 1 (day list / day strip / grid-and-rail) didn't
 * land: a week/month toggle, slots that hold more than one item, and
 * recipes you can click into. Two compact-list directions to react to —
 * see prototype-meal-plan-variant-d.tsx and -e.tsx for what differs
 * between them.
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
  type MockPlanEntry,
  type RecipeSummary,
} from "@/modules/nutrition/components/prototype-meal-plan-shared";
import { PrototypeVariantD } from "@/modules/nutrition/components/prototype-meal-plan-variant-d";
import { PrototypeVariantE } from "@/modules/nutrition/components/prototype-meal-plan-variant-e";
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import type { RecipeRow } from "@/modules/nutrition/queries";

const VARIANTS = [
  { key: "D", name: "Compact chips" },
  { key: "E", name: "Grouped lines" },
];

export function PrototypeMealPlanHarness({
  recipes,
  recipeSummaries,
}: {
  recipes: RecipeRow[];
  recipeSummaries: RecipeSummary[];
}) {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "D";

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

  const props = {
    days,
    monthGrid,
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

      {variant === "D" && <PrototypeVariantD viewMode={viewMode} {...props} />}
      {variant === "E" && <PrototypeVariantE viewMode={viewMode} {...props} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </div>
  );
}
