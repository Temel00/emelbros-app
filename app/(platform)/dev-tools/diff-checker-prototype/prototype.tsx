"use client";

// PROTOTYPE (#239): throwaway. Variant is chosen by ?variant=A|B|C|D.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { VARIANTS, type VariantId } from "./diff-model";
import { useDiffCtl } from "./shared";
import { VariantE, VariantF, VariantG } from "./variants2";
import { VariantA, VariantB, VariantC, VariantD } from "./variants";

const LABELS: Record<VariantId, string> = {
  A: "Aligned surface, edit in place",
  B: "Edit / Compare tabs",
  C: "Inputs + collapsed result + minimap",
  D: "Change list cards",
  E: "In-place edit, options panel (hide)",
  F: "In-place edit, options panel (icon rail)",
  G: "In-place edit, options drawer",
};

export function Prototype({ variant }: { variant: VariantId }) {
  const router = useRouter();
  const c = useDiffCtl();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") return;
      const i = VARIANTS.indexOf(variant);
      if (e.key === "ArrowRight")
        router.replace(`?variant=${VARIANTS[(i + 1) % VARIANTS.length]}`);
      if (e.key === "ArrowLeft")
        router.replace(
          `?variant=${VARIANTS[(i + VARIANTS.length - 1) % VARIANTS.length]}`,
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, router]);

  return (
    <>
      {variant === "A" && <VariantA c={c} />}
      {variant === "B" && <VariantB c={c} />}
      {variant === "C" && <VariantC c={c} />}
      {variant === "D" && <VariantD c={c} />}
      {variant === "E" && <VariantE c={c} />}
      {variant === "F" && <VariantF c={c} />}
      {variant === "G" && <VariantG c={c} />}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
          <div className="flex items-center gap-1 rounded-full border-2 border-input bg-background p-1 shadow-lg">
            {VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => router.replace(`?variant=${v}`)}
                className={
                  v === variant
                    ? "size-8 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                    : "size-8 rounded-full text-sm hover:bg-muted"
                }
              >
                {v}
              </button>
            ))}
            <span className="hidden px-2 text-xs text-muted-foreground sm:inline">
              {LABELS[variant]} · ←/→
            </span>
          </div>
        </div>
      )}
    </>
  );
}
