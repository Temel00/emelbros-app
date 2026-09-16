"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when the prototype it's mounted in
 * resolves.
 *
 * Floating variant switcher: arrows + label, `?variant=` (or a caller-given
 * param key, when two switchers share a page) in the URL so a shape is
 * shareable and reload-stable. Lifted from the #119/#122 prototype rounds —
 * same bar, same keys, `paramKey` added so #125's trend-view switcher and
 * widget switcher can coexist without stomping each other's query param.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export type PrototypeVariant = { key: string; name: string };

export function PrototypeSwitcher({
  variants,
  current,
  paramKey = "variant",
}: {
  variants: PrototypeVariant[];
  current: string;
  paramKey?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  useEffect(() => {
    function navigate(delta: number) {
      const next =
        variants[(index + delta + variants.length) % variants.length];
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramKey, next.key);
      router.replace(`?${params.toString()}`);
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") navigate(-1);
      if (event.key === "ArrowRight") navigate(1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, paramKey, router, searchParams, variants]);

  if (process.env.NODE_ENV === "production") return null;

  function navigate(delta: number) {
    const next = variants[(index + delta + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, next.key);
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-neutral-900 px-2 py-1.5 font-mono text-xs text-white shadow-lg ring-1 ring-white/20">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Previous variant"
        className="rounded-full px-2 py-1 hover:bg-white/15"
      >
        ←
      </button>
      <span className="min-w-56 px-2 text-center tabular-nums">
        {variants[index].key} — {variants[index].name}
      </span>
      <button
        type="button"
        onClick={() => navigate(1)}
        aria-label="Next variant"
        className="rounded-full px-2 py-1 hover:bg-white/15"
      >
        →
      </button>
    </div>
  );
}
