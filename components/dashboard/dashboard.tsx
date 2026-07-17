"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  PinZone,
  type PinZoneCandidate,
  type PinZoneItem,
} from "@/components/dashboard/pin-zone";
import { resolveIcon } from "@/lib/icon";
import { moveItem } from "@/lib/reorder";
import { pinItem, reorderPins, unpinItem } from "@/platform/pins";
import type { ModuleManifest } from "@/platform/module-manifest";

export type DashboardModule = ModuleManifest;

export type DashboardTile = {
  pinId: string;
  module: DashboardModule;
};

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
 * independently ordered (ADR-0002, prototype #8). Widget pins don't exist
 * yet — no module declares a widget until the widget contract (#4) lands —
 * so that zone always renders its empty state; the reorder/pin plumbing
 * underneath is shared with the Apps zone via `PinZone`.
 */
export function Dashboard({
  tiles,
  availableModules,
}: {
  tiles: DashboardTile[];
  availableModules: DashboardModule[];
}) {
  const [editing, setEditing] = useState(false);
  const [tileOrder, setTileOrder] = useState(tiles);
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
        items={[]}
        candidates={[]}
        emptyMessage="No widgets yet — modules will offer widgets here once available."
        onMove={() => {}}
        onUnpin={() => {}}
        onPin={() => {}}
      />
    </main>
  );
}
