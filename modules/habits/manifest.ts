import type { ModuleManifest } from "@/platform/module-manifest";

/**
 * The Habits module manifest (ADR-0001). No widget yet: the "Habits"
 * dashboard widget is built and added here by a later ticket (#39), once
 * the queries/streak logic it depends on (#38) exists.
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
  widgets: [],
  profileSections: [],
} satisfies ModuleManifest;
