"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves.
 *
 * Mock plan data, the shared "assign a slot" dialog, and the harness that
 * switches between the three week-calendar variants. `nutrition_recipe`
 * rows come from the real dictionary (read-only, via `getRecipes` in the
 * host page) so the recipe-assign flow has real titles to search; the plan
 * entries themselves are in-memory mock data — nothing here writes to
 * `nutrition_meal_plan_entry`.
 */

import { Search } from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";

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
import { mealSlots } from "@/modules/nutrition/lib/meal-slots";
import type { RecipeRow } from "@/modules/nutrition/queries";

export type MockPlanEntry = {
  id: string;
  planDate: string; // ISO date, "YYYY-MM-DD"
  mealSlot: string; // key from mealSlots()
  recipeId: string | null;
  recipeTitle: string | null;
  freeformTitle: string | null;
  servingsPlanned: number;
  cookedAt: string | null; // ISO datetime, or null while still just planned
};

export type PlanDay = { date: string; label: string; dayOfMonth: string };

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `from` — the week the calendar opens on. */
export function getWeekDays(from = new Date()): PlanDay[] {
  const day = from.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(from);
  monday.setDate(from.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: toIsoDate(d),
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      dayOfMonth: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
  });
}

/**
 * A deliberately uneven week — most cells empty, a couple of cooked
 * entries, both a recipe and a freeform title, so every variant has to
 * show its answer to "what does an empty slot look like" and "how does a
 * cooked entry read differently" against the same data.
 */
export function buildMockEntries(
  recipes: RecipeRow[],
  days: PlanDay[],
): MockPlanEntry[] {
  const fallbackTitles = ["Garlic pasta", "Sheet-pan chicken", "Veggie stir-fry"];
  const title = (i: number) => recipes[i]?.title ?? fallbackTitles[i % fallbackTitles.length];
  const id = (i: number) => recipes[i]?.id ?? null;

  const entries: Array<Omit<MockPlanEntry, "id">> = [
    {
      planDate: days[0].date,
      mealSlot: "breakfast",
      recipeId: null,
      recipeTitle: null,
      freeformTitle: "Overnight oats",
      servingsPlanned: 2,
      cookedAt: null,
    },
    {
      planDate: days[0].date,
      mealSlot: "dinner",
      recipeId: id(0),
      recipeTitle: title(0),
      freeformTitle: null,
      servingsPlanned: 4,
      cookedAt: `${days[0].date}T18:45:00.000Z`,
    },
    {
      planDate: days[1].date,
      mealSlot: "dinner",
      recipeId: id(1),
      recipeTitle: title(1),
      freeformTitle: null,
      servingsPlanned: 2,
      cookedAt: null,
    },
    {
      planDate: days[2].date,
      mealSlot: "lunch",
      recipeId: null,
      recipeTitle: null,
      freeformTitle: "Leftovers",
      servingsPlanned: 2,
      cookedAt: `${days[2].date}T12:30:00.000Z`,
    },
    {
      planDate: days[3].date,
      mealSlot: "dinner",
      recipeId: id(0),
      recipeTitle: title(0),
      freeformTitle: null,
      servingsPlanned: 3,
      cookedAt: null,
    },
    {
      planDate: days[4].date,
      mealSlot: "dinner",
      recipeId: null,
      recipeTitle: null,
      freeformTitle: "Eating out",
      servingsPlanned: 4,
      cookedAt: null,
    },
    {
      planDate: days[5].date,
      mealSlot: "breakfast",
      recipeId: id(1),
      recipeTitle: title(1),
      freeformTitle: null,
      servingsPlanned: 2,
      cookedAt: null,
    },
    {
      planDate: days[5].date,
      mealSlot: "dinner",
      recipeId: id(2),
      recipeTitle: title(2),
      freeformTitle: null,
      servingsPlanned: 5,
      cookedAt: null,
    },
    // days[6] is left fully empty on purpose.
  ];

  return entries.map((e, i) => ({ ...e, id: `mock-${i}` }));
}

