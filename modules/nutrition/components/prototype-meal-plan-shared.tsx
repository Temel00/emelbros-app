"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #116 resolves.
 *
 * Round 2: mock plan data (now with multiple items per slot — a day can
 * have an omelet, an apple, and a banana all under breakfast), the shared
 * "assign a slot" dialog (now slot-agnostic — the caller offers one slot
 * or all four and the dialog lets the member pick), a week/month day-grid
 * helper, and the recipe quick-view peek. `nutrition_recipe` rows come
 * from the real dictionary (read-only, via `getRecipes` in the host page)
 * so the assign flow and quick view have real titles/ingredient counts to
 * show; the plan entries themselves are in-memory mock data — nothing
 * here writes to `nutrition_meal_plan_entry`.
 */

import {
  Apple,
  Check,
  Coffee,
  Plus,
  Sandwich,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
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
import { mealSlots, type MealSlot } from "@/modules/nutrition/lib/meal-slots";
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

export type RecipeSummary = {
  id: string;
  title: string;
  servings: number;
  ingredientCount: number;
};

export type PlanDay = {
  date: string;
  label: string;
  dayOfMonth: string;
  dayNumber: number;
};

export type MonthDay = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

export const SLOT_ICON: Record<string, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Sandwich,
  dinner: UtensilsCrossed,
  snack: Apple,
};

export const SLOT_DOT: Record<string, string> = {
  breakfast: "bg-amber-500",
  lunch: "bg-sky-500",
  dinner: "bg-violet-500",
  snack: "bg-emerald-500",
};

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
      dayNumber: d.getDate(),
    };
  });
}

/**
 * A Monday-aligned 6-week grid covering the month containing `from` —
 * enough rows for any month regardless of where it starts, matching
 * Google/Apple calendar's month view. Leading/trailing days from the
 * neighbouring months are included (`inCurrentMonth: false`) so the grid
 * never has ragged edges.
 */
export function getMonthGrid(from = new Date()): MonthDay[][] {
  const monthStart = new Date(from.getFullYear(), from.getMonth(), 1);
  const startDay = monthStart.getDay();
  const leadingDays = startDay === 0 ? 6 : startDay - 1;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - leadingDays);

  const weeks: MonthDay[][] = [];
  for (let week = 0; week < 6; week++) {
    const row: MonthDay[] = [];
    for (let day = 0; day < 7; day++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + week * 7 + day);
      row.push({
        date: toIsoDate(d),
        dayNumber: d.getDate(),
        inCurrentMonth: d.getMonth() === from.getMonth(),
      });
    }
    weeks.push(row);
  }
  return weeks;
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export function addWeeks(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + delta * 7);
  return next;
}

/**
 * A deliberately busy, uneven week: most cells empty, a couple of cooked
 * entries, both recipes and freeform titles, and — the thing round 1
 * didn't test — a breakfast with three separate items (an omelet plus two
 * freeform pieces of fruit) and a day with two snacks, so every variant
 * has to show its answer to "what does more than one thing in a slot look
 * like", not just 0-or-1.
 */
