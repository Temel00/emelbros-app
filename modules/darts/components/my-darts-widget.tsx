/**
 * "My Darts" widget (darts.md §9): the current member's recent record, most
 * recent completed game, and a New game shortcut. This is a placeholder —
 * real data-fetching via the module's `queries.ts` (#30) and the finished
 * layout land in #33. It exists now so the manifest (#29) has a real,
 * zero-prop RSC to declare (ADR-0005).
 */
export function MyDartsWidget() {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">My Darts</p>
      <p className="text-muted-foreground text-sm">Coming soon.</p>
    </div>
  );
}
