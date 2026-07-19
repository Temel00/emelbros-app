import { notFound } from "next/navigation";

import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import {
  getList,
  getListItems,
  getListParticipants,
  getOtherProfiles,
} from "@/modules/lists/queries";
import { ListDetail } from "@/modules/lists/components/list-detail";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const list = await getList(supabase, id);
  // RLS returns no row for a list the caller can't see — same response as a
  // list that doesn't exist, which is the point (no visibility leak).
  if (!list) notFound();

  const isOwner = list.owner_member_id === member.id;

  const [items, participants, candidates] = await Promise.all([
    getListItems(supabase, list.id),
    getListParticipants(supabase, list.id),
    isOwner ? getOtherProfiles(supabase, member.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <ListDetail
          list={list}
          items={items}
          participants={participants}
          candidates={candidates}
          isOwner={isOwner}
        />
      </main>
    </>
  );
}
