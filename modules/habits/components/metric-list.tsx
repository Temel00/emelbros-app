import { MetricRow } from "@/modules/habits/components/metric-row";
import type { MetricViewModel } from "@/modules/habits/lib/view-model";

/** Renders a list of metric rows, or an empty-state message. */
export function MetricList({
  metrics,
  today,
  participantsByTrackable,
  emptyMessage,
}: {
  metrics: MetricViewModel[];
  today: string;
  participantsByTrackable: Map<string, string[]>;
  emptyMessage: string;
}) {
  if (metrics.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {metrics.map((m) => (
        <MetricRow
          key={m.trackable.id}
          id={m.trackable.id}
          title={m.trackable.title}
          kind={m.kind}
          scope={m.trackable.scope as "private" | "participants" | "family"}
          participants={participantsByTrackable.get(m.trackable.id) ?? []}
          today={today}
          points={m.points}
          archived={m.trackable.archived_at !== null}
        />
      ))}
    </ul>
  );
}
