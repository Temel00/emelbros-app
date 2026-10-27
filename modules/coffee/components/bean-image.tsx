import { Coffee } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { getPhotoUrl } from "@/modules/coffee/lib/photo-url";
import type { CoffeeBeanRow } from "@/modules/coffee/queries";

/**
 * A bean's bag image slot, 1080x1920 portrait (9:16). Renders the stored photo
 * through `next/image` with its blur-up placeholder, or a static silhouette
 * when the bean has no photo.
 */
export function BeanImage({
  bean,
  sizes,
  className,
}: {
  bean: Pick<CoffeeBeanRow, "name" | "photo_path" | "photo_blur">;
  sizes: string;
  className?: string;
}) {
  const url = getPhotoUrl(bean.photo_path);
  const frame = cn(
    "relative aspect-[9/16] w-full overflow-hidden rounded-md bg-muted",
    className,
  );

  if (!url) {
    return (
      <div
        className={cn(
          frame,
          "flex items-center justify-center text-muted-foreground",
        )}
        role="img"
        aria-label="No bag photo"
      >
        <Coffee className="size-8" aria-hidden />
      </div>
    );
  }

  return (
    <div className={frame}>
      <Image
        src={url}
        alt={`${bean.name} bag`}
        fill
        sizes={sizes}
        quality={75}
        className="object-cover"
        {...(bean.photo_blur
          ? { placeholder: "blur", blurDataURL: bean.photo_blur }
          : {})}
      />
    </div>
  );
}
