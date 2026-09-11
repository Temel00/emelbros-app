import { resolveIcon } from "@/lib/icon";
import type { MealSlot } from "@/modules/nutrition/lib/meal-slots";

// A plain (non-component) helper, so `resolveIcon`'s dynamic lookup doesn't
// read as "component created during render" the way calling it directly
// inside a row component would (react-hooks/static-components) — same
// pattern as pantry's `locationIcon`.
export function mealSlotIcon(slot: MealSlot, className: string) {
  const Icon = resolveIcon(slot.icon);
  return <Icon className={className} aria-hidden />;
}

/**
 * A per-slot colour dot so a week grid or month peek reads at a glance
 * (nutrition.md §3.4) without relying on the icon alone — mirrors the
 * settled prototype's `SLOT_DOT` map. Falls back for a slot key no longer
 * in the registry, same forgiving spirit as `getMealSlot`'s own fallback.
 */
const SLOT_DOT_COLOR: Record<string, string> = {
  breakfast: "bg-amber-500",
  lunch: "bg-sky-500",
  dinner: "bg-violet-500",
  snack: "bg-emerald-500",
};

export function mealSlotDotClass(slotKey: string): string {
  return SLOT_DOT_COLOR[slotKey] ?? "bg-muted-foreground";
}
