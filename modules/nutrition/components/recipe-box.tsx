"use client";

import { useRouter } from "next/navigation";
import { Plus, UtensilsCrossed } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRecipeAction } from "@/modules/nutrition/actions";
import type { RecipeRow } from "@/modules/nutrition/queries";

/**
 * The recipe box (nutrition.md §3.3, wayfinder #113's resolution): a
 * spreadsheet-style table rather than a card grid, so it stays scannable
 * from three recipes to forty. The settled design language also calls for
 * category and prep/cook/total-time columns, but `nutrition_recipe` (#112)
 * has no such fields — recording them would need its own schema ticket —
 * so this box keeps only the columns the data actually has: icon slot,
 * name, and servings. Noted as a deliberate departure in the PR.
 */
export function RecipeBox({ recipes }: { recipes: RecipeRow[] }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <NewRecipeDialog />
      </div>

      {recipes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No recipes yet — add the first one above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <th className="w-10 px-3 py-2 text-left font-medium" />
                <th className="px-2 py-2 text-left font-medium">Recipe</th>
                <th className="px-3 py-2 text-right font-medium">Servings</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((recipe, i) => (
                <tr
                  key={recipe.id}
                  onClick={() => router.push(`/nutrition/recipes/${recipe.id}`)}
                  className={`cursor-pointer text-left transition-colors hover:bg-muted/60 ${
                    i % 2 === 1 ? "bg-muted/20" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <UtensilsCrossed className="size-4" />
                    </span>
                  </td>
                  <td className="min-w-40 px-2 py-2 font-medium">
                    {recipe.title}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {recipe.servings}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewRecipeDialog() {
  const router = useRouter();
  const titleId = useId();
  const servingsId = useId();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const recipe = await createRecipeAction({
          title,
          servings: Number(servings),
        });
        setOpen(false);
        setTitle("");
        setServings("1");
        router.push(`/nutrition/recipes/${recipe.id}`);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Couldn't create that",
        );
      }
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus data-icon="inline-start" />
            New recipe
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New recipe</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Weeknight garlic pasta"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={servingsId}>Servings</Label>
            <Input
              id={servingsId}
              type="number"
              min="1"
              step="1"
              value={servings}
              onChange={(event) => setServings(event.target.value)}
              className="w-24"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={pending || title.trim().length === 0}
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
