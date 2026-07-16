import Link from "next/link";

import { modules } from "@/modules";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Emelbros</h1>
        <p className="text-muted-foreground">A private family web platform.</p>
      </div>

      {modules.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No modules yet — the launcher fills in as modules are added.
        </p>
      ) : (
        <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
          {modules.map((mod) => (
            <li key={mod.slug}>
              <Link
                href={`/${mod.slug}`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto w-full py-4",
                )}
              >
                {mod.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
