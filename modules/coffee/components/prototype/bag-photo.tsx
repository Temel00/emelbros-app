import { Coffee } from "lucide-react";

import type { MockBean } from "./mock-data";

/** PROTOTYPE placeholder for a portrait 1080x1920 (9:16) bag photo. */
export function BagPhoto({
  bean,
  className = "",
}: {
  bean: MockBean;
  className?: string;
}) {
  return (
    <div
      className={`relative flex aspect-[9/16] items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(160deg, hsl(${bean.hue} 35% 45%), hsl(${bean.hue} 40% 18%))`,
      }}
    >
      <Coffee className="size-1/4 text-white/40" aria-hidden />
      <span className="absolute bottom-2 left-2 text-[10px] tracking-widest text-white/50 uppercase">
        bag photo 9:16
      </span>
    </div>
  );
}
