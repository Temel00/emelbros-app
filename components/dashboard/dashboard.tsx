"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  PinZone,
  type PinZoneCandidate,
  type PinZoneItem,
} from "@/components/dashboard/pin-zone";
import { resolveIcon } from "@/lib/icon";
import { moveItem } from "@/lib/reorder";
import type { ModuleManifest } from "@/platform/module-manifest";
import { pinItem, reorderPins, unpinItem } from "@/platform/pins";

// The launcher only needs a module's identity, not its scopes/widgets —
// Pick keeps this in sync with ModuleManifest (ADR-0001) as it grows.
export type DashboardModule = Pick<
  ModuleManifest,
  "slug" | "name" | "description" | "icon"
>;

export type DashboardTile = {
  pinId: string;
  module: DashboardModule;
};

/**
 * A pinned widget, its RSC output already rendered server-side (widgets can't
 * cross the client boundary as components — ADR-0005 — so the page renders
 * them and passes the elements down). `module`/`widget` are the pin identity.
 */
export type DashboardWidget = {
  pinId: string;
  module: string;
  widget: string;
  label: string;
  content: ReactNode;
};

/** An unpinned widget the At-a-glance zone offers in the Add list. */
export type DashboardWidgetCandidate = {
  module: string;
  widget: string;
  label: string;
  icon: string;
};

function widgetKey(w: { module: string; widget: string }): string {
  return `${w.module}:${w.widget}`;
}

function toItem(tile: DashboardTile): PinZoneItem {
  const Icon = resolveIcon(tile.module.icon);
  return {
    pinId: tile.pinId,
    key: tile.module.slug,
    label: tile.module.name,
    description: tile.module.description,
    icon: <Icon className="size-6" aria-hidden />,
    href: `/${tile.module.slug}`,
  };
}

function toCandidate(mod: DashboardModule): PinZoneCandidate {
  const Icon = resolveIcon(mod.icon);
  return {
    key: mod.slug,
    label: mod.name,
    icon: <Icon className="size-6" aria-hidden />,
  };
}

function toWidgetItem(widget: DashboardWidget): PinZoneItem {
  return {
    pinId: widget.pinId,
    key: widgetKey(widget),
    label: widget.label,
    content: widget.content,
  };
}

function toWidgetCandidate(
  candidate: DashboardWidgetCandidate,
): PinZoneCandidate {
  const Icon = resolveIcon(candidate.icon);
  return {
    key: widgetKey(candidate),
    label: candidate.label,
    icon: <Icon className="size-6" aria-hidden />,
  };
}

/**
 * The signed-in dashboard (#27): an Apps grid + an At-a-glance widget stack,
 * each independently ordered (ADR-0002, prototype #8). Both zones share the
 * pin/reorder/unpin plumbing via `PinZone`; only their layout and item content
 * differ. Widgets arrive already rendered from the server (ADR-0005) — the
 * dashboard reorders and pins them but never fetches their data.
 */
export function Dashboard({
  tiles,
  availableModules,
  widgets,
  availableWidgets,
}: {
  tiles: DashboardTile[];
  availableModules: DashboardModule[];
  widgets: DashboardWidget[];
  availableWidgets: DashboardWidgetCandidate[];
}) {
  const [editing, setEditing] = useState(false);
  const [tileOrder, setTileOrder] = useState(tiles);
  const [widgetOrder, setWidgetOrder] = useState(widgets);
  const [, startTransition] = useTransition();

  // `tiles`/`widgets` only get new references when the server re-fetches pins
  // after a mutation revalidates the page — adopt them then, computed during
  // render rather than a post-commit effect (React's "adjusting state on prop
  // change" pattern) so there's no extra render with stale order.
  const [prevTiles, setPrevTiles] = useState(tiles);
  if (tiles !== prevTiles) {
    setPrevTiles(tiles);
    setTileOrder(tiles);
  }

  const [prevWidgets, setPrevWidgets] = useState(widgets);
  if (widgets !== prevWidgets) {
    setPrevWidgets(widgets);
    setWidgetOrder(widgets);
  }

  function handleMove(index: number, direction: "up" | "down") {
    const next = moveItem(tileOrder, index, direction);
    setTileOrder(next);
    startTransition(async () => {
      await reorderPins(next.map((tile) => tile.pinId));
    });
  }

  function handleUnpin(item: PinZoneItem) {
    setTileOrder((prev) => prev.filter((tile) => tile.pinId !== item.pinId));
    startTransition(async () => {
      await unpinItem(item.key, null);
    });
  }

  function handlePin(candidate: PinZoneCandidate) {
    startTransition(async () => {
      await pinItem(candidate.key, null);
    });
  }

  function handleWidgetMove(index: number, direction: "up" | "down") {
    const next = moveItem(widgetOrder, index, direction);
    setWidgetOrder(next);
    startTransition(async () => {
      await reorderPins(next.map((widget) => widget.pinId));
    });
  }

  function handleWidgetUnpin(item: PinZoneItem) {
    const widget = widgetOrder.find((w) => w.pinId === item.pinId);
    if (!widget) return;
    setWidgetOrder((prev) => prev.filter((w) => w.pinId !== item.pinId));
    startTransition(async () => {
      await unpinItem(widget.module, widget.widget);
    });
  }

  function handleWidgetPin(candidate: PinZoneCandidate) {
    const widget = availableWidgets.find((w) => widgetKey(w) === candidate.key);
    if (!widget) return;
    startTransition(async () => {
      await pinItem(widget.module, widget.widget);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing((prev) => !prev)}
        >
          {editing ? "Done" : "Edit"}
        </Button>
      </div>

      <PinZone
        id="apps"
        title="Apps"
        layout="grid"
        editing={editing}
        items={tileOrder.map(toItem)}
        candidates={availableModules.map(toCandidate)}
        emptyMessage="No modules pinned yet — the launcher fills in as modules are added."
        onMove={handleMove}
        onUnpin={handleUnpin}
        onPin={handlePin}
      />

      <PinZone
        id="widgets"
        title="At a glance"
        layout="stack"
        editing={editing}
        items={widgetOrder.map(toWidgetItem)}
        candidates={availableWidgets.map(toWidgetCandidate)}
        emptyMessage="No widgets yet — pin one from a module to see it here."
        onMove={handleWidgetMove}
        onUnpin={handleWidgetUnpin}
        onPin={handleWidgetPin}
      />
    </main>
  );
}
