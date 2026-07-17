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
    {
      table: "habits_trackable",
      policy: "member-chosen",
      description:
        "Owner picks Private (default) / Participants / Family per trackable; only the owner writes.",
    },
    {
      table: "habits_log",
      policy: "fixed",
      description:
        "No scope column of its own: reads inherit the parent trackable's visibility so viewers see streaks; writes are owner-only regardless of scope.",
    },
    {
      table: "habits_participant",
      policy: "fixed",
      description:
        "No scope column of its own: the Participants-scope join table, viewer-only, managed by the trackable owner.",
    },
  ],
  widgets: [],
  profileSections: [],
} satisfies ModuleManifest;
