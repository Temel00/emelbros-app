"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import type { MachineState } from "./mock-data";

const MACHINE: MachineState[] = [
  "unsupported",
  "disconnected",
  "connected",
  "sending",
  "sent",
  "failed",
];

/** PROTOTYPE: floating variant switcher + machine-state forcer. */
export function PrototypeSwitcher({
  variants,
  current,
  machine,
  onMachine,
}: {
  variants: Record<string, string>;
  current: string;
  machine: MachineState;
  onMachine: (s: MachineState) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const keys = Object.keys(variants);
  const go = (delta: number) => {
    const next =
      keys[(keys.indexOf(current) + delta + keys.length) % keys.length];
    router.replace(`${pathname}?variant=${next}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input,textarea,select,[contenteditable]") ?? null))
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="fixed inset-x-0 bottom-3 z-50 flex flex-col items-center gap-1.5 px-4">
      <select
        aria-label="Force machine state"
        value={machine}
        onChange={(e) => onMachine(e.target.value as MachineState)}
        className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-white shadow-lg"
      >
        {MACHINE.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <div className="flex items-center gap-2 rounded-full bg-neutral-900 px-2 py-1.5 text-sm text-white shadow-lg">
        <button
          aria-label="Previous variant"
          onClick={() => go(-1)}
          className="p-1"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-40 text-center">
          {current} ({variants[current]})
        </span>
        <button aria-label="Next variant" onClick={() => go(1)} className="p-1">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
