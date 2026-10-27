import { notFound } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { BeanDetail } from "@/modules/coffee/components/bean-detail";
import { getBean } from "@/modules/coffee/queries";

export default async function CoffeeBeanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const bean = await getBean(supabase, id);
  if (!bean) notFound();

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <BeanDetail bean={bean} />
      </main>
    </>
  );
}
