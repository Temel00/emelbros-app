/** Decorative workbench for the Dev Tools 404 (ADR-0020). Surface tokens only. */
export function WorkbenchIllustration() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 160 100"
      className="h-28 w-auto text-c-surface-folder-border"
    >
      <rect x="10" y="50" width="140" height="10" rx="2" fill="currentColor" />
      <rect x="20" y="60" width="8" height="34" fill="currentColor" />
      <rect x="132" y="60" width="8" height="34" fill="currentColor" />
      <rect x="40" y="20" width="4" height="30" fill="currentColor" />
      <rect x="32" y="14" width="20" height="8" rx="2" fill="currentColor" />
      <rect x="80" y="36" width="36" height="14" rx="2" fill="currentColor" />
      <rect x="116" y="42" width="16" height="4" fill="currentColor" />
    </svg>
  );
}
