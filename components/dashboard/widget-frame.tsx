import { Suspense, type ReactNode } from "react";

import { WidgetErrorBoundary } from "@/components/dashboard/widget-error-boundary";

/**
 * The platform frame every widget renders inside (ADR-0005): the widget's
 * name, a Suspense boundary so a slow widget streams in rather than holding
 * up the dashboard, and an error boundary so a crashed one doesn't break the
 * page. The widget itself takes zero props and fetches its own data.
 *
 * The name comes from the module manifest, so a pinned widget's heading and
 * its entry in the At-a-glance Add list can't drift apart — widgets render
 * only their body, never their own title.
 *
 * The card surface (border, background, padding) comes from the `PinZone`
 * card this is rendered into — the frame owns only what is widget-specific,
 * so pinned widgets and pinned app tiles share one chrome. Only the error
 * boundary needs to be a client component, so the frame itself stays server.
 */
export function WidgetFrame({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full flex-col gap-2 text-left">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {name}
      </h3>

      <WidgetErrorBoundary>
        <Suspense
          fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
        >
          {children}
        </Suspense>
      </WidgetErrorBoundary>
    </section>
  );
}
