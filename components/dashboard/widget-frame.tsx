"use client";

import { Component, Suspense, type ReactNode } from "react";

/**
 * The platform frame every dashboard widget renders inside (ADR-0005): it owns
 * the card chrome, a Suspense boundary, and an error boundary, so one slow or
 * crashed widget degrades to a small message rather than breaking the whole
 * At-a-glance zone. Widgets themselves stay zero-prop RSCs that know nothing
 * of this wrapper.
 */
class WidgetErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="text-sm text-muted-foreground">
          This widget couldn&apos;t load.
        </p>
      );
    }
    return this.props.children;
  }
}

export function WidgetFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <WidgetErrorBoundary>
        <Suspense
          fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
        >
          {children}
        </Suspense>
      </WidgetErrorBoundary>
    </div>
  );
}
