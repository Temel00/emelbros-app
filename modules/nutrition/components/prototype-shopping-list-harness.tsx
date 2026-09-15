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
  shortageHint,
  type GenerationScenario,
  type ShoppingLine,
  type ShortageHint,
} from "@/modules/nutrition/components/prototype-shopping-list-shared";
import { formatQuantityUnit } from "@/modules/nutrition/components/prototype-shopping-list-units";
import { VariantA } from "@/modules/nutrition/components/prototype-shopping-list-variant-a";
import { VariantB } from "@/modules/nutrition/components/prototype-shopping-list-variant-b";
import { VariantC } from "@/modules/nutrition/components/prototype-shopping-list-variant-c";
import { VariantD } from "@/modules/nutrition/components/prototype-shopping-list-variant-d";
import { VariantE } from "@/modules/nutrition/components/prototype-shopping-list-variant-e";
import { VariantF } from "@/modules/nutrition/components/prototype-shopping-list-variant-f";
import type { PantryItemWithFood } from "@/modules/nutrition/queries";

const VARIANTS = [
  { key: "A", name: "Two lists, stacked" },
  { key: "B", name: "Grouped by location" },
  { key: "C", name: "Spreadsheet, one table" },
  { key: "D", name: "B + inline edit, banner nudge" },
  { key: "E", name: "B + edit dialog, badge nudge" },
  { key: "F", name: "B + stepper, per-group nudge" },
];

export type LineEdit = Partial<
  Pick<ShoppingLine, "displayText" | "quantity" | "unit">
>;

export type ShoppingListVariantProps = {
  lines: ShoppingLine[];
  pantryItems: PantryItemWithFood[];
  toggleCheck: (id: string) => void;
  addManualLine: (input: {
    displayText: string;
    quantity: number;
    unit: string;
  }) => void;
  removeManualLine: (id: string) => void;
  updateLine: (id: string, patch: LineEdit) => void;
  pendingScenario: GenerationScenario | null;
  pendingLines: ShoppingLine[] | null;
  startGenerate: () => void;
  confirmGenerate: () => void;
  cancelGenerate: () => void;
  scenarioLabel: typeof scenarioLabel;
  shortageHint: ShortageHint | null;
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
  const [pendingLines, setPendingLines] = useState<ShoppingLine[] | null>(null);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

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
              ? `+${formatQuantityUnit(line.quantity, line.unit)} → pantry`
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

  function updateLine(id: string, patch: LineEdit) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
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
    setHasGeneratedOnce(true);
  }

  function cancelGenerate() {
    setPendingScenario(null);
    setPendingLines(null);
  }

  const props: ShoppingListVariantProps = {
    lines,
    pantryItems,
    toggleCheck,
    addManualLine,
    removeManualLine,
    updateLine,
    pendingScenario,
    pendingLines,
    startGenerate,
    confirmGenerate,
    cancelGenerate,
    scenarioLabel,
    shortageHint: shortageHint(hasGeneratedOnce),
  };

  return (
    <>
      {variant === "A" && <VariantA {...props} />}
      {variant === "B" && <VariantB {...props} />}
      {variant === "C" && <VariantC {...props} />}
      {variant === "D" && <VariantD {...props} />}
      {variant === "E" && <VariantE {...props} />}
      {variant === "F" && <VariantF {...props} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </>
  );
}
