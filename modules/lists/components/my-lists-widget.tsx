import Link from "next/link";

import { createClient } from "@/platform/supabase/server";
import { getListKind } from "@/modules/lists/kinds";
import { kindIcon } from "@/modules/lists/components/kind-icon";
import { listCountLabel } from "@/modules/lists/lib/count-label";
import { getMyLists, type MyListSummary } from "@/modules/lists/queries";

/**
 * The "My Lists" widget (lists.md §6, ADR-0005): a zero-prop React Server
 * Component about the current member. It fetches its own data — the member's
 * visible, non-archived lists, newest-first and capped at five — via the
 * module's `queries.ts`; RLS is what scopes the rows, so no member id is
 * passed. The platform widget frame owns the card chrome around it.
 */
export async function MyListsWidget() {
  const supabase = await createClient();
  const lists = await getMyLists(supabase);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold text-muted-foreground">My Lists</p>

      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No lists yet — open Lists to create one.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {lists.map((summary) => (
            <MyListsRow key={summary.list.id} summary={summary} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MyListsRow({ summary }: { summary: MyListSummary }) {
  const { list, uncheckedCount } = summary;
  const kind = getListKind(list.kind);

  return (
    <li>
      <Link
        href={`/lists/${list.id}`}
        className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted"
      >
        {kindIcon(kind.icon)}
        <span className="flex-1 truncate text-sm font-medium">
          {list.title}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {listCountLabel(kind, uncheckedCount)}
        </span>
      </Link>
    </li>
  );
}
