import Link from "next/link";

import {
  NUTRITION_NAV_ITEMS,
  type NutritionNavKey,
} from "@/modules/nutrition/components/nutrition-nav";

/**
 * The Nutrition content card (#187, ADR-0018): a manila (light) / blue (dark)
 * `rounded-2xl` folder whose tabs ARE the nutrition nav, in natural order. The
 * active tab is scaled up (nav-md, `text-lg`) and serves as the page title —
 * there is no separate heading or standalone nav bar. Inactive tabs are compact
 * links to the other screens.
 *
 * The body is an **opaque** surface (ADR-0018 guardrail): the decorative flair
 * layer sits behind it and shows only in the surrounding gutter, so body-text
 * contrast is measured against these tokens (WCAG-AA in both themes), never the
 * flair. Surfaces use the theme-aware `--c-surface-*` tokens, so callers never
 * branch on light/dark.
 *
 * Server component — the settled treatment has no runtime variant axis, so no
 * client hooks are needed; it drops straight into the server pages.
 */

// Active tab = the page title. `-mb-px` laps it over the body's top border so
// the tab and card read as one continuous surface.
const ACTIVE_TAB =
  "relative -mb-px rounded-t-2xl border border-b-0 border-c-surface-folder-border bg-c-surface-folder px-6 pb-2 pt-2.5 text-lg font-semibold text-foreground shadow-sm";

// A compact, recessed inactive tab: a link to another nutrition screen.
const INACTIVE_TAB =
  "rounded-t-lg border border-b-0 border-c-surface-folder-border bg-c-surface-tab-inactive px-3.5 pb-2 pt-1.5 text-sm font-medium text-muted-foreground hover:text-foreground";

export function FolderCard({
  active,
  description,
  children,
}: {
  active: NutritionNavKey;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl">
      {/* The nutrition nav rendered AS folder tabs, in natural order; the active
          tab is scaled up to serve as the page title. */}
      <nav
        aria-label="Nutrition"
        className="flex flex-wrap items-end gap-1 pl-3"
      >
        {NUTRITION_NAV_ITEMS.map((item) =>
          item.key === active ? (
            <h1 key={item.key} aria-current="page" className={ACTIVE_TAB}>
              {item.label}
            </h1>
          ) : (
            <Link key={item.key} href={item.href} className={INACTIVE_TAB}>
              {item.label}
            </Link>
          ),
        )}
      </nav>
      <div className="rounded-2xl border border-c-surface-folder-border bg-c-surface-folder p-5 shadow-sm sm:p-7">
        {description ? (
          <p className="mb-5 max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
