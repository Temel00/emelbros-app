import { AppHeader } from "@/components/app-header";
import {
  Dashboard,
  type DashboardTile,
} from "@/components/dashboard/dashboard";
import { modules } from "@/modules";
import { getCurrentMember } from "@/platform/auth";
import { getPins } from "@/platform/queries";
import { createClient } from "@/platform/supabase/server";

export default async function Home() {
  const member = await getCurrentMember();
  // The proxy (ADR-0011) redirects signed-out requests to /sign-in before
  // this component ever runs.
  if (!member) return null;

  const supabase = await createClient();
  const pins = await getPins(supabase, member.id);
  const tilePins = pins.filter((pin) => pin.widget === null);

  const tiles = tilePins
    .map((pin) => {
      const mod = modules.find((candidate) => candidate.slug === pin.module);
      return mod ? { pinId: pin.id, module: mod } : null;
    })
    .filter((tile): tile is DashboardTile => tile !== null);

  const pinnedSlugs = new Set(tilePins.map((pin) => pin.module));
  const availableModules = modules.filter((mod) => !pinnedSlugs.has(mod.slug));

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <Dashboard tiles={tiles} availableModules={availableModules} />
    </>
  );
}
