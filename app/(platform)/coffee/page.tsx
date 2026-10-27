import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { BeanFormDialog } from "@/modules/coffee/components/bean-form-dialog";
import { BeanList } from "@/modules/coffee/components/bean-list";
import { listBeans } from "@/modules/coffee/queries";

export default async function CoffeePage() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const beans = await listBeans(supabase);

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Coffee</h1>
            <p className="text-sm text-muted-foreground">
              The family&apos;s beans and their grind profiles.
            </p>
          </div>
          <BeanFormDialog />
        </div>
        <BeanList beans={beans} />
      </main>
    </>
  );
}
