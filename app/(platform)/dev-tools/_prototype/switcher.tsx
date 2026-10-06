"use client";

// PROTOTYPE (#196): floating variant switcher. Dev-only; delete with the prototype.
import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const VARIANTS = [
  { key: "A", name: "Tokens · scroll grid" },
  { key: "B", name: "Tokens · fixed 4×5" },
  { key: "C", name: "Workshop · scroll pegboard" },
  { key: "D", name: "Workshop · fixed 4×5 cabinet" },
] as const;

export function PrototypeSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("variant") ?? "A";
  const index = Math.max(
    0,
    VARIANTS.findIndex((v) => v.key === current),
  );

  const go = useCallback(
    (delta: number) => {
      const next =
        VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
      router.replace(`${pathname}?variant=${next.key}`);
    },
    [index, pathname, router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black px-4 py-2 text-sm text-white shadow-lg">
      <button
        aria-label="Previous variant"
        onClick={() => go(-1)}
        className="px-2"
      >
        ←
      </button>
      <span className="font-mono whitespace-nowrap">
        {VARIANTS[index].key} ({VARIANTS[index].name})
      </span>
      <button aria-label="Next variant" onClick={() => go(1)} className="px-2">
        →
      </button>
    </div>
  );
}