export function entryAt(
  entries: MockPlanEntry[],
  date: string,
  slot: string,
): MockPlanEntry[] {
  return entries.filter((e) => e.planDate === date && e.mealSlot === slot);
}

export function entryTitle(entry: MockPlanEntry): string {
  return entry.recipeTitle ?? entry.freeformTitle ?? "Untitled";
}

/**
 * Shared assign flow: recipe-first search (mirrors the food-first linking
 * pattern #113 settled) with a freeform tab as the escape hatch for
 * leftovers / eating out. Each variant supplies its own `trigger` so the
 * entry point can look different per layout while the picking flow itself
 * — the thing #114's recipe editor also does — stays one answer.
 */
export function AssignMealDialog({
  recipes,
  trigger,
  onAssign,
}: {
  recipes: RecipeRow[];
  trigger: ReactElement;
  onAssign: (input: {
    recipeId: string | null;
    recipeTitle: string | null;
    freeformTitle: string | null;
    servingsPlanned: number;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"recipe" | "freeform">("recipe");
  const [query, setQuery] = useState("");
  const [freeform, setFreeform] = useState("");
  const [servings, setServings] = useState("2");

  const matches = useMemo(
    () =>
      recipes.filter((r) =>
        r.title.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [recipes, query],
  );

  function reset() {
    setTab("recipe");
    setQuery("");
    setFreeform("");
    setServings("2");
  }

  function pickRecipe(recipe: RecipeRow) {
    onAssign({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      freeformTitle: null,
      servingsPlanned: Number(servings) || 1,
    });
    setOpen(false);
    reset();
  }

  function submitFreeform() {
    if (freeform.trim() === "") return;
    onAssign({
      recipeId: null,
      recipeTitle: null,
      freeformTitle: freeform.trim(),
      servingsPlanned: Number(servings) || 1,
    });
    setOpen(false);
    reset();
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a meal</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 pt-2">
          <button
            type="button"
            onClick={() => setTab("recipe")}
            className={`rounded-md px-2.5 py-1 text-sm font-medium ${
              tab === "recipe"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            From recipe box
          </button>
          <button
            type="button"
            onClick={() => setTab("freeform")}
            className={`rounded-md px-2.5 py-1 text-sm font-medium ${
              tab === "freeform"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Freeform (leftovers, eating out…)
          </button>
        </div>

        <div className="flex flex-col gap-1.5 pt-2">
          <Label htmlFor="proto-mp-servings">Servings planned</Label>
          <Input
            id="proto-mp-servings"
            type="number"
            min="1"
            step="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-24"
          />
        </div>

        {tab === "recipe" ? (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
            <div className="flex items-center gap-2">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search recipes…"
                aria-label="Search recipes"
                className="min-w-0 flex-1"
              />
            </div>
            <ul className="flex max-h-48 flex-col overflow-y-auto">
              {matches.map((recipe) => (
                <li key={recipe.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => pickRecipe(recipe)}
                  >
                    <span>{recipe.title}</span>
                    <span className="text-xs text-muted-foreground">
                      serves {recipe.servings}
                    </span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="px-2 py-1.5 text-xs text-muted-foreground">
                  No recipes match — try the freeform tab instead.
                </li>
              )}
            </ul>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <Label htmlFor="proto-mp-freeform">Title</Label>
            <Input
              id="proto-mp-freeform"
              autoFocus
              value={freeform}
              onChange={(e) => setFreeform(e.target.value)}
              placeholder="Leftovers, eating out, takeout…"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["Leftovers", "Eating out", "Takeout"].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setFreeform(suggestion)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {tab === "freeform" && (
            <Button
              type="button"
              onClick={submitFreeform}
              disabled={freeform.trim() === ""}
            >
              Assign
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

export { mealSlots };
