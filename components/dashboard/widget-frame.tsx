"use client";

import { Component, Suspense, type ReactNode } from "react";

/**
 * The platform frame every dashboard widget renders inside (ADR-0005): it
 * owns the card chrome, a Suspense boundary, and an error boundary, so one
 * slow or crashing widget never takes down the dashboard. Widgets themselves
 * are zero-prop Server Components and know nothing about this frame.
 */
class WidgetErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function WidgetFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <WidgetErrorBoundary
        fallback={
          <p className="text-sm text-muted-foreground">
            This widget couldn’t load.
          </p>
        }
      >
        <Suspense
          fallback={
            <div className="h-16 animate-pulse rounded-md bg-muted" />
          }
        >
          {children}
        </Suspense>
      </WidgetErrorBoundary>
    </div>
  );
}
