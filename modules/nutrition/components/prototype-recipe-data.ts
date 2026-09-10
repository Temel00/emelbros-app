/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #113 resolves.
 *
 * In-memory recipe data for the recipe-design-language prototype. Never
 * touches `nutrition_recipe` — the question is what the screens should look
 * like, not whether the backend works (already shipped in #112).
 */

export type MockIngredient = {
  id: string;
  displayText: string;
  foodId: string | null;
  quantity: number | null;
  unit: string | null;
};

export type MockRecipe = {
  id: string;
  title: string;
  category: string;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  instructions: string;
  ingredients: MockIngredient[];
};

/** `prep + cook`, or `null` when neither is known — round 2's table needs a Total column. */
export function totalTimeMinutes(recipe: MockRecipe): number | null {
  if (recipe.prepTimeMinutes == null && recipe.cookTimeMinutes == null) {
    return null;
  }
  return (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
}

/** `25 min` / `1 hr 10 min` — the box and detail header both need this. */
export function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hrs} hr` : `${hrs} hr ${rest} min`;
}

export const RECIPE_CATEGORIES = [
  "Weeknight",
  "Roast",
  "Batch cook",
  "Breakfast",
  "Quick",
  "Soup",
  "Salad",
] as const;

function ingredient(
  id: string,
  displayText: string,
  quantity: number | null = null,
  unit: string | null = null,
): MockIngredient {
  return { id, displayText, foodId: null, quantity, unit };
}

/**
 * The fleshed-out recipes: real ingredient lists, long enough to test the
 * editor and the "40 recipes" density case doesn't need every row this
 * detailed. `linkFirstTwo` optionally links the first two ingredient lines
 * to real foods (if any exist) so the box shows a mixed linked/unlinked
 * state by default rather than an all-unlinked one.
 */
function seedRecipes(): MockRecipe[] {
  const fleshedOut: MockRecipe[] = [
    {
      id: "r1",
      title: "Weeknight garlic pasta",
      category: "Weeknight",
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      instructions:
        "Boil the pasta in salted water until just shy of al dente.\n\nMeanwhile, warm the olive oil in a wide pan and add the garlic, chilli flakes, and a pinch of salt. Cook gently until the garlic is fragrant but not coloured, about 2 minutes.\n\nDrain the pasta, reserving a cup of the water. Toss the pasta into the pan with a splash of the pasta water, the parmesan, and the parsley. Toss vigorously off the heat until glossy.",
      ingredients: [
        ingredient("r1i1", "2 cloves garlic, minced", 2, "clove"),
        ingredient("r1i2", "400g spaghetti", 400, "g"),
        ingredient("r1i3", "60ml olive oil", 60, "ml"),
        ingredient("r1i4", "1/2 tsp chilli flakes"),
        ingredient("r1i5", "40g parmesan, grated", 40, "g"),
        ingredient("r1i6", "handful parsley, chopped"),
        ingredient("r1i7", "salt to taste"),
      ],
    },
    {
      id: "r2",
      title: "Sunday roast chicken",
      category: "Roast",
      servings: 6,
      prepTimeMinutes: 20,
      cookTimeMinutes: 90,
      instructions:
        "Pat the chicken dry and season generously inside and out. Stuff the cavity with the lemon and thyme.\n\nRoast at 200°C for roughly 20 minutes per 500g plus 20 minutes, basting once halfway through.\n\nRest for 15 minutes before carving. Deglaze the pan with the stock for a quick gravy.",
      ingredients: [
        ingredient("r2i1", "1 whole chicken, ~1.8kg", 1.8, "kg"),
        ingredient("r2i2", "1 lemon, halved", 1, "each"),
        ingredient("r2i3", "small bunch thyme"),
        ingredient("r2i4", "500ml chicken stock", 500, "ml"),
        ingredient("r2i5", "2 tbsp butter, softened", 2, "tbsp"),
        ingredient("r2i6", "salt and pepper"),
      ],
    },
    {
      id: "r3",
      title: "Big family chilli",
      category: "Batch cook",
      servings: 8,
      prepTimeMinutes: 25,
      cookTimeMinutes: 75,
      instructions:
        "Brown the beef in batches in a large pot, setting each batch aside.\n\nSoften the onion, pepper, and garlic in the same pot. Return the beef, add the spices, and toast for a minute before adding the tomatoes, beans, and stock.\n\nSimmer uncovered for at least an hour, stirring occasionally, until it's thick enough to hold its shape on a spoon.",
      ingredients: [
        ingredient("r3i1", "1kg beef mince", 1, "kg"),
        ingredient("r3i2", "2 onions, diced", 2, "each"),
        ingredient("r3i3", "2 bell peppers, diced", 2, "each"),
        ingredient("r3i4", "4 cloves garlic, minced", 4, "clove"),
        ingredient("r3i5", "2 tbsp chilli powder", 2, "tbsp"),
        ingredient("r3i6", "1 tbsp cumin", 1, "tbsp"),
        ingredient("r3i7", "800g crushed tomatoes", 800, "g"),
        ingredient("r3i8", "400g kidney beans, drained", 400, "g"),
        ingredient("r3i9", "500ml beef stock", 500, "ml"),
        ingredient("r3i10", "2 bay leaves", 2, "each"),
        ingredient("r3i11", "salt to taste"),
        ingredient("r3i12", "shredded cheese, to serve"),
        ingredient("r3i13", "sour cream, to serve"),
        ingredient("r3i14", "chopped coriander, to serve"),
      ],
    },
    {
      id: "r4",
      title: "Five-minute scrambled eggs",
      category: "Breakfast",
      servings: 2,
      prepTimeMinutes: 2,
      cookTimeMinutes: 5,
      instructions:
        "Whisk the eggs with a splash of milk and a pinch of salt.\n\nMelt the butter in a nonstick pan over low heat. Add the eggs and stir slowly and constantly, pulling the pan off the heat when they're still slightly wet — they keep cooking off the heat.",
      ingredients: [
        ingredient("r4i1", "4 eggs", 4, "each"),
        ingredient("r4i2", "1 tbsp milk", 1, "tbsp"),
        ingredient("r4i3", "knob of butter"),
        ingredient("r4i4", "salt to taste"),
      ],
    },
  ];

  const quickTitles = [
    "Leftover fried rice",
    "Sheet-pan sausages & veg",
    "Tomato soup",
    "Grilled cheese",
    "Overnight oats",
    "Banana pancakes",
    "Fish tacos",
    "Caesar salad",
    "Beef stir-fry",
    "Lentil soup",
    "Margherita pizza",
    "Chicken noodle soup",
    "Baked salmon",
    "Veggie curry",
    "Pulled pork sliders",
    "Greek salad",
    "Mushroom risotto",
    "Turkey chilli",
    "Shakshuka",
    "Beef tacos",
    "Roasted veg & couscous",
    "Miso soup",
    "Club sandwich",
    "Pork chops & apple",
    "Butternut squash soup",
    "Falafel wraps",
  ];

  const quick: MockRecipe[] = quickTitles.map((title, i) => ({
    id: `q${i + 1}`,
    title,
    category: RECIPE_CATEGORIES[i % RECIPE_CATEGORIES.length],
    servings: [2, 4, 6][i % 3],
    // Every 7th recipe has no times logged yet, so the table's "—" empty
    // state and a totally-unset row both show up in the density case.
    prepTimeMinutes: i % 7 === 6 ? null : 5 + (i % 5) * 5,
    cookTimeMinutes: i % 7 === 6 ? null : 10 + (i % 6) * 10,
    instructions: "Instructions not written up yet.",
    ingredients: [],
  }));

  return [...fleshedOut, ...quick];
}

/** ~30 recipes: four fleshed out (for the editor), the rest title-only (for box density). */
export function mockRecipes(linkFirstTwoTo: string[]): MockRecipe[] {
  const recipes = seedRecipes();
  const [foodA, foodB] = linkFirstTwoTo;

  if (foodA) recipes[0].ingredients[0].foodId = foodA;
  if (foodB) recipes[0].ingredients[1].foodId = foodB;

  return recipes;
}
