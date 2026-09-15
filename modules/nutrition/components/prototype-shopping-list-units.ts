/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #119 resolves.
 *
 * Invented for this prototype. Today `nutrition_food.unit` and
 * `nutrition_pantry_item.unit` are free-text columns (just a not-blank
 * check — see 20260908000000_nutrition_tables.sql) and the real Inventory
 * add-item form (add-pantry-item-form.tsx) takes unit as a plain text
 * input. This file mocks the "finite unit list carried over from
 * Inventory" idea the owner reacted to on Variant E, so quantity/unit
 * phrasing is predictable everywhere it's shown — the row text, the edit
 * dialog, the Generate diff, and the CSV export all call the same
 * `formatQuantityUnit`. Adopting this for real would mean constraining the
 * schema and rebuilding the Inventory unit input as a picker — out of
 * scope for this UI-only prototype.
 */

export type PantryUnit = {
  key: string;
  /** Shown in the unit dropdown. */
  label: string;
  /** "" for units that read naturally with no word at all (e.g. "each"). */
  singular: string;
  plural: string;
};

export const DEFAULT_PANTRY_UNIT_KEY = "each";

export const PANTRY_UNITS: PantryUnit[] = [
  { key: "each", label: "Each", singular: "", plural: "" },
  { key: "roll", label: "Roll", singular: "roll", plural: "rolls" },
  { key: "pack", label: "Pack", singular: "pack", plural: "packs" },
  { key: "box", label: "Box", singular: "box", plural: "boxes" },
  { key: "bag", label: "Bag", singular: "bag", plural: "bags" },
  { key: "bottle", label: "Bottle", singular: "bottle", plural: "bottles" },
  { key: "can", label: "Can", singular: "can", plural: "cans" },
  { key: "jar", label: "Jar", singular: "jar", plural: "jars" },
  { key: "carton", label: "Carton", singular: "carton", plural: "cartons" },
  { key: "lb", label: "Pound (lb)", singular: "lb", plural: "lb" },
  { key: "oz", label: "Ounce (oz)", singular: "oz", plural: "oz" },
  { key: "g", label: "Gram (g)", singular: "g", plural: "g" },
  { key: "kg", label: "Kilogram (kg)", singular: "kg", plural: "kg" },
  { key: "l", label: "Liter (L)", singular: "L", plural: "L" },
  { key: "ml", label: "Milliliter (mL)", singular: "mL", plural: "mL" },
];

/**
 * Falls back to echoing the raw key for any unit string already sitting in
 * the real (unconstrained) `unit` columns that isn't one of this
 * prototype's invented canonical units — mirrors `getPantryLocation`'s
 * fallback for unknown location keys.
 */
export function getPantryUnit(key: string): PantryUnit {
  return (
    PANTRY_UNITS.find((u) => u.key === key) ?? {
      key,
      label: key,
      singular: key,
      plural: key,
    }
  );
}

export function isCanonicalPantryUnit(key: string): boolean {
  return PANTRY_UNITS.some((u) => u.key === key);
}

/** The unit word alone, pluralized for the given quantity — "" for units
 * (like "each") that read naturally with no word at all. */
export function unitLabel(key: string, quantity: number): string {
  const unit = getPantryUnit(key);
  return quantity === 1 ? unit.singular : unit.plural;
}

/** The predictable "2 rolls" / "1 pack" / "3" phrasing shared by the row
 * text, the Generate diff, the stock readout, and the CSV export. */
export function formatQuantityUnit(quantity: number, key: string): string {
  const label = unitLabel(key, quantity);
  return label ? `${quantity} ${label}` : `${quantity}`;
}
