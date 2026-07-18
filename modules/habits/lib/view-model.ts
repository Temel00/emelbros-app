/**
 * View-model shaping for the habits module home (docs/modules/habits.md §7,
 * #38): splitting a member's trackables into scheduled habits vs unscheduled
 * metrics and deriving each one's due/streak/trend. Kept out of the route
 * (ADR-0003: routes are thin glue) so it's plain, tested logic like the rest
 * of `lib/`.
 */
import {
  computeStreak,
  isDueToday,
  toCadence,
  toISODate,
  type DayLog,
} from "@/modules/habits/lib/cadence";
import {
  getTrackableKind,
  type TrackableKind,
} from "@/modules/habits/lib/kinds";

export type TrackableRow = {
  id: string;
  title: string;
  kind: string;
  scope: string;
  archived_at: string | null;
  cadence_type: string | null;
  cadence_target: number | null;
  cadence_weekdays: number[] | null;
};

export type LogRow = {
  trackable_id: string;
  log_date: string;
  done: boolean;
  value: number | null;
};

export type HabitViewModel = {
  trackable: TrackableRow;
  kind: TrackableKind;
  streak: number;
  due: boolean;
  todayDone: boolean;
};

export type MetricViewModel = {
  trackable: TrackableRow;
  kind: TrackableKind;
  points: { date: string; value: number }[];
};

export function groupLogsByTrackable(logs: LogRow[]): Map<string, DayLog[]> {
  const byTrackable = new Map<string, DayLog[]>();
  for (const log of logs) {
    const list = byTrackable.get(log.trackable_id) ?? [];
    list.push({ date: log.log_date, done: log.done });
    byTrackable.set(log.trackable_id, list);
  }
  return byTrackable;
}

export function groupParticipantsByTrackable(
  rows: { trackable_id: string; member_id: string }[],
): Map<string, string[]> {
  const byTrackable = new Map<string, string[]>();
  for (const row of rows) {
    const list = byTrackable.get(row.trackable_id) ?? [];
    list.push(row.member_id);
    byTrackable.set(row.trackable_id, list);
  }
  return byTrackable;
}

export function buildHabitViewModels(
  trackables: TrackableRow[],
  logsByTrackable: Map<string, DayLog[]>,
  today: Date,
): HabitViewModel[] {
  const todayStr = toISODate(today);

  return trackables
    .map((trackable): HabitViewModel | null => {
      const kind = getTrackableKind(trackable.kind);
      if (!kind.scheduled) return null;

      const cadence = toCadence(trackable);
      const trackableLogs = logsByTrackable.get(trackable.id) ?? [];
      const todayDone =
        trackableLogs.find((log) => log.date === todayStr)?.done ?? false;

      return {
        trackable,
        kind,
        streak: cadence ? computeStreak(cadence, trackableLogs, today) : 0,
        due: cadence ? isDueToday(cadence, trackableLogs, today) : false,
        todayDone,
      };
    })
    .filter((h): h is HabitViewModel => h !== null);
}

export type HabitsWidgetSummary = {
  /** Habits scheduled for today that are already logged done. */
  doneToday: number;
  /** Habits scheduled for today at all — the "of N" in "2 of 4 done today". */
  scheduledToday: number;
  topStreaks: { title: string; streak: number }[];
};

/**
 * The dashboard widget's read-only summary (docs/modules/habits.md §7):
 * today's progress as a count plus the top current streaks, highest first.
 *
 * "Scheduled today" is `due || todayDone` rather than every habit the member
 * owns — a `weekdays` habit that doesn't fall on today, or a `weekly` one
 * whose target is already met, isn't part of today's count.
 */
export function buildHabitsWidgetSummary(
  habits: HabitViewModel[],
  { topStreakCount = 3 }: { topStreakCount?: number } = {},
): HabitsWidgetSummary {
  const todayHabits = habits.filter((h) => h.due || h.todayDone);

  const topStreaks = habits
    .filter((h) => h.streak > 0)
    .sort(
      (a, b) =>
        b.streak - a.streak ||
        a.trackable.title.localeCompare(b.trackable.title),
    )
    .slice(0, topStreakCount)
    .map((h) => ({ title: h.trackable.title, streak: h.streak }));

  return {
    doneToday: todayHabits.filter((h) => h.todayDone).length,
    scheduledToday: todayHabits.length,
    topStreaks,
  };
}

export function buildMetricViewModels(
  trackables: TrackableRow[],
  logs: LogRow[],
): MetricViewModel[] {
  return trackables
    .map((trackable): MetricViewModel | null => {
      const kind = getTrackableKind(trackable.kind);
      if (kind.scheduled) return null;

      const points = logs
        .filter(
          (log) => log.trackable_id === trackable.id && log.value !== null,
        )
        .map((log) => ({ date: log.log_date, value: log.value as number }));

      return { trackable, kind, points };
    })
    .filter((m): m is MetricViewModel => m !== null);
}
