"use client";

import { useState, useTransition, type ReactNode } from "react";

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

// A pinned widget: the module/widget it belongs to (for pin persistence) plus
// its already-rendered node — a `WidgetFrame`-wrapped RSC handed down from the
// server page, which the client dashboard only reorders, never introspects.
export type DashboardWidgetTile = {
  pinId: string;
  module: string;
  widget: string;
  label: string;
  node: ReactNode;
};

// An unpinned widget offered in the At-a-glance zone's Add list.
export type DashboardWidgetCandidate = {
  module: string;
  widget: string;
  label: string;
  icon: ReactNode;
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

/**
 * The signed-in dashboard (#27): Apps grid + At-a-glance widget stack, each
 * independently ordered (ADR-0002, prototype #8). Both zones share the
 * reorder/pin plumbing via `PinZone`; they differ only in what a card holds —
 * a launcher tile in Apps, a `WidgetFrame`-wrapped RSC in At-a-glance.
 */
export function Dashboard({
  tiles,
  availableModules,
  widgetTiles,
  availableWidgets,
}: {
  tiles: DashboardTile[];
  availableModules: DashboardModule[];
  widgetTiles: DashboardWidgetTile[];
  availableWidgets: DashboardWidgetCandidate[];
}) {
  const [editing, setEditing] = useState(false);
  const [tileOrder, setTileOrder] = useState(tiles);
  const [widgetOrder, setWidgetOrder] = useState(widgetTiles);
  const [, startTransition] = useTransition();

  // `tiles` only gets a new reference when the server re-fetches pins after
  // a mutation revalidates the page — adopt it then, computed during render
  // rather than a post-commit effect (React's "adjusting state on prop
  // change" pattern) so there's no extra render with stale order.
  const [prevTiles, setPrevTiles] = useState(tiles);
  if (tiles !== prevTiles) {
    setPrevTiles(tiles);
    setTileOrder(tiles);
  }

  // Same adopt-on-revalidate pattern for the widget zone. The nodes are fresh
  // server-rendered elements each request, so this also refreshes widget data.
  const [prevWidgetTiles, setPrevWidgetTiles] = useState(widgetTiles);
  if (widgetTiles !== prevWidgetTiles) {
    setPrevWidgetTiles(widgetTiles);
    setWidgetOrder(widgetTiles);
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
      await reorderPins(next.map((tile) => tile.pinId));
    });
  }

  function handleWidgetUnpin(item: PinZoneItem) {
    const tile = widgetOrder.find((w) => w.pinId === item.pinId);
    if (!tile) return;
    setWidgetOrder((prev) => prev.filter((w) => w.pinId !== item.pinId));
    startTransition(async () => {
      await unpinItem(tile.module, tile.widget);
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
        items={widgetOrder.map((tile) => ({
          pinId: tile.pinId,
          key: widgetKey(tile),
          label: tile.label,
          icon: null,
          content: tile.node,
        }))}
        candidates={availableWidgets.map((widget) => ({
          key: widgetKey(widget),
          label: widget.label,
          icon: widget.icon,
        }))}
        emptyMessage="No widgets yet — pin one from a module to see it here."
        onMove={handleWidgetMove}
        onUnpin={handleWidgetUnpin}
        onPin={handleWidgetPin}
      />
    </main>
  );
}
