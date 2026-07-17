import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { CreateTrackableForm } from "@/modules/habits/components/create-trackable-form";
import { HabitRow } from "@/modules/habits/components/habit-row";
import { MetricRow } from "@/modules/habits/components/metric-row";
import {
  computeStreak,
  isDueToday,
  toCadence,
  toISODate,
  type DayLog,
} from "@/modules/habits/lib/cadence";
import { getTrackableKind } from "@/modules/habits/lib/kinds";
import { getLogsForTrackables, getTrackables } from "@/modules/habits/queries";

export default async function HabitsPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const today = toISODate(new Date());

  const trackables = await getTrackables(supabase, member.id);
  const logs = await getLogsForTrackables(
    supabase,
    trackables.map((t) => t.id),
  );

  const logsByTrackable = new Map<string, DayLog[]>();
  for (const log of logs) {
    const list = logsByTrackable.get(log.trackable_id) ?? [];
    list.push({ date: log.log_date, done: log.done });
    logsByTrackable.set(log.trackable_id, list);
  }

  const habits = trackables
    .map((trackable) => {
      const kind = getTrackableKind(trackable.kind);
      if (!kind.scheduled) return null;

      const cadence = toCadence(trackable);
      const trackableLogs = logsByTrackable.get(trackable.id) ?? [];
      const todayDone =
        trackableLogs.find((log) => log.date === today)?.done ?? false;

      return {
        trackable,
        kind,
        streak: cadence ? computeStreak(cadence, trackableLogs, new Date()) : 0,
        due: cadence ? isDueToday(cadence, trackableLogs, new Date()) : false,
        todayDone,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  const dueToday = habits.filter((h) => h.due && !h.todayDone);

  const metrics = trackables
    .map((trackable) => {
      const kind = getTrackableKind(trackable.kind);
      if (kind.scheduled) return null;

      const trackableLogs = (
        logs.filter((log) => log.trackable_id === trackable.id) ?? []
      )
        .filter((log) => log.value !== null)
        .map((log) => ({ date: log.log_date, value: log.value as number }));

      return { trackable, kind, points: trackableLogs };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold">Habits</h1>
          <p className="text-sm text-muted-foreground">
            Scheduled check-off habits with streaks, and metrics you log a
            number for over time.
          </p>
        </div>

        <CreateTrackableForm />

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Due today
          </h2>
          {dueToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing due right now — nice work.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dueToday.map((h) => (
                <HabitRow
                  key={h.trackable.id}
                  id={h.trackable.id}
                  title={h.trackable.title}
                  kind={h.kind}
                  today={today}
                  todayDone={h.todayDone}
                  streak={h.streak}
                  due={h.due}
                  archived={h.trackable.archived_at !== null}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Your habits
          </h2>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scheduled habits yet — add one above.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {habits.map((h) => (
                <HabitRow
                  key={h.trackable.id}
                  id={h.trackable.id}
                  title={h.trackable.title}
                  kind={h.kind}
                  today={today}
                  todayDone={h.todayDone}
                  streak={h.streak}
                  due={h.due}
                  archived={h.trackable.archived_at !== null}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Your metrics
          </h2>
          {metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No metrics yet — add weight, sleep, or exercise above.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {metrics.map((m) => (
                <MetricRow
                  key={m.trackable.id}
                  id={m.trackable.id}
                  title={m.trackable.title}
                  kind={m.kind}
                  today={today}
                  points={m.points}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
