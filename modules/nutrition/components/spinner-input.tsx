"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Canonical quantity control for the Nutrition module (input-style rollout #169,
 * Variant D). A `<input type="number">` wrapped with stacked ▲▼ chevron buttons
 * inside the field boundary; native spin buttons are hidden via `.no-spinners`
 * (see `globals.css`) so the custom controls are the only affordance.
 *
 * `onFocus` auto-selects the value: mobile brings up the numpad, desktop lets
 * you overtype without clearing first.
 */
export function SpinnerInput({
  value,
  onChange,
  min = 0,
  id,
  name,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Quantity",
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const n = parseFloat(value) || 0;
  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-lg border-2 border-input transition-colors focus-within:border-primary",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        type="number"
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="no-spinners h-9 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
        aria-label={ariaLabel}
      />
      <div className="flex flex-col border-l-2 border-input">
        <button
          type="button"
          aria-label="Increase"
          disabled={disabled}
          onClick={() => onChange(String(n + 1))}
          className="flex w-8 flex-1 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          aria-label="Decrease"
          disabled={disabled}
          onClick={() => onChange(String(Math.max(min, n - 1)))}
          className="flex w-8 flex-1 items-center justify-center border-t-2 border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className="size-3" />
        </button>
      </div>
    </div>
  );
}
