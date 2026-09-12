"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #119 resolves.
 *
 * Owns the mock shopping-list state and the pending-Generate preview, and
 * hands both plus their handlers to whichever variant is selected. Sharing
 * this state logic across variants (not their layout — each variant is free
 * to render it however it wants) is what the prototype skill's UI branch
 * calls out as fine to share.
 */

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import {
  buildAutoScenario,
  buildSeedLines,
  nextScenario,
  scenarioLabel,
  type GenerationScenario,
  type ShoppingLine,
} from "@/modules/nutrition/components/prototype-shopping-list-shared";
import { VariantA } from "@/modules/nutrition/components/prototype-shopping-list-variant-a";
import { VariantB } from "@/modules/nutrition/components/prototype-shopping-list-variant-b";
import { VariantC } from "@/modules/nutrition/components/prototype-shopping-list-variant-c";
import type { PantryItemWithFood } from "@/modules/nutrition/queries";

const VARIANTS = [
  { key: "A", name: "Two lists, stacked" },
  { key: "B", name: "Grouped by location" },
  { key: "C", name: "Spreadsheet, one table" },
];

export type ShoppingListVariantProps = {
  lines: ShoppingLine[];
  toggleCheck: (id: string) => void;
  addManualLine: (input: {
    displayText: string;
    quantity: number;
    unit: string;
  }) => void;
  removeManualLine: (id: string) => void;
  pendingScenario: GenerationScenario | null;
  pendingLines: ShoppingLine[] | null;
  startGenerate: () => void;
  confirmGenerate: () => void;
  cancelGenerate: () => void;
  scenarioLabel: typeof scenarioLabel;
};

export function PrototypeShoppingListHarness({
  pantryItems,
}: {
  pantryItems: PantryItemWithFood[];
}) {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";

  const [lines, setLines] = useState<ShoppingLine[]>(() =>
    buildSeedLines(pantryItems),
  );
  const [scenario, setScenario] = useState<GenerationScenario>("shortfall");
  const [pendingScenario, setPendingScenario] =
    useState<GenerationScenario | null>(null);
  const [pendingLines, setPendingLines] = useState<ShoppingLine[] | null>(
    null,
  );

  function toggleCheck(id: string) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const checkedOff = !line.checkedOff;
        return {
          ...line,
          checkedOff,
          // Check-off silently restocks the pantry (#118's action) — this
          // note is what makes that visible, cleared again on uncheck.
          restockNote:
            checkedOff && line.foodId
              ? `+${line.quantity} ${line.unit} → pantry`
              : null,
        };
      }),
    );
  }

  function addManualLine(input: {
    displayText: string;
    quantity: number;
    unit: string;
  }) {
    setLines((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        foodId: null,
        displayText: input.displayText,
        quantity: input.quantity,
        unit: input.unit,
        source: "manual",
        checkedOff: false,
        location: null,
        restockNote: null,
      },
    ]);
  }

  function removeManualLine(id: string) {
    setLines((prev) => prev.filter((line) => line.id !== id));
  }

  function startGenerate() {
    const next = nextScenario(scenario);
    setPendingScenario(next);
    setPendingLines(buildAutoScenario(next, pantryItems));
  }

  function confirmGenerate() {
    if (!pendingScenario || pendingLines === null) return;
    setLines((prev) => [
      ...prev.filter((l) => l.source === "manual"),
      ...pendingLines,
    ]);
    setScenario(pendingScenario);
    setPendingScenario(null);
    setPendingLines(null);
  }

  function cancelGenerate() {
    setPendingScenario(null);
    setPendingLines(null);
  }

  const props: ShoppingListVariantProps = {
    lines,
    toggleCheck,
    addManualLine,
    removeManualLine,
    pendingScenario,
    pendingLines,
    startGenerate,
    confirmGenerate,
    cancelGenerate,
    scenarioLabel,
  };

  return (
    <>
      {variant === "A" && <VariantA {...props} />}
      {variant === "B" && <VariantB {...props} />}
      {variant === "C" && <VariantC {...props} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </>
  );
}
