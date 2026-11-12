"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** CSS-only tooltip, shown on hover and keyboard focus. */
export function Tip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-8 left-1/2 z-30 hidden -translate-x-1/2 rounded bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background group-focus-within:block group-hover:block"
      >
        {label}
      </span>
    </span>
  );
}

/** Icon-only button: tooltip plus matching accessible name. */
export function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  expanded,
  controls,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  children: ReactNode;
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        aria-expanded={expanded}
        aria-controls={controls}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-lg border-2 border-input bg-background text-foreground hover:bg-muted disabled:opacity-40",
          pressed && "border-primary bg-primary/10",
        )}
      >
        {children}
      </button>
    </Tip>
  );
}
