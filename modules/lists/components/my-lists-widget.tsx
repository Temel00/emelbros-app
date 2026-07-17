/**
 * "My Lists" widget (lists.md §6, ADR-0005). This ticket (#34) only declares
 * the widget on the manifest; real data-fetching needs the lists query layer
 * (#35) and lands with the widget ticket (#36).
 */
export function MyListsWidget() {
  return (
    <p className="text-sm text-muted-foreground">My Lists — coming soon.</p>
  );
}
