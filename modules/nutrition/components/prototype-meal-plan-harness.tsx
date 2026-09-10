"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves.
 *
 * Three structurally different takes on the week-at-a-glance meal plan
 * (nutrition.md §3.4, wayfinder #116): the hard part is that seven days
 * times four meal slots is 28 cells, which does not fit a phone grid, so
 * each variant answers that differently rather than just re-spacing a grid.
 *
 * - **A — Day list**: vertical, mobile-first scroll; one section per day,
 *   only filled slots plus a slim "+" row for the rest. Mark-cooked is a
 *   checkbox on the row.
 * - **B — Day strip**: a horizontal day-picker strip with one day expanded
 *   below it, all four slots always shown (empty ones dashed). Mark-cooked
 *   is a full-width button inside the expanded slot card.
 * - **C — Grid / rail**: the actual 7×4 grid on desktop (all 28 cells,
 *   spreadsheet-dense like the recipe box), collapsing on phone to one
 *   horizontal-scroll rail per meal slot instead of a grid at all.
 *   Mark-cooked is a tap-to-cycle status chip.
 */

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  buildMockEntries,
  getWeekDays,
  type MockPlanEntry,
} from "@/modules/nutrition/components/prototype-meal-plan-shared";
import { PrototypeVariantA } from "@/modules/nutrition/components/prototype-meal-plan-variant-a";
import { PrototypeVariantB } from "@/modules/nutrition/components/prototype-meal-plan-variant-b";
import { PrototypeVariantC } from "@/modules/nutrition/components/prototype-meal-plan-variant-c";
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import type { RecipeRow } from "@/modules/nutrition/queries";

const VARIANTS = [
  { key: "A", name: "Day list" },
  { key: "B", name: "Day strip + detail" },
  { key: "C", name: "Grid / rail" },
];

export function PrototypeMealPlanHarness({
  recipes,
}: {
  recipes: RecipeRow[];
}) {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";

  const days = useMemo(() => getWeekDays(), []);
  const [entries, setEntries] = useState<MockPlanEntry[]>(() =>
    buildMockEntries(recipes, days),
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

  const props = { days, entries, recipes, onAssign: assignEntry, onToggleCooked: toggleCooked };

  return (
    <>
      {variant === "A" && <PrototypeVariantA {...props} />}
      {variant === "B" && <PrototypeVariantB {...props} />}
      {variant === "C" && <PrototypeVariantC {...props} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </>
  );
}
