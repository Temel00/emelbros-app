import Link from "next/link";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";

import {
  buildHabitsWidgetSummary,
  buildHabitViewModels,
  groupLogsByTrackable,
} from "@/modules/habits/lib/view-model";
import { getLogsForTrackables, getTrackables } from "@/modules/habits/queries";

/**
 * The "Habits" dashboard widget (docs/modules/habits.md §7, ADR-0005): a
 * zero-prop Server Component about the current member, read-only like My
 * Lists — tapping through to the module is how you actually check things off.
 *
 * Shows today's progress for the member's **own scheduled** habits plus their
 * top current streaks. Archived trackables and metrics are both out: archived
 * ones are excluded by `getTrackables`, metrics by `buildHabitViewModels`,
 * which keeps only scheduled kinds.
 */
export async function HabitsWidget() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();

  const trackables = await getTrackables(supabase, member.id);
  const logs = await getLogsForTrackables(
    supabase,
    trackables.map((t) => t.id),
  );

  const habits = buildHabitViewModels(
    trackables,
    groupLogsByTrackable(logs),
    new Date(),
  );

  if (habits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No habits yet —{" "}
        <Link href="/habits" className="underline hover:text-foreground">
          add one
        </Link>{" "}
        to start a streak.
      </p>
    );
  }

  const { doneToday, scheduledToday, topStreaks } =
    buildHabitsWidgetSummary(habits);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {scheduledToday === 0
          ? "Nothing due today"
          : `${doneToday} of ${scheduledToday} done today`}
      </p>

      {topStreaks.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {topStreaks.map(({ title, streak }) => (
            <li key={title} className="text-xs text-muted-foreground">
              <span aria-hidden>🔥</span> {title}{" "}
              <span className="font-medium text-foreground">{streak}</span>
              <span className="sr-only"> streak</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
