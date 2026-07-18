import { AppHeader } from "@/components/app-header";
import {
  Dashboard,
  type DashboardTile,
} from "@/components/dashboard/dashboard";
import { WidgetFrame } from "@/components/dashboard/widget-frame";
import { modules } from "@/modules";
import { getCurrentMember } from "@/platform/auth";
import { getPins } from "@/platform/queries";
import { createClient } from "@/platform/supabase/server";
import { listAvailableWidgets, resolveWidgetPins } from "@/platform/widgets";

// `ModuleManifest` carries a `component: ComponentType` field (widgets),
// which can't cross the server/client boundary into the client-side
// `Dashboard` — strip each module down to its serializable fields first.
function toDashboardModule(mod: (typeof modules)[number]) {
  const { slug, name, description, icon } = mod;
  return { slug, name, description, icon };
}

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
      return mod ? { pinId: pin.id, module: toDashboardModule(mod) } : null;
    })
    .filter((tile): tile is DashboardTile => tile !== null);

  const pinnedSlugs = new Set(tilePins.map((pin) => pin.module));
  const availableModules = modules
    .filter((mod) => !pinnedSlugs.has(mod.slug))
    .map(toDashboardModule);

  // Widgets are Server Components: render each one here, inside the platform
  // frame that owns its Suspense/error boundary (ADR-0005), and hand the
  // result to the client Dashboard as an opaque node — a rendered node can
  // cross that boundary where the component itself cannot.
  const widgetPins = resolveWidgetPins(modules, pins).map(
    ({ component: Widget, ...pin }) => ({
      ...pin,
      content: (
        <WidgetFrame name={pin.name}>
          <Widget />
        </WidgetFrame>
      ),
    }),
  );

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <Dashboard
        tiles={tiles}
        availableModules={availableModules}
        widgetPins={widgetPins}
        availableWidgets={listAvailableWidgets(modules, pins)}
      />
    </>
  );
}
