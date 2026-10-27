import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Grind profiles
        </h2>
        {bean.profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No profiles yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bean.profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-card-foreground"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">{profile.label}</span>
                  {profile.description && (
                    <span className="text-sm text-muted-foreground">
                      {profile.description}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-lg font-semibold tabular-nums">
                  {profile.grind_size}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
