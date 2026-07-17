import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import { CreateTrackableForm } from "@/modules/habits/components/create-trackable-form";
import { HabitList } from "@/modules/habits/components/habit-list";
import { MetricList } from "@/modules/habits/components/metric-list";
import { toISODate } from "@/modules/habits/lib/cadence";
import {
  buildHabitViewModels,
  buildMetricViewModels,
  groupLogsByTrackable,
  groupParticipantsByTrackable,
} from "@/modules/habits/lib/view-model";
import {
  getLogsForTrackables,
  getParticipantsForTrackables,
  getTrackables,
} from "@/modules/habits/queries";

export default async function HabitsPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const today = toISODate(new Date());

  const trackables = await getTrackables(supabase, member.id, {
    includeArchived: true,
  });
  const trackableIds = trackables.map((t) => t.id);
  const [logs, participantRows] = await Promise.all([
    getLogsForTrackables(supabase, trackableIds),
    getParticipantsForTrackables(supabase, trackableIds),
  ]);

  const logsByTrackable = groupLogsByTrackable(
    logs.map((log) => ({
      trackable_id: log.trackable_id,
      log_date: log.log_date,
      done: log.done,
      value: log.value,
    })),
  );
  const participantsByTrackable = groupParticipantsByTrackable(participantRows);

  const active = trackables.filter((t) => t.archived_at === null);
  const archived = trackables.filter((t) => t.archived_at !== null);

  const habits = buildHabitViewModels(active, logsByTrackable, new Date());
  const metrics = buildMetricViewModels(active, logs);
  const dueToday = habits.filter((h) => h.due && !h.todayDone);

  const archivedHabits = buildHabitViewModels(
    archived,
    logsByTrackable,
    new Date(),
  );
  const archivedMetrics = buildMetricViewModels(archived, logs);

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
          <HabitList
            habits={dueToday}
            today={today}
            participantsByTrackable={participantsByTrackable}
            emptyMessage="Nothing due right now — nice work."
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Your habits
          </h2>
          <HabitList
            habits={habits}
            today={today}
            participantsByTrackable={participantsByTrackable}
            emptyMessage="No scheduled habits yet — add one above."
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Your metrics
          </h2>
          <MetricList
            metrics={metrics}
            today={today}
            participantsByTrackable={participantsByTrackable}
            emptyMessage="No metrics yet — add weight, sleep, or exercise above."
          />
        </section>

        {(archivedHabits.length > 0 || archivedMetrics.length > 0) && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Archived
            </h2>
            {archivedHabits.length > 0 && (
              <HabitList
                habits={archivedHabits}
                today={today}
                participantsByTrackable={participantsByTrackable}
                emptyMessage=""
              />
            )}
            {archivedMetrics.length > 0 && (
              <MetricList
                metrics={archivedMetrics}
                today={today}
                participantsByTrackable={participantsByTrackable}
                emptyMessage=""
              />
            )}
          </section>
        )}
      </main>
    </>
  );
}
