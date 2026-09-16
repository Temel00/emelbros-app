/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Day view, hover-visual take 2 of 2 — the calories gauge and mini macro
 * bars are gone. Same full-width calories/macro bars as the other hover
 * variant, but the hover treatment itself is a leader line rather than a
 * highlighted region: hovering (or focusing) a food card drops a thin tick
 * line at that entry's midpoint on each bar, with a small floating label
 * above showing exactly how much of that bar it accounts for.
 *
 * "Today" quick-jump take 3 carries over unchanged: a full-width snackbar
 * docked to the bottom edge of the card.
 */

import { useState } from "react";

import {
  buildMockDayEntries,
  fullDateLabel,
  type DailyTotal,
} from "./prototype-overview-shared";
import {
  MACRO_COLORS,
  formatCalories,
  formatGrams,
  segmentOffsets,
} from "./prototype-overview-marks";

function LeaderLine({
  centerPct,
  label,
}: {
  centerPct: number;
  label: string;
}) {
  return (
    <div
      className="pointer-events-none absolute -top-6 z-10 flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${centerPct}%` }}
      aria-hidden
    >
      <span className="whitespace-nowrap rounded-sm bg-foreground px-1 py-0.5 text-[10px] font-medium leading-none text-background shadow-sm">
        {label}
      </span>
      <span className="h-2 w-px bg-foreground/70" />
    </div>
  );
}

export function TrendVariantADay3({
  daily,
  cursor,
  todayDate,
  onNavigate,
  onJumpToday,
  onSeeInMonthView,
}: {
  daily: DailyTotal[];
  cursor: string;
  todayDate: string;
  onNavigate: (delta: number) => void;
  onJumpToday: () => void;
  onSeeInMonthView: (date: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const index = daily.findIndex((d) => d.date === cursor);
  const day = daily[index] ?? daily[daily.length - 1];
  const entries = buildMockDayEntries(day);
  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < daily.length - 1;

  const proteinG = day.proteinG ?? 0;
  const carbsG = day.carbsG ?? 0;
  const fatG = day.fatG ?? 0;
  const macroSegs = segmentOffsets([proteinG, carbsG, fatG]);

  const hoveredIndex = entries.findIndex((e) => e.id === hoveredId);
  const hovered = hoveredIndex >= 0 ? entries[hoveredIndex] : null;

  const calorieOffsets = segmentOffsets(entries.map((e) => e.calories));
  const proteinOffsets = segmentOffsets(entries.map((e) => e.proteinG));
  const carbsOffsets = segmentOffsets(entries.map((e) => e.carbsG));
  const fatOffsets = segmentOffsets(entries.map((e) => e.fatG));

  function centerOf(
    seg: { startPct: number; widthPct: number },
    local: { startPct: number; widthPct: number },
  ) {
    return (
      seg.startPct +
      ((local.startPct + local.widthPct / 2) / 100) * seg.widthPct
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="p-4 pb-0">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate(-1)}
            disabled={!canGoBack}
            aria-label="Previous day"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            ←
          </button>
          <h3 className="text-sm font-medium text-foreground">
            {fullDateLabel(day.date)}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNavigate(1)}
              disabled={!canGoForward}
              aria-label="Next day"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => onSeeInMonthView(day.date)}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              See in month view →
            </button>
          </div>
        </div>

        {day.calories === null ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Not logged — no meals recorded this day.
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <span className="mb-1.5 block text-2xl font-bold tabular-nums">
                {formatCalories(day.calories)}
              </span>
              <div className="relative mt-6 h-3 w-full overflow-hidden rounded-full bg-primary">
                {hoveredIndex >= 0 ? (
                  <LeaderLine
                    centerPct={
                      calorieOffsets[hoveredIndex].startPct +
                      calorieOffsets[hoveredIndex].widthPct / 2
                    }
                    label={formatCalories(hovered!.calories)}
                  />
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-baseline justify-between text-xs text-muted-foreground">
                <span>Macros</span>
                <span>
                  P {formatGrams(day.proteinG)} · C {formatGrams(day.carbsG)} ·
                  F {formatGrams(day.fatG)}
                </span>
              </div>
              <div className="relative mt-6 flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
                <div
                  className={`h-full ${MACRO_COLORS.protein}`}
                  style={{ width: `${macroSegs[0].widthPct}%` }}
                />
                <div
                  className={`h-full ${MACRO_COLORS.carbs}`}
                  style={{ width: `${macroSegs[1].widthPct}%` }}
                />
                <div
                  className={`h-full ${MACRO_COLORS.fat}`}
                  style={{ width: `${macroSegs[2].widthPct}%` }}
                />
                {hoveredIndex >= 0 ? (
                  <>
                    <LeaderLine
                      centerPct={centerOf(
                        macroSegs[0],
                        proteinOffsets[hoveredIndex],
                      )}
                      label={`P ${formatGrams(hovered!.proteinG)}`}
                    />
                    <LeaderLine
                      centerPct={centerOf(
                        macroSegs[1],
                        carbsOffsets[hoveredIndex],
                      )}
                      label={`C ${formatGrams(hovered!.carbsG)}`}
                    />
                    <LeaderLine
                      centerPct={centerOf(
                        macroSegs[2],
                        fatOffsets[hoveredIndex],
                      )}
                      label={`F ${formatGrams(hovered!.fatG)}`}
                    />
                  </>
                ) : null}
              </div>
            </div>

            <ul className="space-y-1.5">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredId(entry.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(entry.id)}
                  onBlur={() => setHoveredId(null)}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm outline-none transition-colors ${
                    hoveredId === entry.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                  <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                    {formatCalories(entry.calories)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {cursor !== todayDate ? (
        <button
          type="button"
          onClick={onJumpToday}
          className="mt-4 flex w-full items-center justify-between bg-foreground/5 px-4 py-2 text-xs text-muted-foreground hover:bg-foreground/10"
        >
          <span>Viewing {fullDateLabel(day.date)}</span>
          <span className="font-medium text-primary">Jump to today →</span>
        </button>
      ) : null}
    </div>
  );
}
