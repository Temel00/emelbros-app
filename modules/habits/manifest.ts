import type { ModuleManifest } from "@/platform/module-manifest";

import { HabitsWidget } from "@/modules/habits/components/habits-widget";

/**
 * The Habits module manifest (ADR-0001).
 */
export const habitsManifest = {
  slug: "habits",
  name: "Habits",
  description: "Track scheduled habits and personal health metrics over time.",
  icon: "Activity",
  scopes: [
    { table: "habits_trackable", policy: "member-chosen" },
    { table: "habits_log", policy: "inherited", from: "habits_trackable" },
    {
      table: "habits_participant",
      policy: "inherited",
      from: "habits_trackable",
    },
  ],
  widgets: [
    {
      id: "habits",
      name: "Habits",
      description: "Today's check-off progress and your top current streaks.",
      component: HabitsWidget,
    },
  ],
  profileSections: [],
} satisfies ModuleManifest;
