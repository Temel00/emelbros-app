import { AppHeader } from "@/components/app-header";
import { getCurrentMember } from "@/platform/auth";
import { createClient } from "@/platform/supabase/server";
import { Hc06SmokeTest } from "@/modules/coffee/components/hc06-smoke-test";

// PROTOTYPE (issue #218): throwaway HC-06 Web Serial smoke test.
export default async function CoffeePage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold">Coffee (prototype)</h1>
          <p className="text-sm text-muted-foreground">
            HC-06 Web Serial smoke test. Throwaway.
          </p>
        </div>
        <Hc06SmokeTest />
      </main>
    </>
  );
}
