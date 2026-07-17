import { describe, expect, it } from "vitest";

import { parseISODate } from "@/modules/habits/lib/cadence";
import {
  buildHabitViewModels,
  buildMetricViewModels,
  groupLogsByTrackable,
  groupParticipantsByTrackable,
  type LogRow,
  type TrackableRow,
} from "@/modules/habits/lib/view-model";

const TODAY = parseISODate("2026-07-15");

function trackable(overrides: Partial<TrackableRow>): TrackableRow {
  return {
    id: "t1",
    title: "Untitled",
    kind: "habit",
    scope: "private",
    archived_at: null,
    cadence_type: "daily",
    cadence_target: null,
    cadence_weekdays: null,
    ...overrides,
  };
}

describe("groupLogsByTrackable", () => {
  it("buckets logs by trackable id, preserving order", () => {
    const logs: LogRow[] = [
      { trackable_id: "a", log_date: "2026-07-14", done: true, value: null },
      { trackable_id: "b", log_date: "2026-07-15", done: false, value: 70 },
      { trackable_id: "a", log_date: "2026-07-15", done: true, value: null },
    ];

    const grouped = groupLogsByTrackable(logs);
    expect(grouped.get("a")).toEqual([
      { date: "2026-07-14", done: true },
      { date: "2026-07-15", done: true },
    ]);
    expect(grouped.get("b")).toEqual([{ date: "2026-07-15", done: false }]);
  });
});

describe("groupParticipantsByTrackable", () => {
  it("buckets participant member ids by trackable id", () => {
    const grouped = groupParticipantsByTrackable([
      { trackable_id: "a", member_id: "m1" },
      { trackable_id: "a", member_id: "m2" },
      { trackable_id: "b", member_id: "m3" },
    ]);

    expect(grouped.get("a")).toEqual(["m1", "m2"]);
    expect(grouped.get("b")).toEqual(["m3"]);
  });
});

describe("buildHabitViewModels", () => {
  it("only includes scheduled kinds and derives streak/due/todayDone", () => {
    const trackables = [
      trackable({ id: "habit-1", kind: "habit", cadence_type: "daily" }),
      trackable({ id: "weight-1", kind: "weight", cadence_type: null }),
    ];
    const logsByTrackable = groupLogsByTrackable([
      {
        trackable_id: "habit-1",
        log_date: "2026-07-14",
        done: true,
        value: null,
      },
    ]);

    const habits = buildHabitViewModels(trackables, logsByTrackable, TODAY);

    expect(habits).toHaveLength(1);
    expect(habits[0].trackable.id).toBe("habit-1");
    expect(habits[0].streak).toBe(1);
    expect(habits[0].due).toBe(true);
    expect(habits[0].todayDone).toBe(false);
  });
});

describe("buildMetricViewModels", () => {
  it("only includes unscheduled kinds and drops null-value rows", () => {
    const trackables = [
      trackable({ id: "habit-1", kind: "habit" }),
      trackable({ id: "weight-1", kind: "weight", cadence_type: null }),
    ];
    const logs: LogRow[] = [
      {
        trackable_id: "weight-1",
        log_date: "2026-07-10",
        done: false,
        value: 71,
      },
      {
        trackable_id: "weight-1",
        log_date: "2026-07-12",
        done: false,
        value: null,
      },
      {
        trackable_id: "habit-1",
        log_date: "2026-07-12",
        done: true,
        value: null,
      },
    ];

    const metrics = buildMetricViewModels(trackables, logs);

    expect(metrics).toHaveLength(1);
    expect(metrics[0].trackable.id).toBe("weight-1");
    expect(metrics[0].points).toEqual([{ date: "2026-07-10", value: 71 }]);
  });
});
