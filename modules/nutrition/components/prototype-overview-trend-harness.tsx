"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Owns range (day/week/month) and data-scenario (established/week-one/
 * day-one) state, reads `?variant=` for layout, and renders the chosen
 * trend-view variant plus the floating switcher.
 */

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PrototypeSwitcher,
  type PrototypeVariant,
} from "@/components/prototype/prototype-switcher";
import {
  SCENARIOS,
  buildMockOverview,
  type OverviewRange,
  type OverviewScenario,
} from "./prototype-overview-shared";
import { TrendVariantA } from "./prototype-overview-trend-variant-a";
import { TrendVariantB } from "./prototype-overview-trend-variant-b";
import { TrendVariantC } from "./prototype-overview-trend-variant-c";

const VARIANTS: PrototypeVariant[] = [
  { key: "a", name: "Calories + macro stack" },
  { key: "b", name: "Small multiples" },
  { key: "c", name: "Table-first" },
];

const RANGES: { key: OverviewRange; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export function OverviewTrendHarness() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "a";

  const [range, setRange] = useState<OverviewRange>("day");
  const [scenario, setScenario] = useState<OverviewScenario>("established");

  const overview = useMemo(() => buildMockOverview(scenario), [scenario]);
  const rows =
    range === "day"
      ? overview.daily
      : range === "week"
        ? overview.weekly
        : overview.monthly;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1 text-sm ${
                range === r.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg border border-border p-1">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScenario(s.key)}
              className={`rounded-md px-3 py-1 text-xs ${
                scenario === s.key
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {variant === "b" ? (
        <TrendVariantB rows={rows} />
      ) : variant === "c" ? (
        <TrendVariantC rows={rows} />
      ) : (
        <TrendVariantA rows={rows} />
      )}

      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </div>
  );
}