export function buildMockEntries(
  recipes: RecipeRow[],
  days: PlanDay[],
): MockPlanEntry[] {
  const fallbackTitles = ["Garlic pasta", "Sheet-pan chicken", "Veggie stir-fry"];
  const title = (i: number) => recipes[i]?.title ?? fallbackTitles[i % fallbackTitles.length];
  const id = (i: number) => recipes[i]?.id ?? null;

  const entries: Array<Omit<MockPlanEntry, "id">> = [
    // Day 0 — a three-item breakfast, plus a cooked dinner.
    {
      planDate: days[0].date,
      mealSlot: "breakfast",
      recipeId: null,
      recipeTitle: null,
      freeformTitle: "Omelet",
      servingsPlanned: 2,
      cookedAt: null,
    },
    {
      planDate: days[0].date,
      mealSlot: "breakfast",
      recipeId: null,
      recipeTitle: null,
      freeformTitle: "Apple",
      servingsPlanned: 1,
      cookedAt: null,
    },
    {
      planDate: days[0].date,
      mealSlot: "breakfast",
      recipeId: null,
      recipeTitle: null,
      freeformTitle: "Banana",
      servingsPlanned: 1,
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
    // Day 1 — one dinner, nothing else.
    {
      planDate: days[1].date,
      mealSlot: "dinner",
      recipeId: id(1),
      recipeTitle: title(1),
      freeformTitle: null,
      servingsPlanned: 2,
      cookedAt: null,
    },
    // Day 2 — a cooked lunch, plus a recipe breakfast and two snacks.
    {
      planDate: days[2].date,
      mealSlot: "breakfast",
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
      planDate: days[2].date,
      mealSlot: "snack",
      recipeId: null,
      recipeTitle: null,
      freeformTitle: "Yogurt",
      servingsPlanned: 1,
      cookedAt: `${days[2].date}T15:00:00.000Z`,
    },
    {
      planDate: days[2].date,
      mealSlot: "snack",
      recipeId: null,
      recipeTitle: null,
      freeformTitle: "Trail mix",
      servingsPlanned: 1,
      cookedAt: null,
    },
    // Day 3 — one dinner.
    {
      planDate: days[3].date,
      mealSlot: "dinner",
      recipeId: id(0),
      recipeTitle: title(0),
      freeformTitle: null,
      servingsPlanned: 3,
      cookedAt: null,
    },
    // Day 4 — eating out for dinner, a recipe for lunch.
    {
      planDate: days[4].date,
      mealSlot: "lunch",
      recipeId: id(2),
      recipeTitle: title(2),
      freeformTitle: null,
      servingsPlanned: 2,
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
    // Day 5 — a full day: breakfast, cooked dinner, and a snack.
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
      mealSlot: "snack",
      recipeId: null,
      recipeTitle: null,
      freeformTitle: "Protein shake",
      servingsPlanned: 1,
      cookedAt: null,
    },
    {
      planDate: days[5].date,
      mealSlot: "dinner",
      recipeId: id(0),
      recipeTitle: title(0),
      freeformTitle: null,
      servingsPlanned: 5,
      cookedAt: `${days[5].date}T19:00:00.000Z`,
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

export function entriesOnDate(
  entries: MockPlanEntry[],
  date: string,
): MockPlanEntry[] {
  return entries.filter((e) => e.planDate === date);
}

export function entryTitle(entry: MockPlanEntry): string {
  return entry.recipeTitle ?? entry.freeformTitle ?? "Untitled";
}

/**
 * Shared assign flow: recipe-first search (mirrors the food-first linking
 * pattern #113 settled) with a freeform tab as the escape hatch for
 * leftovers / eating out. `slots` is either a single fixed slot (the
 * picker is hidden) or all four (the member chooses one) — the same
 * dialog serves both a per-slot "+" and a day-level "add a meal" trigger.
 * Assigning never replaces what's already in a slot — a slot can hold
 * more than one item, same as a real breakfast can be an omelet and a
 * banana.
 */
export function AssignMealDialog({
  slots,
  recipes,
  trigger,
  onAssign,
}: {
  slots: MealSlot[];
  recipes: RecipeRow[];
  trigger: ReactElement;
  onAssign: (
    slotKey: string,
    input: {
      recipeId: string | null;
      recipeTitle: string | null;
      freeformTitle: string | null;
      servingsPlanned: number;
    },
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState(slots[0]?.key ?? "breakfast");
  const [tab, setTab] = useState<"recipe" | "freeform">("recipe");
  const [query, setQuery] = useState("");
  const [freeform, setFreeform] = useState("");
  const [servings, setServings] = useState("1");

  const matches = useMemo(
    () =>
      recipes.filter((r) =>
        r.title.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [recipes, query],
  );

  function reset() {
    setSlot(slots[0]?.key ?? "breakfast");
    setTab("recipe");
    setQuery("");
    setFreeform("");
    setServings("1");
  }

  function pickRecipe(recipe: RecipeRow) {
    onAssign(slot, {
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
    onAssign(slot, {
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
          <DialogTitle>Add a meal</DialogTitle>
        </DialogHeader>

        {slots.length > 1 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {slots.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSlot(s.key)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  slot === s.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

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

/**
 * The "little window view" of a recipe clicked from the plan: title,
 * servings, ingredient count, and a real link into the shipped recipe
 * detail page (#114, `/nutrition/recipes/[id]`) for "read the whole
 * thing" — a genuine navigation, so the browser back button is the way
 * back, not a prototype-only illusion of one. Only recipe-linked entries
 * are clickable; freeform entries (leftovers, eating out) have nothing to
 * peek at.
 */
export function RecipeQuickView({
  recipe,
  trigger,
}: {
  recipe: RecipeSummary;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-xs p-4">
        <div className="flex flex-col gap-1">
          <h3 className="pr-4 text-base font-bold">{recipe.title}</h3>
          <p className="text-sm text-muted-foreground">
            Serves {recipe.servings} · {recipe.ingredientCount}{" "}
            {recipe.ingredientCount === 1 ? "ingredient" : "ingredients"}
          </p>
        </div>
        <DialogFooter className="mt-3">
          <Button
            size="sm"
            variant="outline"
            render={
              <Link href={`/nutrition/recipes/${recipe.id}`}>
                Open full recipe
              </Link>
            }
          />
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

export const todayIso = new Date().toISOString().slice(0, 10);

export type AssignFn = (
  date: string,
  slot: string,
  input: {
    recipeId: string | null;
    recipeTitle: string | null;
    freeformTitle: string | null;
    servingsPlanned: number;
  },
) => void;

/**
 * One item, one chip: a slot-colour dot, the slot icon, the title (opens
 * the recipe quick-view when there's a recipe behind it, plain text when
 * freeform), and a trailing check button that toggles cooked as a separate
 * control from the name — round 3 standardises on this split everywhere
 * rather than repeating round 2's D-vs-E ambiguity in every new layout.
 */
export function Chip({
  entry,
  recipeSummaries,
  onToggleCooked,
}: {
  entry: MockPlanEntry;
  recipeSummaries: RecipeSummary[];
  onToggleCooked: (entryId: string) => void;
}) {
  const Icon = SLOT_ICON[entry.mealSlot] ?? SLOT_ICON.dinner;
  const cooked = Boolean(entry.cookedAt);
  const recipe = entry.recipeId
    ? recipeSummaries.find((r) => r.id === entry.recipeId)
    : undefined;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2 text-sm ${
        cooked ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${SLOT_DOT[entry.mealSlot] ?? "bg-muted-foreground"}`}
      />
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {recipe ? (
        <RecipeQuickView
          recipe={recipe}
          trigger={
            <button
              type="button"
              className={`max-w-32 truncate font-medium hover:underline ${cooked ? "text-muted-foreground line-through" : ""}`}
            >
              {entryTitle(entry)}
            </button>
          }
        />
      ) : (
        <span
          className={`max-w-32 truncate font-medium ${cooked ? "text-muted-foreground line-through" : ""}`}
        >
          {entryTitle(entry)}
        </span>
      )}
      {entry.servingsPlanned !== 1 && (
        <span className="text-xs text-muted-foreground">
          ×{entry.servingsPlanned}
        </span>
      )}
      <button
        type="button"
        onClick={() => onToggleCooked(entry.id)}
        aria-label={cooked ? "Mark not cooked" : "Mark cooked"}
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
          cooked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40"
        }`}
      >
        {cooked && <Check className="size-2.5" strokeWidth={3} />}
      </button>
    </div>
  );
}

/** A day's items as wrapping chips, plus a trailing "+ Add" trigger. */
export function DayChipList({
  date,
  entries,
  recipes,
  recipeSummaries,
  onAssign,
  onToggleCooked,
}: {
  date: string;
  entries: MockPlanEntry[];
  recipes: RecipeRow[];
  recipeSummaries: RecipeSummary[];
  onAssign: AssignFn;
  onToggleCooked: (entryId: string) => void;
}) {
  const dayEntries = entriesOnDate(entries, date);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {dayEntries.length === 0 && (
        <span className="text-xs text-muted-foreground">Nothing planned</span>
      )}
      {dayEntries.map((entry) => (
        <Chip
          key={entry.id}
          entry={entry}
          recipeSummaries={recipeSummaries}
          onToggleCooked={onToggleCooked}
        />
      ))}
      <AssignMealDialog
        slots={mealSlots()}
        recipes={recipes}
        onAssign={(slot, input) => onAssign(date, slot, input)}
        trigger={
          <button
            type="button"
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="size-3" />
            Add
          </button>
        }
      />
    </div>
  );
}

/**
 * The month view every round-2 variant converged on independently and
 * that survived the owner's round-2 reaction unchanged — a Monday-aligned
 * 6-week grid of dot-summary cells, tap a day for a chip-list peek with
 * the ability to add right there. Shared once now instead of duplicated
 * per variant, since round 3 is only replaying the week view.
 */
export function MonthGridView({
  monthGrid,
  entries,
  recipes,
  recipeSummaries,
  onAssign,
  onToggleCooked,
}: {
  monthGrid: MonthDay[][];
  entries: MockPlanEntry[];
  recipes: RecipeRow[];
  recipeSummaries: RecipeSummary[];
  onAssign: AssignFn;
  onToggleCooked: (entryId: string) => void;
}) {
  const [peekDate, setPeekDate] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="grid grid-cols-7 gap-1.5">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div
            key={label}
            className="px-1 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {monthGrid.flat().map((day) => {
          const dayEntries = entriesOnDate(entries, day.date);
          const shown = dayEntries.slice(0, 4);
          const overflow = dayEntries.length - shown.length;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setPeekDate(day.date)}
              className={`flex min-h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left ${
                day.inCurrentMonth
                  ? "border-border bg-card"
                  : "border-transparent text-muted-foreground/50"
              } ${day.date === todayIso ? "ring-1 ring-primary" : ""}`}
            >
              <span className="text-xs font-medium">{day.dayNumber}</span>
              <div className="flex flex-wrap gap-0.5">
                {shown.map((entry) => (
                  <span
                    key={entry.id}
                    title={entryTitle(entry)}
                    className={`size-1.5 rounded-full ${SLOT_DOT[entry.mealSlot] ?? "bg-muted-foreground"} ${entry.cookedAt ? "opacity-40" : ""}`}
                  />
                ))}
                {overflow > 0 && (
                  <span className="text-[0.6rem] text-muted-foreground">
                    +{overflow}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <DialogRoot
        open={peekDate !== null}
        onOpenChange={(next) => !next && setPeekDate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {peekDate &&
                new Date(`${peekDate}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
            </DialogTitle>
          </DialogHeader>
          {peekDate && (
            <div className="pt-2">
              <DayChipList
                date={peekDate}
                entries={entries}
                recipes={recipes}
                recipeSummaries={recipeSummaries}
                onAssign={onAssign}
                onToggleCooked={onToggleCooked}
              />
            </div>
          )}
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

export { mealSlots };
