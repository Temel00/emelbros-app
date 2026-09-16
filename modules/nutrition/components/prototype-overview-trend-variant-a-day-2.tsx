"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Day view — LOCKED IN as the sole day-view layout per live feedback.
 * Calories + each macro gets its own horizontal goal-progress bar (fill vs.
 * DEFAULT_GOALS, with a distinct treatment once the fill passes the goal
 * tick) instead of a donut.
 *
 * Hovering (or focusing) a food card now brackets the exact sub-region of
 * each goal bar's fill that entry contributes (offset within that bar's own
 * value, via `segmentOffsets`), while the rest of that bar's fill recedes
 * behind a muted-track wash so the highlighted slice reads clearly. The
 * bracket and wash are always mounted and only animate opacity/position, so
 * moving between entries slides smoothly instead of snapping.
 *
 * "Today" quick-jump: a double-chevron icon button docked right next to the
 * forward-nav arrow. The per-entry macro readout uses a colored-dot legend
 * recolored to match the goal bars above. The card's top-right corner is a
 * permanent "See in month view" action.
 */

import { useState } from "react";

import {
  buildMockDayEntries,
  fullDateLabel,
  DEFAULT_GOALS,
  type DailyTotal,
} from "./prototype-overview-shared";
import {
  MACRO_COLORS,
  formatCalories,
  formatGrams,
  segmentOffsets,
} from "./prototype-overview-marks";

function GoalBar({
  label,
  value,
  goal,
  fillClassName,
  format,
  entryValues,
  hoveredIndex,
}: {
  label: string;
  value: number | null;
  goal: number;
  fillClassName: string;
  format: (v: number | null) => string;
  entryValues: number[];
  hoveredIndex: number;
}) {
  const v = value ?? 0;
  const barMax = Math.max(v, goal) * 1.1;
  const fillPct = barMax > 0 ? Math.min((v / barMax) * 100, 100) : 0;
  const goalPct = barMax > 0 ? (goal / barMax) * 100 : 0;
  const overGoal = v > goal;

  const offsets = segmentOffsets(entryValues);
  const local =
    hoveredIndex >= 0
      ? (offsets[hoveredIndex] ?? { startPct: 0, widthPct: 0 })
      : { startPct: 0, widthPct: 0 };
  const highlightStartPct = (local.startPct / 100) * fillPct;
  const highlightWidthPct = (local.widthPct / 100) * fillPct;
  const active = hoveredIndex >= 0 && highlightWidthPct > 0;

  const dimBeforeWidth = active ? highlightStartPct : 0;
  const dimAfterStart = active
    ? highlightStartPct + highlightWidthPct
    : fillPct;
  const dimAfterWidth = active ? Math.max(fillPct - dimAfterStart, 0) : 0;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {format(value)}{" "}
          <span className="text-muted-foreground">/ {format(goal)}</span>
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${fillClassName} ${overGoal ? "ring-2 ring-offset-1 ring-offset-card" : ""}`}
          style={{ width: `${fillPct}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 rounded-full bg-muted/75 transition-all duration-200 ease-out"
          style={{ width: `${dimBeforeWidth}%` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 z-10 rounded-full bg-muted/75 transition-all duration-200 ease-out"
          style={{ left: `${dimAfterStart}%`, width: `${dimAfterWidth}%` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -inset-y-[3px] z-20 rounded-[2px] border-x-2 border-foreground bg-foreground/10 transition-all duration-200 ease-out"
          style={{
            left: `${highlightStartPct}%`,
            width: `${highlightWidthPct}%`,
            opacity: active ? 1 : 0,
          }}
          aria-hidden
        />
        <div
          className="absolute top-0 h-full w-px bg-foreground/50"
          style={{ left: `${goalPct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function TrendVariantADay2({
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
  const hoveredIndex = entries.findIndex((e) => e.id === hoveredId);

  return (
    <div className="relative rounded-xl border border-border p-4">
      <button
        type="button"
        onClick={() => onSeeInMonthView(day.date)}
        className="absolute right-4 top-4 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
      >
        See in month view →
      </button>

      <div className="mb-4 flex items-center justify-between pr-36">
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
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onNavigate(1)}
            disabled={!canGoForward}
            aria-label="Next day"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            →
          </button>
          {cursor !== todayDate ? (
            <button
              type="button"
              onClick={onJumpToday}
              aria-label="Skip to today"
              title="Skip to today"
              className="rounded-full p-1.5 text-primary hover:bg-primary/10"
            >
              ⇥
            </button>
          ) : null}
        </div>
      </div>

      {day.calories === null ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Not logged — no meals recorded this day.
        </div>
      ) : (
        <div className="space-y-5 pb-10">
          <div className="space-y-3">
            <GoalBar
              label="Calories"
              value={day.calories}
              goal={DEFAULT_GOALS.calories!}
              fillClassName="bg-primary"
              format={formatCalories}
              entryValues={entries.map((e) => e.calories)}
              hoveredIndex={hoveredIndex}
            />
            <GoalBar
              label="Protein"
              value={day.proteinG}
              goal={DEFAULT_GOALS.proteinG!}
              fillClassName={MACRO_COLORS.protein}
              format={formatGrams}
              entryValues={entries.map((e) => e.proteinG)}
              hoveredIndex={hoveredIndex}
            />
            <GoalBar
              label="Carbs"
              value={day.carbsG}
              goal={DEFAULT_GOALS.carbsG!}
              fillClassName={MACRO_COLORS.carbs}
              format={formatGrams}
              entryValues={entries.map((e) => e.carbsG)}
              hoveredIndex={hoveredIndex}
            />
            <GoalBar
              label="Fat"
              value={day.fatG}
              goal={DEFAULT_GOALS.fatG!}
              fillClassName={MACRO_COLORS.fat}
              format={formatGrams}
              entryValues={entries.map((e) => e.fatG)}
              hoveredIndex={hoveredIndex}
            />
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
                className={`rounded-lg border p-2.5 text-sm outline-none transition-colors ${
                  hoveredId === entry.id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{entry.title}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCalories(entry.calories)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
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
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
