import Link from "next/link";

import { BeanImage } from "@/modules/coffee/components/bean-image";
import type { CoffeeBeanRow } from "@/modules/coffee/queries";

/** One bean in the list grid; the whole card opens its detail page. */
export function BeanCard({ bean }: { bean: CoffeeBeanRow }) {
  return (
    <Link
      href={`/coffee/${bean.id}`}
      className="flex flex-col gap-2 rounded-lg border bg-card p-2 text-card-foreground transition-colors hover:bg-accent"
    >
      <BeanImage
        bean={bean}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
      />
      <div className="flex flex-col gap-0.5 px-1 pb-1">
        <span className="font-medium leading-tight">{bean.name}</span>
        {bean.roaster && (
          <span className="text-sm text-muted-foreground">{bean.roaster}</span>
        )}
        {bean.origin && (
          <span className="text-xs text-muted-foreground">{bean.origin}</span>
        )}
        {bean.roast_level && (
          <span className="text-xs capitalize text-muted-foreground">
            {bean.roast_level} roast
          </span>
        )}
      </div>
    </Link>
  );
}
