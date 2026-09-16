"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #125 resolves.
 *
 * Client-only hook that builds mock overview widget card(s) for splicing
 * into the real dashboard's "At a glance" zone, so the widget is judged
 * inside the real grid alongside My Darts / Habits / My Lists rather than
 * in isolation, per the ticket. Reads its own `?widgetVariant=` (distinct
 * from the trend view's `?variant=`, via `paramKey`) so the two prototypes
 * on this branch don't collide if ever viewed together.
 *
 * Variants A and B return one mock `PinZoneItem`; Variant C returns two —
 * that's the "does this split into two cards" question, made real.
 */

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { WidgetFrame } from "@/components/dashboard/widget-frame";
import type { PinZoneItem } from "@/components/dashboard/pin-zone";
import {
  PrototypeSwitcher,
  type PrototypeVariant,
} from "@/components/prototype/prototype-switcher";
import {
  buildMockCaloriesToday,
  buildMockTodaysPlan,
} from "./prototype-overview-shared";
import { OverviewWidgetVariantA } from "./prototype-overview-widget-variant-a";
import { OverviewWidgetVariantB } from "./prototype-overview-widget-variant-b";
import {
  OverviewWidgetVariantC_Calories,
  OverviewWidgetVariantC_Plan,
} from "./prototype-overview-widget-variant-c";

const WIDGET_VARIANTS: PrototypeVariant[] = [
  { key: "a", name: "One card, full list" },
  { key: "b", name: "One card, progress line" },
  { key: "c", name: "Split into two cards" },
];

export function usePrototypeOverviewWidgetItems(): {
  items: PinZoneItem[];
  switcher: React.ReactNode;
} {
  const searchParams = useSearchParams();
  const widgetVariant = searchParams.get("widgetVariant") ?? "a";

  const caloriesToday = useMemo(() => buildMockCaloriesToday(), []);
  const plan = useMemo(() => buildMockTodaysPlan(), []);

  const items: PinZoneItem[] = useMemo(() => {
    if (widgetVariant === "b") {
      return [
        {
          pinId: "prototype-overview-widget",
          key: "prototype:nutrition-overview",
          label: "Nutrition (prototype)",
          content: (
            <WidgetFrame name="Nutrition (prototype)">
              <OverviewWidgetVariantB
                caloriesToday={caloriesToday}
                plan={plan}
              />
            </WidgetFrame>
          ),
        },
      ];
    }

    if (widgetVariant === "c") {
      return [
        {
          pinId: "prototype-overview-widget-calories",
          key: "prototype:nutrition-overview-calories",
          label: "Calories today (prototype)",
          content: (
            <WidgetFrame name="Calories today (prototype)">
              <OverviewWidgetVariantC_Calories caloriesToday={caloriesToday} />
            </WidgetFrame>
          ),
        },
        {
          pinId: "prototype-overview-widget-plan",
          key: "prototype:nutrition-overview-plan",
          label: "Today's meals (prototype)",
          content: (
            <WidgetFrame name="Today's meals (prototype)">
              <OverviewWidgetVariantC_Plan plan={plan} />
            </WidgetFrame>
          ),
        },
      ];
    }

    return [
      {
        pinId: "prototype-overview-widget",
        key: "prototype:nutrition-overview",
        label: "Nutrition (prototype)",
        content: (
          <WidgetFrame name="Nutrition (prototype)">
            <OverviewWidgetVariantA caloriesToday={caloriesToday} plan={plan} />
          </WidgetFrame>
        ),
      },
    ];
  }, [widgetVariant, caloriesToday, plan]);

  const switcher = (
    <PrototypeSwitcher
      variants={WIDGET_VARIANTS}
      current={widgetVariant}
      paramKey="widgetVariant"
    />
  );

  return { items, switcher };
}
