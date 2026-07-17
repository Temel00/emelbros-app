import { MyDartsWidget } from "@/modules/darts/components/my-darts-widget";
import type { ModuleManifest } from "@/platform/module-manifest";

/**
 * The darts module manifest (ADR-0001, docs/modules/darts.md §8). Darts is
 * the platform's canonical fixed-scope module: every game is Family scope,
 * so all games and stats are open to every signed-in member.
 */
export const dartsManifest: ModuleManifest = {
  slug: "darts",
  name: "Darts",
  description: "Score 501/301 games and track the family's career records.",
  icon: "Target",
  scopes: [
    { table: "darts_game", policy: "fixed", scope: "family" },
    { table: "darts_participant", policy: "inherited", from: "darts_game" },
    { table: "darts_turn", policy: "inherited", from: "darts_game" },
    { table: "darts_dart", policy: "inherited", from: "darts_game" },
  ],
  widgets: [
    {
      id: "my-darts",
      name: "My Darts",
      description:
        "Your recent record, most recent game, and a New game shortcut.",
      component: MyDartsWidget,
    },
  ],
  // No profile section in v1 — darts stats live in the module's own pages,
  // not on member profiles (darts.md §10, §11).
  profileSections: [],
};
