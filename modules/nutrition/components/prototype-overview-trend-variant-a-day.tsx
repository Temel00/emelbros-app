/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Day view — detail for a single day, not a bar chart: which foods
 * contributed which nutrients, with each entry's macro split revealed on
 * hover. Carousel arrows around the date move one day at a time through
 * the mock history, bounded by the available mock range.
 */

import {
  buildMockDayEntries,
  type DailyTotal,
} from "./prototype-overview-shared";
import {
  MACRO_COLORS,
  formatCalories,
  formatGrams,
} from "./prototype-overview-marks";

function fullDateLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function TrendVariantADay({
  daily,
  cursor,
  onNavigate,
}: {
  daily: DailyTotal[];
  cursor: string;
  onNavigate: (delta: number) => void;
}) {
  const index = daily.findIndex((d) => d.date === cursor);
  const day = daily[index] ?? daily[daily.length - 1];
  const entries = buildMockDayEntries(day);
  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < daily.length - 1;

  return (
    <div className="rounded-xl border border-border p-4">
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
        <div className="space-y-4">
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-bold tabular-nums">
              {formatCalories(day.calories)}
            </span>
            <span className="text-xs text-muted-foreground">
              P {formatGrams(day.proteinG)} · C {formatGrams(day.carbsG)} · F{" "}
              {formatGrams(day.fatG)}
            </span>
          </div>

          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="group rounded-lg border border-border p-2.5 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span>{entry.title}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCalories(entry.calories)}
                  </span>
                </div>
                <div className="mt-1.5 hidden items-center gap-3 text-xs text-muted-foreground group-hover:flex">
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
