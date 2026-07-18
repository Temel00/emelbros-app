"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { getListKind } from "@/modules/lists/kinds";
import { unarchiveListAction } from "@/modules/lists/actions";
import { ListCreateDialog } from "@/modules/lists/components/list-create-dialog";
import { kindIcon } from "@/modules/lists/components/kind-icon";

import type { ListRow } from "@/modules/lists/queries";

const SCOPE_LABEL: Record<ListRow["scope"], string> = {
  private: "Private",
  participants: "Participants",
  family: "Family",
};

/**
 * The lists module home (lists.md §6): every list the member can see,
 * excluding archived — plus an Archived section so an archived list stays
 * reachable and recoverable (lists.md §3).
 */
export function ListsHome({
  lists,
  archivedLists,
}: {
  lists: ListRow[];
  archivedLists: ListRow[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Lists</h1>
          <ListCreateDialog />
        </div>

        {lists.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No lists yet — create one to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lists.map((list) => (
              <ListHomeRow key={list.id} list={list} />
            ))}
          </ul>
        )}
      </div>

      {archivedLists.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-muted-foreground">Archived</h2>
          <ul className="flex flex-col gap-2">
            {archivedLists.map((list) => (
              <ArchivedListRow key={list.id} list={list} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ListHomeRow({ list }: { list: ListRow }) {
  const kind = getListKind(list.kind);

  return (
    <li>
      <Link
        href={`/lists/${list.id}`}
        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary"
      >
        {kindIcon(kind.icon)}
        <span className="flex-1 truncate text-sm font-medium">
          {list.title}
        </span>
        <span className="text-xs text-muted-foreground">
          {SCOPE_LABEL[list.scope]}
        </span>
      </Link>
    </li>
  );
}

function ArchivedListRow({ list }: { list: ListRow }) {
  const kind = getListKind(list.kind);
  const [pending, startTransition] = useTransition();
  const [restored, setRestored] = useState(false);

  if (restored) return null;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3">
      {kindIcon(kind.icon)}
      <span className="flex-1 truncate text-sm text-muted-foreground">
        {list.title}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await unarchiveListAction(list.id);
            setRestored(true);
          })
        }
      >
        Unarchive
      </Button>
    </li>
  );
}
