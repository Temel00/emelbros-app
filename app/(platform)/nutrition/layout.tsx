import { NutritionFlairBackground } from "@/modules/nutrition/components/nutrition-flair-background";

/**
 * Nutrition module layout (#189): the attach point for the decorative flair
 * layer (ADR-0018). Each screen still assembles its own `<AppHeader>` +
 * `<main>`; this only wraps them.
 *
 * `relative isolate` opens a stacking context so the flair can sit at `-z-10`
 * — above the app background, behind all content — without escaping behind
 * the body.
 */
export default function NutritionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <NutritionFlairBackground />
      {children}
    </div>
  );
}
