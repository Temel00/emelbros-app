import type { ModuleManifest } from "@/platform/module-manifest";

import { MyListsWidget } from "@/modules/lists/components/my-lists-widget";

/**
 * The lists Module Manifest (ADR-0001, docs/modules/lists.md §5). Registered
 * in `modules/index.ts` (ADR-0013).
 */
export const listsManifest = {
  slug: "lists",
  name: "Lists",
  description: "Shared shopping lists, to-dos, and notes.",
  icon: "ListChecks",
  scopes: [
    {
      table: "lists_list",
      policy: "member-chosen (private / participants / family)",
    },
    { table: "lists_item", policy: "inherits the parent list's visibility" },
    {
      table: "lists_participant",
      policy: "participant join, managed by the list owner",
    },
  ],
  widgets: [
    {
      id: "my-lists",
      name: "My Lists",
      description: "Lists you own or can see, with an unchecked-item count.",
      component: MyListsWidget,
    },
  ],
  profileSections: [],
} satisfies ModuleManifest;
