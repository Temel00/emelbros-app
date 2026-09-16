/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Day view, hover-visual take 1 of 2 — the donut ring is gone. Instead, a
 * full-width calories bar and a full-width macro stacked bar sit above the
 * entry list, and hovering (or focusing) a food card highlights the exact
 * sub-region of each bar that entry contributes: a bracketed, lightly
 * washed overlay positioned at that entry's cumulative offset within the
 * bar (calories: offset among all entries by calories; macros: offset
 * within that macro's own colored segment by that entry's grams of it).
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

function HighlightOverlay({
  startPct,
  widthPct,
}: {
  startPct: number;
  widthPct: number;
}) {
  if (widthPct <= 0) return null;
  return (
    <div
      className="pointer-events-none absolute -inset-y-[3px] z-10 rounded-[2px] border-x-2 border-foreground bg-foreground/10"
      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
      aria-hidden
    />
  );
}

export function TrendVariantADay1({
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

  function withinSegment(
    seg: { startPct: number; widthPct: number },
    local: { startPct: number; widthPct: number },
  ) {
    return {
      startPct: seg.startPct + (local.startPct / 100) * seg.widthPct,
      widthPct: (local.widthPct / 100) * seg.widthPct,
    };
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
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums">
                  {formatCalories(day.calories)}
                </span>
                {hovered ? (
                  <span className="text-xs text-muted-foreground">
                    {hovered.title}:{" "}
                    <span className="font-medium text-foreground">
                      {formatCalories(hovered.calories)}
                    </span>
                  </span>
                ) : null}
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary">
                {hoveredIndex >= 0 ? (
                  <HighlightOverlay
                    startPct={calorieOffsets[hoveredIndex].startPct}
                    widthPct={calorieOffsets[hoveredIndex].widthPct}
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
              <div className="relative flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
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
                    <HighlightOverlay
                      {...withinSegment(
                        macroSegs[0],
                        proteinOffsets[hoveredIndex],
                      )}
                    />
                    <HighlightOverlay
                      {...withinSegment(
                        macroSegs[1],
                        carbsOffsets[hoveredIndex],
                      )}
                    />
                    <HighlightOverlay
                      {...withinSegment(macroSegs[2], fatOffsets[hoveredIndex])}
                    />
                  </>
                ) : null}
              </div>
              {hovered ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {hovered.title} contributes P {formatGrams(hovered.proteinG)}{" "}
                  · C {formatGrams(hovered.carbsG)} · F{" "}
                  {formatGrams(hovered.fatG)}
                </span>
              ) : null}
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
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span
                        className={`size-1.5 rounded-full ${MACRO_COLORS.protein}`}
                        aria-hidden
                      />
                      {formatGrams(entry.proteinG)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className={`size-1.5 rounded-full ${MACRO_COLORS.carbs}`}
                        aria-hidden
                      />
                      {formatGrams(entry.carbsG)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className={`size-1.5 rounded-full ${MACRO_COLORS.fat}`}
                        aria-hidden
                      />
                      {formatGrams(entry.fatG)}
                    </span>
                  </span>
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
