import { AppHeader } from "@/components/app-header";
import {
  Dashboard,
  type DashboardTile,
  type DashboardWidgetTile,
} from "@/components/dashboard/dashboard";
import { WidgetFrame } from "@/components/dashboard/widget-frame";
import { modules } from "@/modules";
import { resolveIcon } from "@/lib/icon";
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

// Every (module, widget) pair the platform knows about — the pool the
// At-a-glance zone pins from. Rendering each widget stays on the server: only
// the resulting node crosses into the client `Dashboard`.
function allWidgets() {
  return modules.flatMap((mod) =>
    mod.widgets.map((widget) => ({ mod, widget })),
  );
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

  // Resolve each widget pin to its manifest widget and render its RSC inside
  // the platform frame; the client `Dashboard` only reorders these nodes.
  const widgetTiles = widgetPins
    .map((pin): DashboardWidgetTile | null => {
      const mod = modules.find((candidate) => candidate.slug === pin.module);
      const widget = mod?.widgets.find((w) => w.id === pin.widget);
      if (!mod || !widget) return null;
      const Widget = widget.component;
      return {
        pinId: pin.id,
        module: mod.slug,
        widget: widget.id,
        label: widget.name,
        node: (
          <WidgetFrame>
            <Widget />
          </WidgetFrame>
        ),
      };
    })
    .filter((tile): tile is DashboardWidgetTile => tile !== null);

  const pinnedWidgetKeys = new Set(
    widgetPins.map((pin) => `${pin.module}:${pin.widget}`),
  );
  const availableWidgets = allWidgets()
    .filter(
      ({ mod, widget }) => !pinnedWidgetKeys.has(`${mod.slug}:${widget.id}`),
    )
    .map(({ mod, widget }) => {
      const Icon = resolveIcon(mod.icon);
      return {
        module: mod.slug,
        widget: widget.id,
        label: widget.name,
        icon: <Icon className="size-6" aria-hidden />,
      };
    });

  return (
    <>
      <AppHeader memberId={member.id} supabase={supabase} />
      <Dashboard
        tiles={tiles}
        availableModules={availableModules}
        widgetTiles={widgetTiles}
        availableWidgets={availableWidgets}
      />
    </>
  );
}
