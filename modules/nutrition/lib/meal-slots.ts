/**
 * The meal-slot registry (docs/modules/nutrition.md §3.4, §10) — a
 * code-side extension point, the same shape `locations.ts` uses for the
 * pantry. Adding a `brunch` slot is appending an entry here, never a
 * migration.
 */
export type MealSlot = {
  /** Stored verbatim on `nutrition_meal_plan_entry.meal_slot`. */
  key: string;
  label: string;
  /** Lucide icon name, resolved by `resolveIcon` (falls back if unknown). */
  icon: string;
};

const MEAL_SLOTS: MealSlot[] = [
  { key: "breakfast", label: "Breakfast", icon: "Coffee" },
  { key: "lunch", label: "Lunch", icon: "Sandwich" },
  { key: "dinner", label: "Dinner", icon: "UtensilsCrossed" },
  { key: "snack", label: "Snack", icon: "Apple" },
];

/**
 * Default rendering for a stored `meal_slot` that isn't (or is no longer)
 * in the registry — slots are additive and forgiving, never a reason to
 * error. Keeps the stored key so the row still round-trips on edit.
 */
function fallbackMealSlot(key: string): MealSlot {
  return { key, label: "Other", icon: "UtensilsCrossed" };
}

export function mealSlots(): MealSlot[] {
  return MEAL_SLOTS;
}

export function getMealSlot(key: string): MealSlot {
  return MEAL_SLOTS.find((slot) => slot.key === key) ?? fallbackMealSlot(key);
}

/** The slot a newly planned entry lands in unless the member picks another. */
export const DEFAULT_MEAL_SLOT = MEAL_SLOTS[0].key;
