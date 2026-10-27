import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { GrinderPanel } from "@/modules/coffee/components/grinder-panel";
import { BeanImage } from "@/modules/coffee/components/bean-image";
import type { CoffeeBeanWithProfiles } from "@/modules/coffee/queries";

/** A bean's notes and its grind profiles, finest to coarsest. */
export function BeanDetail({ bean }: { bean: CoffeeBeanWithProfiles }) {
  const facts = [
    bean.roaster,
    bean.origin,
    bean.roast_level && `${bean.roast_level} roast`,
  ].filter(Boolean);

  return (
    <>
      <Link
        href="/coffee"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Beans
      </Link>

      <div className="flex gap-4">
        <BeanImage className="w-28 shrink-0 sm:w-36" />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{bean.name}</h1>
          {facts.length > 0 && (
            <p className="text-sm capitalize text-muted-foreground">
              {facts.join(" · ")}
            </p>
          )}
          {bean.notes && <p className="mt-2 text-sm">{bean.notes}</p>}
        </div>
      </div>

      <GrinderPanel profiles={bean.profiles} />
    </>
  );
}
