"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #74 resolves.
 *
 * Floating variant switcher: arrows + label, `?variant=` in the URL so a
 * shape is shareable and reload-stable. Carries a theme toggle because the
 * scoring rings are colour-coded and both grounds need judging.
 *
 * Lifted from the #70 sign-in round (commit e714011) unchanged apart from
 * this comment — same bar, same keys, so it behaves the way the last few
 * prototype rounds did.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export type PrototypeVariant = { key: string; name: string };

function useIsDark() {
  // Deliberately naive — prototype code, not the real useSyncExternalStore
  // dance in components/theme-toggle.tsx.
  return typeof document !== "undefined"
    ? document.documentElement.classList.contains("dark")
    : false;
}

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: PrototypeVariant[];
  current: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDark = useIsDark();

  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  useEffect(() => {
    function go(delta: number) {
      const next =
        variants[(index + delta + variants.length) % variants.length];
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", next.key);
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
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, router, searchParams, variants]);

  if (process.env.NODE_ENV === "production") return null;

  function navigate(delta: number) {
    const next = variants[(index + delta + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next.key);
    router.replace(`?${params.toString()}`);
  }

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("emelbros-theme", nextDark ? "dark" : "light");
    router.refresh();
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
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="ml-1 rounded-full border-l border-white/20 px-2 py-1 hover:bg-white/15"
      >
        {isDark ? "☀" : "☾"}
      </button>
    </div>
  );
}
