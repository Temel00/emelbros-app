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

/**
 * A widget offered by some module's manifest. A widget's pin identity is the
 * pair `(module, widget)` (ADR-0002), since widget ids are only unique within
 * a module — hence both fields travel together everywhere below.
 *
 * Structurally this is `platform/widgets`' `WidgetRef`, restated here so the
 * client dashboard doesn't import server-side platform code.
 */
export type DashboardWidget = {
  moduleSlug: string;
  widgetId: string;
  name: string;
  description: string;
  moduleIcon: string;
};

/**
 * A pinned widget: its identity plus the already-rendered Server Component.
 * The widget is rendered on the server (it takes zero props and fetches its
 * own data, ADR-0005) and arrives here as an opaque `ReactNode` — which is
 * how a Server Component reaches this client component at all.
 */
export type DashboardWidgetPin = DashboardWidget & {
  pinId: string;
  content: ReactNode;
};

function widgetKey(widget: { moduleSlug: string; widgetId: string }): string {
  return `${widget.moduleSlug}:${widget.widgetId}`;
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

function toWidgetItem(pin: DashboardWidgetPin): PinZoneItem {
  return {
    pinId: pin.pinId,
    key: widgetKey(pin),
    label: pin.name,
    content: pin.content,
  };
}

function toWidgetCandidate(widget: DashboardWidget): PinZoneCandidate {
  // A widget has no icon of its own, so the Add list borrows its module's.
  const Icon = resolveIcon(widget.moduleIcon);
  return {
    key: widgetKey(widget),
    label: widget.name,
    icon: <Icon className="size-6" aria-hidden />,
  };
}

/**
 * The signed-in dashboard (#27): Apps grid + At-a-glance widget stack, each
 * independently ordered (ADR-0002, prototype #8). The two zones share all
 * their pin/reorder plumbing via `PinZone` and differ only in layout and in
 * what a card contains — an app tile's icon and label, or a widget's own
 * rendered output.
 */
export function Dashboard({
  tiles,
  availableModules,
  widgetPins,
  availableWidgets,
}: {
  tiles: DashboardTile[];
  availableModules: DashboardModule[];
  widgetPins: DashboardWidgetPin[];
  availableWidgets: DashboardWidget[];
}) {
  const [editing, setEditing] = useState(false);
  const [tileOrder, setTileOrder] = useState(tiles);
  const [widgetOrder, setWidgetOrder] = useState(widgetPins);
  const [, startTransition] = useTransition();

  // `tiles`/`widgetPins` only get a new reference when the server re-fetches
  // pins after a mutation revalidates the page — adopt them then, computed
  // during render rather than a post-commit effect (React's "adjusting state
  // on prop change" pattern) so there's no extra render with stale order.
  const [prevTiles, setPrevTiles] = useState(tiles);
  if (tiles !== prevTiles) {
    setPrevTiles(tiles);
    setTileOrder(tiles);
  }

  // Same adopt-on-revalidate pattern for the widget zone. The nodes are fresh
  // server-rendered elements each request, so this also refreshes widget data.
  const [prevWidgets, setPrevWidgets] = useState(widgetPins);
  if (widgetPins !== prevWidgets) {
    setPrevWidgets(widgetPins);
    setWidgetOrder(widgetPins);
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
      await reorderPins(next.map((pin) => pin.pinId));
    });
  }

  function handleWidgetUnpin(item: PinZoneItem) {
    const pinned = widgetOrder.find((pin) => pin.pinId === item.pinId);
    if (!pinned) return;

    setWidgetOrder((prev) => prev.filter((pin) => pin.pinId !== item.pinId));
    startTransition(async () => {
      await unpinItem(pinned.moduleSlug, pinned.widgetId);
    });
  }

  function handleWidgetPin(candidate: PinZoneCandidate) {
    const widget = availableWidgets.find(
      (available) => widgetKey(available) === candidate.key,
    );
    if (!widget) return;

    startTransition(async () => {
      await pinItem(widget.moduleSlug, widget.widgetId);
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
        emptyMessage="No widgets pinned yet — use Edit to add one."
        onMove={handleWidgetMove}
        onUnpin={handleWidgetUnpin}
        onPin={handleWidgetPin}
      />
    </main>
  );
}
