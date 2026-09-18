"use client";

// PROTOTYPE — floating variant switcher. Remove with prototype code.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function PrototypeSwitcher({
  variants,
  labels,
  current,
}: {
  variants: string[];
  labels?: Record<string, string>;
  current: string;
}) {
  if (process.env.NODE_ENV === "production") return null;

  const router = useRouter();
  const pathname = usePathname();
  const currentIdx = Math.max(0, variants.indexOf(current));

  function cycle(dir: 1 | -1) {
    const next = variants[(currentIdx + dir + variants.length) % variants.length];
    router.replace(`${pathname}?variant=${next}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIdx]);

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/90 px-4 py-2 text-sm text-white shadow-xl">
      <button
        type="button"
        onClick={() => cycle(-1)}
        aria-label="Previous variant"
        className="hover:opacity-70"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="font-mono font-bold">{current}</span>
      {labels?.[current] && (
        <span className="text-white/60">· {labels[current]}</span>
      )}
      <button
        type="button"
        onClick={() => cycle(1)}
        aria-label="Next variant"
        className="hover:opacity-70"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
