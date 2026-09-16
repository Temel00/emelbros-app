/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Variant B — "Small multiples": one mini chart per measure (Calories,
 * Protein, Carbs, Fat), each on its own axis in its own tile. Dataviz
 * skill's one-axis rule taken furthest here — no measure ever shares a
 * scale with another, so this is the variant to react to if "macros
 * stacked together" reads as too busy in Variant A.
 */

import {
  Bar,
  formatCalories,
  formatGrams,
  shortDateLabel,
} from "./prototype-overview-marks";
import type {
  DailyTotal,
  MonthlyTotal,
  WeeklyTotal,
} from "./prototype-overview-shared";

type Row = DailyTotal | WeeklyTotal | MonthlyTotal;

function rowLabel(row: Row): string {
  if ("date" in row) return shortDateLabel(row.date);
  if ("weekStart" in row) return `w/o ${shortDateLabel(row.weekStart)}`;
  return new Date(`${row.monthStart}T00:00:00.000Z`).toLocaleDateString(
    undefined,
    {
      month: "short",
      timeZone: "UTC",
    },
  );
}

function Tile({
  title,
  rows,
  pick,
  format,
  colorClassName,
}: {
  title: string;
  rows: Row[];
  pick: (row: Row) => number | null;
  format: (value: number | null) => string;
  colorClassName: string;
}) {
  const values = rows.map(pick);
  const max = Math.max(1, ...values.map((v) => v ?? 0));
  const latest = values[values.length - 1] ?? null;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{format(latest)}</span>
      </div>
      <div className="flex h-16 items-end gap-1">
        {rows.map((row, i) => (
          <Bar
            key={i}
            value={pick(row)}
            max={max}
            heightPx={64}
            colorClassName={colorClassName}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{rowLabel(rows[0])}</span>
        <span>{rowLabel(rows[rows.length - 1])}</span>
      </div>
    </div>
  );
}

export function TrendVariantB({ rows }: { rows: Row[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Tile
        title="Calories"
        rows={rows}
        pick={(r) => r.calories}
        format={formatCalories}
        colorClassName="bg-primary"
      />
      <Tile
        title="Protein"
        rows={rows}
        pick={(r) => r.proteinG}
        format={formatGrams}
        colorClassName="bg-blue-500"
      />
      <Tile
        title="Carbs"
        rows={rows}
        pick={(r) => r.carbsG}
        format={formatGrams}
        colorClassName="bg-amber-600"
      />
      <Tile
        title="Fat"
        rows={rows}
        pick={(r) => r.fatG}
        format={formatGrams}
        colorClassName="bg-violet-500"
      />
    </div>
  );
}
