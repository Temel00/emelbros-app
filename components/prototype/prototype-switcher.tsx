"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #187 resolves.
 *
 * Floating variant switcher: arrows + label, `?variant=` in the URL so a
 * treatment is shareable and reload-stable. Carries a theme toggle because
 * the flair is tinted and theme-aware — both grounds (light + dark) have to
 * be judged. Same bar/keys the last few prototype rounds used (#70, #74,
 * #116), lifted unchanged apart from this comment and the label width.
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
  param = "variant",
  label,
  positionClass = "bottom-4 left-1/2 -translate-x-1/2",
  showTheme = true,
}: {
  variants: PrototypeVariant[];
  /**
   * Current variant key. Optional: when omitted (e.g. mounted in a server
   * layout that can't read searchParams), it's derived from the URL param,
   * falling back to the first variant.
   */
  current?: string;
  /** URL search param this bar drives. Lets several bars co-exist. */
  param?: string;
  /** Optional short label shown before the variant name. */
  label?: string;
  /** Tailwind position classes so multiple bars can stack. */
  positionClass?: string;
  /** Show the theme toggle. Off for secondary bars to avoid duplicates. */
  showTheme?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDark = useIsDark();

  const active = current ?? searchParams.get(param) ?? variants[0]?.key;
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === active),
  );

  useEffect(() => {
    function go(delta: number) {
      const next =
        variants[(index + delta + variants.length) % variants.length];
      const params = new URLSearchParams(searchParams.toString());
      params.set(param, next.key);
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

    // Only the primary bar binds arrow keys, so a second stacked bar
    // (e.g. `?card=`) doesn't get driven by the same keypress.
    if (param !== "variant") return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, router, searchParams, variants, param]);

  if (process.env.NODE_ENV === "production") return null;

  function navigate(delta: number) {
    const next = variants[(index + delta + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, next.key);
    router.replace(`?${params.toString()}`);
  }

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("emelbros-theme", nextDark ? "dark" : "light");
    router.refresh();
  }

  return (
    <div
      className={`fixed ${positionClass} z-50 flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-1.5 font-mono text-xs text-white shadow-lg ring-1 ring-white/20`}
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Previous variant"
        className="rounded-full px-2 py-1 hover:bg-white/15"
      >
        ←
      </button>
      <span className="min-w-40 px-2 text-center tabular-nums">
        {label ? <span className="text-white/50">{label} </span> : null}
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
      {showTheme ? (
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="ml-1 rounded-full border-l border-white/20 px-2 py-1 hover:bg-white/15"
        >
          {isDark ? "☀" : "☾"}
        </button>
      ) : null}
    </div>
  );
}
