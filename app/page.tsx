import { AppHeader } from "@/components/app-header";
import {
  Dashboard,
  type DashboardTile,
  type DashboardWidget,
  type DashboardWidgetCandidate,
} from "@/components/dashboard/dashboard";
import { WidgetFrame } from "@/components/dashboard/widget-frame";
import { modules } from "@/modules";
import { getCurrentMember } from "@/platform/auth";
import { getPins } from "@/platform/queries";
import { createClient } from "@/platform/supabase/server";

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
  const widgetPins = pins.filter((pin) => pin.widget !== null);

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

  // Widgets are zero-prop RSCs (ADR-0005): render each inside the platform
  // frame here on the server and pass the elements to the client dashboard,
  // which reorders/unpins them but never touches their data.
  const widgets = widgetPins
    .map((pin): DashboardWidget | null => {
      const mod = modules.find((candidate) => candidate.slug === pin.module);
      const widget = mod?.widgets.find((w) => w.id === pin.widget);
      if (!mod || !widget) return null;
      const Widget = widget.component;
      return {
        pinId: pin.id,
        module: mod.slug,
        widget: widget.id,
        label: widget.name,
        content: (
          <WidgetFrame>
            <Widget />
          </WidgetFrame>
        ),
      };
    })
    .filter((widget): widget is DashboardWidget => widget !== null);

  const pinnedWidgetKeys = new Set(
    widgetPins.map((pin) => `${pin.module}:${pin.widget}`),
  );
  const availableWidgets: DashboardWidgetCandidate[] = modules.flatMap((mod) =>
    mod.widgets
      .filter((widget) => !pinnedWidgetKeys.has(`${mod.slug}:${widget.id}`))
      .map((widget) => ({
        module: mod.slug,
        widget: widget.id,
        label: widget.name,
        icon: mod.icon,
      })),
  );

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <Dashboard
        tiles={tiles}
        availableModules={availableModules}
        widgets={widgets}
        availableWidgets={availableWidgets}
      />
    </>
  );
}
