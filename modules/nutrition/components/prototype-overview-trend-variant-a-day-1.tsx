/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Day view, visual-aid take 1 of 3 — a donut ring for the day's macro split
 * (gram-proportional, same palette as the stacked bars elsewhere) sitting
 * above an always-visible per-entry list; nothing is hidden behind hover
 * anymore. "Today" quick-jump take 2: a full-width banner above the nav row
 * ("Viewing a past day · Jump to today →"), shown only when the cursor isn't
 * on today — replaces the rejected corner pill. The card's top-right corner
 * is now a permanent "See in month view" action, mirroring month view's
 * "Open day view" but reversed.
 */

import {
  buildMockDayEntries,
  fullDateLabel,
  type DailyTotal,
} from "./prototype-overview-shared";
import {
  MACRO_COLORS,
  MACRO_HEX,
  formatCalories,
  formatGrams,
} from "./prototype-overview-marks";

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
  const index = daily.findIndex((d) => d.date === cursor);
  const day = daily[index] ?? daily[daily.length - 1];
  const entries = buildMockDayEntries(day);
  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < daily.length - 1;

  const proteinG = day.proteinG ?? 0;
  const carbsG = day.carbsG ?? 0;
  const fatG = day.fatG ?? 0;
  const total = proteinG + carbsG + fatG;
  const proteinPct = total > 0 ? (proteinG / total) * 100 : 0;
  const carbsPct = total > 0 ? (carbsG / total) * 100 : 0;

  return (
    <div className="relative rounded-xl border border-border p-4">
      <button
        type="button"
        onClick={() => onSeeInMonthView(day.date)}
        className="absolute right-4 top-4 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
      >
        See in month view →
      </button>

      {cursor !== todayDate ? (
        <button
          type="button"
          onClick={onJumpToday}
          className="mb-3 flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground hover:bg-muted/70"
        >
          <span>Viewing a past day</span>
          <span className="font-medium text-primary">Jump to today →</span>
        </button>
      ) : null}

      <div className="mb-4 flex items-center justify-between pr-40">
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
        <button
          type="button"
          onClick={() => onNavigate(1)}
          disabled={!canGoForward}
          aria-label="Next day"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          →
        </button>
      </div>

      {day.calories === null ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Not logged — no meals recorded this day.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-5">
            <div
              className="relative size-24 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(${MACRO_HEX.protein} 0% ${proteinPct}%, ${MACRO_HEX.carbs} ${proteinPct}% ${proteinPct + carbsPct}%, ${MACRO_HEX.fat} ${proteinPct + carbsPct}% 100%)`,
              }}
            >
              <div className="absolute inset-2.5 flex flex-col items-center justify-center rounded-full bg-card">
                <span className="text-base font-bold tabular-nums">
                  {formatCalories(day.calories)}
                </span>
              </div>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${MACRO_COLORS.protein}`}
                  aria-hidden
                />
                Protein · {formatGrams(day.proteinG)}
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${MACRO_COLORS.carbs}`}
                  aria-hidden
                />
                Carbs · {formatGrams(day.carbsG)}
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${MACRO_COLORS.fat}`}
                  aria-hidden
                />
                Fat · {formatGrams(day.fatG)}
              </li>
            </ul>
          </div>

          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border p-2.5 text-sm"
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
