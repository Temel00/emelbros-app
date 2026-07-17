import { HabitRow } from "@/modules/habits/components/habit-row";
import type { HabitViewModel } from "@/modules/habits/lib/view-model";

/**
 * Renders a list of habit rows, or an empty-state message — shared by the
 * "Due today" and "Your habits" sections on the module home so the mapping
 * from view model to row props lives in one place.
 */
export function HabitList({
  habits,
  today,
  participantsByTrackable,
  emptyMessage,
}: {
  habits: HabitViewModel[];
  today: string;
  participantsByTrackable: Map<string, string[]>;
  emptyMessage: string;
}) {
  if (habits.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {habits.map((h) => (
        <HabitRow
          key={h.trackable.id}
          id={h.trackable.id}
          title={h.trackable.title}
          kind={h.kind}
          scope={h.trackable.scope as "private" | "participants" | "family"}
          cadenceType={h.trackable.cadence_type}
          cadenceTarget={h.trackable.cadence_target}
          cadenceWeekdays={h.trackable.cadence_weekdays}
          participants={participantsByTrackable.get(h.trackable.id) ?? []}
          today={today}
          todayDone={h.todayDone}
          streak={h.streak}
          due={h.due}
          archived={h.trackable.archived_at !== null}
        />
      ))}
    </ul>
  );
}
