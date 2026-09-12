/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #119 resolves.
 *
 * Mock shopping-list state for the three UI variants. Food names, units and
 * pantry locations are seeded from the real `nutrition_pantry_item` rows the
 * page fetches read-only, so the owner reacts to their own kitchen's data —
 * but the shopping-list *lines* (quantities, source, checked state) and the
 * "Generate" scenarios are invented in memory here. Nothing in this file
 * reads or writes `nutrition_shopping_list_item`.
 */
import type { PantryItemWithFood } from "@/modules/nutrition/queries";

export type ShoppingLineSource = "auto" | "manual";

export type ShoppingLine = {
  id: string;
  foodId: string | null;
  displayText: string;
  quantity: number;
  unit: string;
  source: ShoppingLineSource;
  checkedOff: boolean;
  /**
   * The pantry location this line's food currently lives in, or `null` when
   * there's no matching pantry row — true for most manual lines, and grounds
   * the "group by location" question in the real ambiguity: the shopping
   * list table itself has no location column (#118's schema).
   */
  location: string | null;
  /** Set once checked off — the restock note a real check-off silently
   * writes back to the pantry row (#118). Each variant surfaces it
   * differently. */
  restockNote: string | null;
};

export type GenerationScenario = "shortfall" | "revised" | "empty";

export const GENERATION_SCENARIOS: GenerationScenario[] = [
  "shortfall",
  "revised",
  "empty",
];

export function nextScenario(
  current: GenerationScenario,
): GenerationScenario {
  const i = GENERATION_SCENARIOS.indexOf(current);
  return GENERATION_SCENARIOS[(i + 1) % GENERATION_SCENARIOS.length];
}

export function scenarioLabel(scenario: GenerationScenario): string {
  switch (scenario) {
    case "shortfall":
      return "This week's plan";
    case "revised":
      return "Plan changed since last generate";
    case "empty":
      return "Pantry already covers the plan";
  }
}

let mockIdCounter = 1000;
function mockId() {
  mockIdCounter += 1;
  return `mock-${mockIdCounter}`;
}

const SHORTFALL_QUANTITIES = [2, 1, 3, 2];

export function buildSeedLines(
  pantryItems: PantryItemWithFood[],
): ShoppingLine[] {
  const withFood = pantryItems.filter((p) => p.food);
  const picks = withFood.slice(0, 3);

  const auto: ShoppingLine[] = picks.map((p, i) => {
    const quantity = SHORTFALL_QUANTITIES[i] ?? 1;
    return {
      id: mockId(),
      foodId: p.food_id,
      displayText: `${p.food.name}`,
      quantity,
      unit: p.unit,
      source: "auto",
      // The first line starts pre-checked so every variant shows what a
      // checked-off state looks like without requiring an interaction first.
      checkedOff: i === 0,
      location: p.location,
      restockNote: i === 0 ? `+${quantity} ${p.unit} → pantry` : null,
    };
  });

  const manual: ShoppingLine[] = [
    {
      id: mockId(),
      foodId: null,
      displayText: "Paper towels",
      quantity: 2,
      unit: "rolls",
      source: "manual",
      checkedOff: false,
      location: null,
      restockNote: null,
    },
    {
      id: mockId(),
      foodId: null,
      displayText: "Birthday candles",
      quantity: 1,
      unit: "pack",
      source: "manual",
      checkedOff: false,
      location: null,
      restockNote: null,
    },
  ];

  return [...auto, ...manual];
}

/**
 * Stands in for a real "Generate" call. Three canned scenarios, cycled one
 * per click (shortfall → revised → empty → shortfall …) so the owner can
 * react to a normal regenerate, a changed-plan regenerate, and an
 * empty-result regenerate without a real plan/pantry diff engine behind it.
 */
export function buildAutoScenario(
  scenario: GenerationScenario,
  pantryItems: PantryItemWithFood[],
): ShoppingLine[] {
  const withFood = pantryItems.filter((p) => p.food);
  if (withFood.length === 0 || scenario === "empty") return [];

  if (scenario === "shortfall") {
    return withFood.slice(0, 3).map((p, i) => {
      const quantity = SHORTFALL_QUANTITIES[i] ?? 1;
      return {
        id: mockId(),
        foodId: p.food_id,
        displayText: p.food.name,
        quantity,
        unit: p.unit,
        source: "auto" as const,
        checkedOff: false,
        location: p.location,
        restockNote: null,
      };
    });
  }

  // "revised": the plan changed since the last generate — drop the first
  // pick (pantry now covers it), bump a quantity, add one the plan didn't
  // need before.
  const picks = withFood.slice(1, 4);
  return picks.map((p, i) => {
    const quantity = (SHORTFALL_QUANTITIES[i] ?? 1) + 1;
    return {
      id: mockId(),
      foodId: p.food_id,
      displayText: p.food.name,
      quantity,
      unit: p.unit,
      source: "auto" as const,
      checkedOff: false,
      location: p.location,
      restockNote: null,
    };
  });
}

export type AutoLineDiff = {
  added: ShoppingLine[];
  removed: ShoppingLine[];
  changed: { previous: ShoppingLine; next: ShoppingLine }[];
  unchanged: ShoppingLine[];
};

/** Diffs the current auto lines against a pending scenario's result, keyed
 * by food (falling back to display text) so the preview can call out
 * exactly what a confirmed Generate would add, drop, or bump. */
export function diffAutoLines(
  current: ShoppingLine[],
  next: ShoppingLine[],
): AutoLineDiff {
  const key = (l: ShoppingLine) => l.foodId ?? l.displayText;
  const currentByKey = new Map(current.map((l) => [key(l), l]));
  const nextByKey = new Map(next.map((l) => [key(l), l]));

  const added = next.filter((l) => !currentByKey.has(key(l)));
  const removed = current.filter((l) => !nextByKey.has(key(l)));
  const changed: AutoLineDiff["changed"] = [];
  const unchanged: ShoppingLine[] = [];

  for (const l of next) {
    const previous = currentByKey.get(key(l));
    if (!previous) continue;
    if (previous.quantity !== l.quantity) changed.push({ previous, next: l });
    else unchanged.push(l);
  }

  return { added, removed, changed, unchanged };
}
