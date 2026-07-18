"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PinZoneItem = {
  pinId: string;
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  href?: string;
  /**
   * Full card body, used by the At-a-glance zone: a widget renders its own
   * content rather than the icon + label tile the Apps grid shows. When set,
   * `icon`/`description`/`href` are ignored.
   */
  content?: ReactNode;
};

export type PinZoneCandidate = {
  key: string;
  label: string;
  icon: ReactNode;
};

/**
 * One of the dashboard's two independently-ordered zones (#27, prototype
 * #8): pinned items in `position` order, with Edit mode revealing
 * reorder/unpin on each and an Add list of unpinned candidates. Shared by
 * the Apps grid and the At-a-glance stack — only `layout` and the item
 * content differ.
 */
export function PinZone({
  id,
  title,
  layout,
  items,
  candidates,
  editing,
  emptyMessage,
  onMove,
  onUnpin,
  onPin,
}: {
  id: string;
  title: string;
  layout: "grid" | "stack";
  items: PinZoneItem[];
  candidates: PinZoneCandidate[];
  editing: boolean;
  emptyMessage: string;
  onMove: (index: number, direction: "up" | "down") => void;
  onUnpin: (item: PinZoneItem) => void;
  onPin: (candidate: PinZoneCandidate) => void;
}) {
  // Nothing to show: no pins, and no add candidates worth entering edit mode
  // for. Once either exists, always render the grid/stack — even mid-edit
  // with zero current pins there can still be candidates to add.
  const isEmpty = items.length === 0 && (!editing || candidates.length === 0);

  return (
    <section aria-labelledby={`zone-${id}`} className="flex flex-col gap-3">
      <h2 id={`zone-${id}`} className="text-sm font-bold text-muted-foreground">
        {title}
      </h2>

      {isEmpty ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div
          className={cn(
            layout === "grid"
              ? "grid grid-cols-3 gap-3"
              : "flex flex-col gap-3",
          )}
        >
          {items.map((item, index) => (
            <PinCard
              key={item.pinId}
              item={item}
              editing={editing}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
              onMoveUp={() => onMove(index, "up")}
              onMoveDown={() => onMove(index, "down")}
              onUnpin={() => onUnpin(item)}
            />
          ))}

          {editing &&
            candidates.map((candidate) => (
              <button
                key={candidate.key}
                type="button"
                onClick={() => onPin(candidate)}
                className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:border-primary hover:text-foreground"
              >
                {candidate.icon}
                <span>{candidate.label}</span>
                <Plus className="size-4" aria-hidden />
              </button>
            ))}
        </div>
      )}
    </section>
  );
}

function PinCard({
  item,
  editing,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onUnpin,
}: {
  item: PinZoneItem;
  editing: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUnpin: () => void;
}) {
  const content = item.content ?? (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      {item.icon}
      <span className="text-sm font-medium">{item.label}</span>
      {item.description && (
        <span className="text-xs text-muted-foreground">
          {item.description}
        </span>
      )}
    </div>
  );

  return (
    <div className="relative flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
      {editing || item.content ? (
        content
      ) : item.href ? (
        <Link
          href={item.href}
          className="flex flex-1 flex-col items-center gap-2"
        >
          {content}
        </Link>
      ) : (
        content
      )}

      {editing && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Move up"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Move down"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ChevronDown />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Unpin ${item.label}`}
            onClick={onUnpin}
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  );
}
