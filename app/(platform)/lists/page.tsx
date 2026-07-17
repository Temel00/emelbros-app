import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { getArchivedLists, getVisibleLists } from "@/modules/lists/queries";
import { ListsHome } from "@/modules/lists/components/lists-home";

export default async function ListsPage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const [lists, archivedLists] = await Promise.all([
    getVisibleLists(supabase),
    getArchivedLists(supabase),
  ]);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <ListsHome lists={lists} archivedLists={archivedLists} />
      </main>
    </>
  );
}
