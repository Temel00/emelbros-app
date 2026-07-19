"use client";

/** PROTOTYPE (#68) — throwaway floating variant switcher. */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function PrototypeSwitcher({
  variants,
  names,
  current,
}: {
  variants: string[];
  names: Record<string, string>;
  current: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const go = (delta: number) => {
    const i = variants.indexOf(current);
    const next = variants[(i + delta + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-neutral-900 px-2 py-1.5 text-white shadow-xl ring-1 ring-white/20">
      <button
        onClick={() => go(-1)}
        aria-label="Previous variant"
        className="size-7 rounded-full text-lg leading-none hover:bg-white/15"
      >
        ‹
      </button>
      <span className="px-2 font-mono text-xs whitespace-nowrap">
        {current} — {names[current]}
      </span>
      <button
        onClick={() => go(1)}
        aria-label="Next variant"
        className="size-7 rounded-full text-lg leading-none hover:bg-white/15"
      >
        ›
      </button>
    </div>
  );
}
