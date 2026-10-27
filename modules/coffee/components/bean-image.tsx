import { Coffee } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A bean's bag image slot, 1080x1920 portrait (9:16). Photo hosting is not
 * decided yet, so `photo_path` is opaque and every bean shows the placeholder
 * until the photos tickets land.
 */
export function BeanImage({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground",
        className,
      )}
      role="img"
      aria-label="Bag photo placeholder"
    >
      <Coffee className="size-8" aria-hidden />
    </div>
  );
}
