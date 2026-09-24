import { Suspense } from "react";

import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import { PrototypeFlairBackground } from "@/modules/nutrition/components/prototype-flair-background";

/**
 * PROTOTYPE ATTACH POINT for wayfinder #187 — throwaway alongside the flair.
 *
 * There was no `nutrition/layout.tsx` before this (#184 map note): each of the
 * 7 screens self-assembled `<AppHeader>` + `<main>`. #187 needs a background
 * layer keyed by the active screen, so this is that attach point — the exact
 * mechanism the ticket asks to settle.
 *
 * `relative isolate` opens a stacking context so the flair can sit at `-z-10`
 * (above the app background, behind all content) without escaping behind the
 * body. The switcher (`?variant=` + theme toggle) rides here too, so it
 * persists across screen navigation. Both self-hide in production builds.
 *
 * When #187 resolves, the winning treatment becomes a real background
 * component and the switcher import drops; whether the layout itself survives
 * is part of the "attach mechanism" the resolution records.
 */
export default function NutritionPrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <Suspense fallback={null}>
        <PrototypeFlairBackground />
      </Suspense>
      {children}
      {/* Content-card treatment (title/tab) — the live question. Stacked above
          the flair bar. Dense flair is locked, so this is the bar in play. */}
      <Suspense fallback={null}>
        <PrototypeSwitcher
          param="card"
          label="card:"
          showTheme={false}
          positionClass="bottom-16 left-1/2 -translate-x-1/2"
          variants={[
            { key: "tab", name: "Soft folder tab" },
            { key: "chip", name: "Inset pill chip" },
            { key: "plain", name: "Heading + accent" },
          ]}
        />
      </Suspense>
      {/* Flair is locked to dense (owner's favourite); kept switchable to
          re-confirm against the others while the card treatment is chosen. */}
      <Suspense fallback={null}>
        <PrototypeSwitcher
          label="flair:"
          variants={[
            { key: "dense", name: "Dense (LOCKED)" },
            { key: "subtle", name: "Subtle (r1 leader)" },
            { key: "wildcard", name: "Wildcard (watermark)" },
            { key: "none", name: "None (control)" },
          ]}
        />
      </Suspense>
    </div>
  );
}
