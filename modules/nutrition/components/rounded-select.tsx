"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Canonical unit/vocabulary select for the Nutrition module (input-style
 * rollout #169, Variant D). A custom dropdown that opens a rounded, bordered
 * floating panel instead of the OS-default select popup, so the control matches
 * the Variant D field styling in both light and dark themes.
 */
export function RoundedSelect({
  value,
  onChange,
  options,
  id,
  disabled = false,
  className,
  placeholder = "Select…",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  id?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border-2 border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-primary disabled:pointer-events-none disabled:opacity-50"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn(!value && "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={opt === value}
              className={cn(
                "w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                opt === value && "font-medium text-primary",
              )}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
