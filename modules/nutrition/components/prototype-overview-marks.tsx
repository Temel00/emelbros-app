/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Small shared chart marks (dataviz skill: thin marks, 4px rounded
 * data-ends anchored to the baseline, 2px gaps between stacked fills, a
 * dashed placeholder — never a zero-height bar — for "not logged" so an
 * empty day doesn't read as "ate nothing"). This is a mark, not a layout —
 * each trend-view variant still owns its own chart layout and composition
 * (UI.md: a shared `<Header>` is fine, a shared `<Layout>` isn't).
 *
 * Macro palette validated via the dataviz skill's validator
 * (protein/carbs/fat, all checks PASS, `--mode light`):
 * `node scripts/validate_palette.js "#3b82f6,#d97706,#8b5cf6"`.
 */

export const MACRO_COLORS = {
  protein: "bg-blue-500",
  carbs: "bg-amber-600",
  fat: "bg-violet-500",
} as const;

/** Hex equivalents of MACRO_COLORS, for inline styles (gradients, SVG) that can't take a Tailwind class. */
export const MACRO_HEX = {
  protein: "#3b82f6",
  carbs: "#d97706",
  fat: "#8b5cf6",
} as const;

export const MACRO_TEXT_COLORS = {
  protein: "text-blue-600 dark:text-blue-400",
  carbs: "text-amber-700 dark:text-amber-500",
  fat: "text-violet-600 dark:text-violet-400",
} as const;

function NotLoggedBar() {
  return (
    <div
      className="w-full rounded-t-[4px] border border-dashed border-border"
      style={{ height: 6 }}
      aria-label="Not logged"
    />
  );
}

/** A single-series bar (calories) — sequential, one hue, no legend needed. */
export function Bar({
  value,
  max,
  heightPx = 88,
  colorClassName = "bg-primary",
}: {
  value: number | null;
  max: number;
  heightPx?: number;
  colorClassName?: string;
}) {
  if (value === null) return <NotLoggedBar />;
  const pct = max > 0 ? Math.max(value / max, 0.04) : 0.04;
  return (
    <div
      className={`w-full rounded-t-[4px] ${colorClassName}`}
      style={{ height: Math.round(pct * heightPx) }}
    />
  );
}

/** A 3-segment stacked bar (protein/carbs/fat) with a 2px gap between fills. */
export function MacroStackedBar({
  proteinG,
  carbsG,
  fatG,
  maxG,
  heightPx = 88,
}: {
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  maxG: number;
  heightPx?: number;
}) {
  if (proteinG === null && carbsG === null && fatG === null) {
    return <NotLoggedBar />;
  }

  const segments = [
    { value: proteinG ?? 0, className: MACRO_COLORS.protein },
    { value: carbsG ?? 0, className: MACRO_COLORS.carbs },
    { value: fatG ?? 0, className: MACRO_COLORS.fat },
  ].filter((s) => s.value > 0);

  return (
    <div
      className="flex w-full flex-col-reverse gap-[2px]"
      style={{ height: heightPx }}
    >
      {segments.map((seg, i) => (
        <div
          key={i}
          className={`w-full ${seg.className} ${
            i === segments.length - 1 ? "rounded-t-[4px]" : ""
          }`}
          style={{
            height: Math.max(2, Math.round((seg.value / maxG) * heightPx)),
          }}
        />
      ))}
    </div>
  );
}

export function MacroLegend({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 text-xs text-muted-foreground ${className}`}
    >
      <span className="flex items-center gap-1">
        <span
          className={`size-2 rounded-full ${MACRO_COLORS.protein}`}
          aria-hidden
        />
        Protein
      </span>
      <span className="flex items-center gap-1">
        <span
          className={`size-2 rounded-full ${MACRO_COLORS.carbs}`}
          aria-hidden
        />
        Carbs
      </span>
      <span className="flex items-center gap-1">
        <span
          className={`size-2 rounded-full ${MACRO_COLORS.fat}`}
          aria-hidden
        />
        Fat
      </span>
    </div>
  );
}

export function formatCalories(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString()} kcal`;
}

export function formatGrams(value: number | null): string {
  return value === null ? "—" : `${value}g`;
}

/**
 * Cumulative start/width percentages for a list of values stacked in order
 * (e.g. each food entry's slice of a shared totals bar) — shared by the day
 * view's hover-on-food-card variants so both can position a highlight/line
 * over the same entry's contribution without recomputing the offsets twice.
 */
export function segmentOffsets(
  values: number[],
): { startPct: number; widthPct: number }[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => ({ startPct: 0, widthPct: 0 }));
  let cursor = 0;
  return values.map((value) => {
    const widthPct = (value / total) * 100;
    const startPct = cursor;
    cursor += widthPct;
    return { startPct, widthPct };
  });
}

export function shortDateLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
