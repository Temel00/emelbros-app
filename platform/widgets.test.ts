import { describe, expect, it } from "vitest";

import type { ModuleManifest } from "@/platform/module-manifest";
import {
  listAvailableWidgets,
  listModuleWidgets,
  resolveWidgetPins,
  type WidgetPinRow,
} from "@/platform/widgets";

function Stub() {
  return null;
}

function manifest(slug: string, widgetIds: string[]): ModuleManifest {
  return {
    slug,
    name: slug,
    description: `${slug} module`,
    icon: "LayoutGrid",
    scopes: [],
    widgets: widgetIds.map((id) => ({
      id,
      name: `${slug}/${id}`,
      description: `${id} widget`,
      component: Stub,
    })),
    profileSections: [],
  };
}

const MODULES = [
  manifest("habits", ["habits"]),
  manifest("lists", ["my-lists"]),
];

function pin(overrides: Partial<WidgetPinRow> & { id: string }): WidgetPinRow {
  return { module: "habits", widget: "habits", ...overrides };
}

describe("listModuleWidgets", () => {
  it("flattens every module's widgets with its slug", () => {
    expect(listModuleWidgets(MODULES)).toEqual([
      {
        moduleSlug: "habits",
        widgetId: "habits",
        name: "habits/habits",
        description: "habits widget",
      },
      {
        moduleSlug: "lists",
        widgetId: "my-lists",
        name: "lists/my-lists",
        description: "my-lists widget",
      },
    ]);
  });
});

describe("resolveWidgetPins", () => {
  it("keeps widget pins in the order given and pairs each with its component", () => {
    const resolved = resolveWidgetPins(MODULES, [
      pin({ id: "p1", module: "lists", widget: "my-lists" }),
      pin({ id: "p2" }),
    ]);

    expect(resolved.map((entry) => entry.pinId)).toEqual(["p1", "p2"]);
    expect(resolved[0].moduleSlug).toBe("lists");
    expect(resolved[0].widgetId).toBe("my-lists");
    expect(resolved[1].component).toBe(Stub);
  });

  it("ignores Apps-zone pins, which carry no widget", () => {
    const resolved = resolveWidgetPins(MODULES, [
      pin({ id: "p1", widget: null }),
    ]);

    expect(resolved).toEqual([]);
  });

  it("drops pins naming a module or widget that no longer exists", () => {
    const resolved = resolveWidgetPins(MODULES, [
      pin({ id: "p1", module: "retired-module" }),
      pin({ id: "p2", module: "habits", widget: "retired-widget" }),
      pin({ id: "p3" }),
    ]);

    expect(resolved.map((entry) => entry.pinId)).toEqual(["p3"]);
  });
});

describe("listAvailableWidgets", () => {
  it("excludes already-pinned widgets", () => {
    const available = listAvailableWidgets(MODULES, [pin({ id: "p1" })]);

    expect(available).toEqual([
      {
        moduleSlug: "lists",
        widgetId: "my-lists",
        name: "lists/my-lists",
        description: "my-lists widget",
      },
    ]);
  });

  it("matches on the (module, widget) pair, not the widget id alone", () => {
    // Same widget id under a different module must stay available.
    const modules = [
      manifest("habits", ["summary"]),
      manifest("darts", ["summary"]),
    ];
    const available = listAvailableWidgets(modules, [
      pin({ id: "p1", module: "habits", widget: "summary" }),
    ]);

    expect(available.map((widget) => widget.moduleSlug)).toEqual(["darts"]);
  });

  it("offers everything when nothing is pinned", () => {
    expect(listAvailableWidgets(MODULES, [])).toHaveLength(2);
  });
});
