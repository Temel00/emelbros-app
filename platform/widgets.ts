import type { ComponentType } from "react";

import type { ModuleManifest } from "@/platform/module-manifest";

/**
 * Resolving the At-a-glance zone's pins against the module registry (ADR-0002,
 * ADR-0005). Pure functions taking the manifests as an argument, so the
 * platform still never imports a specific module (ADR-0003) and the dashboard
 * route stays thin glue.
 *
 * A widget's identity is the pair `(module, widget)` — widget ids are only
 * unique within their module — which is exactly what a widget pin row stores.
 */

export type WidgetRef = {
  moduleSlug: string;
  widgetId: string;
  name: string;
  description: string;
  /** The owning module's Lucide icon name — what the Add list shows. */
  moduleIcon: string;
};

export type ResolvedWidgetPin = WidgetRef & {
  pinId: string;
  component: ComponentType;
};

/** A pin row, narrowed to the fields widget resolution needs. */
export type WidgetPinRow = {
  id: string;
  module: string;
  widget: string | null;
};

function widgetKey(moduleSlug: string, widgetId: string): string {
  return `${moduleSlug}:${widgetId}`;
}

/** Every widget offered by any registered module, flattened with its module slug. */
export function listModuleWidgets(modules: ModuleManifest[]): WidgetRef[] {
  return modules.flatMap((mod) =>
    mod.widgets.map((widget) => ({
      moduleSlug: mod.slug,
      widgetId: widget.id,
      name: widget.name,
      description: widget.description,
      moduleIcon: mod.icon,
    })),
  );
}

/**
 * The member's widget pins in `position` order, each paired with the widget
 * it names. A pin whose module or widget no longer exists is dropped rather
 * than erroring — manifests are code and can drop a widget while old pin rows
 * still reference it.
 */
export function resolveWidgetPins(
  modules: ModuleManifest[],
  pins: WidgetPinRow[],
): ResolvedWidgetPin[] {
  return pins
    .filter((pin) => pin.widget !== null)
    .map((pin): ResolvedWidgetPin | null => {
      const mod = modules.find((candidate) => candidate.slug === pin.module);
      const widget = mod?.widgets.find((entry) => entry.id === pin.widget);
      if (!mod || !widget) return null;

      return {
        pinId: pin.id,
        moduleSlug: mod.slug,
        widgetId: widget.id,
        name: widget.name,
        description: widget.description,
        moduleIcon: mod.icon,
        component: widget.component,
      };
    })
    .filter((pin): pin is ResolvedWidgetPin => pin !== null);
}

/** The widgets not yet pinned — the Add list the At-a-glance zone offers in Edit mode. */
export function listAvailableWidgets(
  modules: ModuleManifest[],
  pins: WidgetPinRow[],
): WidgetRef[] {
  const pinned = new Set(
    pins
      .filter((pin) => pin.widget !== null)
      .map((pin) => widgetKey(pin.module, pin.widget as string)),
  );

  return listModuleWidgets(modules).filter(
    (widget) => !pinned.has(widgetKey(widget.moduleSlug, widget.widgetId)),
  );
}
