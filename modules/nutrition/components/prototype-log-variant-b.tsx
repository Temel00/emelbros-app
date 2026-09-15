"use client";

/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #122 resolves.
 *
 * Variant B — "Unified search-first": one always-visible search box is the
 * whole entry surface. Empty state shows recent/frequent chips (one tap
 * logs instantly, at their last-used quantity/portion — the fastest repeat
 * path of the three variants). Typing mixes today's plan, food-dictionary,
 * and a freeform fallback into a single ranked list; picking a result
 * (other than a chip) opens an inline quantity/portion step before it logs.
 * No mode is ever chosen explicitly — the query decides what matches.
 *
 * Tap counts from an empty search box:
 *  - Repeat via chip                                     = 1 tap
 *  - Cooked, accept planned portion: type/clear → pick → Log = 2 taps (+ typing)
 *  - Food dictionary: type → pick → Log                   = 2 taps (+ typing)
 *  - Freeform: type → pick a size chip                    = 1 tap (+ typing)
 */
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogDayList } from "@/modules/nutrition/components/prototype-log-day-list";
import type { LogVariantProps } from "@/modules/nutrition/components/prototype-log-harness";
import {
  ROUGH_GUESS_MACROS,
  type RoughGuessSize,
} from "@/modules/nutrition/components/prototype-log-shared";

type Pending =
  | { kind: "recipe"; recipeId: string; title: string }
  | { kind: "food"; foodId: string; name: string; unit: string };

export function VariantB(props: LogVariantProps) {
  const { entries, editEntry, deleteEntry, repeatEntry, frequent } = props;
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  const matchingRecipes = useMemo(
    () =>
      props.todaysPlan.filter(
        (p) =>
          p.recipe &&
          p.recipe.title.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [props.todaysPlan, query],
  );
  const matchingFoods = useMemo(
    () =>
      props.foods
        .filter((f) =>
          f.name.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .slice(0, 5),
    [props.foods, query],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPending(null);
            }}
            placeholder="What did you eat? Search a meal or food, or type freeform…"
            aria-label="Log a meal"
            className="min-w-0 flex-1"
          />
          {query !== "" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {pending ? (
          <PendingStep
            pending={pending}
            onCancel={() => setPending(null)}
            onLog={(quantityOrPortion) => {
              if (pending.kind === "recipe") {
                props.logRecipe(pending.recipeId, quantityOrPortion);
              } else {
                props.logFood(pending.foodId, quantityOrPortion);
              }
              setPending(null);
              setQuery("");
            }}
          />
        ) : query.trim() === "" ? (
          <FrequentChips
            frequent={frequent}
            onRepeatFood={(foodId, quantity) => {
              props.logFood(foodId, quantity);
            }}
            onRepeatRecipe={(recipeId, portion) => {
              props.logRecipe(recipeId, portion);
            }}
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {matchingRecipes.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    p.recipe &&
                    setPending({
                      kind: "recipe",
                      recipeId: p.recipe.id,
                      title: p.recipe.title,
                    })
                  }
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span>🍳 {p.recipe?.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {p.meal_slot}, today
                  </span>
                </button>
              </li>
            ))}
            {matchingFoods.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() =>
                    setPending({
                      kind: "food",
                      foodId: f.id,
                      name: f.name,
                      unit: f.unit,
                    })
                  }
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span>📦 {f.name}</span>
                  <span className="text-xs text-muted-foreground">
                    base: {f.unit}
                  </span>
                </button>
              </li>
            ))}
            <FreeformRow
              query={query.trim()}
              onLog={(description, guess) => {
                props.logFreeform(description, guess);
                setQuery("");
              }}
            />
          </ul>
        )}
      </div>

      <LogDayList
        entries={entries}
        onEdit={editEntry}
        onDelete={deleteEntry}
        onRepeat={repeatEntry}
      />
    </div>
  );
}

function FrequentChips({
  frequent,
  onRepeatFood,
  onRepeatRecipe,
}: {
  frequent: LogVariantProps["frequent"];
  onRepeatFood: (foodId: string, quantity: number) => void;
  onRepeatRecipe: (recipeId: string, portion: number) => void;
}) {
  if (frequent.foods.length === 0 && frequent.recipes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Type to search — your frequent items will show up here as one-tap chips.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {frequent.recipes.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onRepeatRecipe(r.id, 1)}
          className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/70"
        >
          🍳 {r.title}
        </button>
      ))}
      {frequent.foods.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onRepeatFood(f.id, 1)}
          className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/70"
        >
          📦 {f.name}
        </button>
      ))}
    </div>
  );
}

function PendingStep({
  pending,
  onCancel,
  onLog,
}: {
  pending: Pending;
  onCancel: () => void;
  onLog: (quantityOrPortion: number) => void;
}) {
  const [value, setValue] = useState("1");
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted p-2">
      <span className="flex-1 text-sm font-medium">
        {pending.kind === "recipe" ? pending.title : pending.name}
      </span>
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20"
        aria-label={
          pending.kind === "recipe"
            ? "Portion multiplier"
            : `Quantity in ${pending.unit}`
        }
      />
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Back
      </Button>
      <Button type="button" size="sm" onClick={() => onLog(Number(value))}>
        Log
      </Button>
    </div>
  );
}

function FreeformRow({
  query,
  onLog,
}: {
  query: string;
  onLog: (description: string, guess: RoughGuessSize) => void;
}) {
  if (query === "") return null;
  return (
    <li className="flex flex-col gap-1 border-t border-border pt-1.5">
      <p className="px-2 text-xs text-muted-foreground">
        Log “{query}” freeform — pick a rough size:
      </p>
      <div className="flex flex-wrap gap-1.5 px-2">
        {(Object.keys(ROUGH_GUESS_MACROS) as RoughGuessSize[]).map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onLog(query, size)}
            className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
          >
            {ROUGH_GUESS_MACROS[size].label}
          </button>
        ))}
      </div>
    </li>
  );
}
