"use client";

import { Component, type ReactNode } from "react";

/**
 * The per-widget error boundary required by ADR-0005: one crashed widget
 * degrades to a short message instead of taking the whole dashboard down.
 * A class component because React exposes no hook equivalent — and a client
 * component for the same reason, even though the widget inside it is a
 * Server Component (the boundary only catches what reaches the client).
 */
export class WidgetErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="text-sm text-muted-foreground">
          This widget couldn&apos;t load.
        </p>
      );
    }

    return this.props.children;
  }
}
