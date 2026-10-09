/**
 * The gallery title as a workshop sign, letters cut out of wood (ADR-0020).
 * Wood tones come from the existing surface tokens; no brights. Still a real
 * `h1` reading "Dev Tools".
 */
export function WorkshopSign() {
  return (
    <div className="relative self-start rounded-md border-2 border-c-surface-folder-border bg-c-surface-folder px-8 py-3 shadow-[3px_3px_0_0_var(--c-surface-folder-border)]">
      <span
        aria-hidden
        className="absolute top-1/2 left-2.5 size-2 -translate-y-1/2 rounded-full border-2 border-c-surface-folder-border bg-background"
      />
      <span
        aria-hidden
        className="absolute top-1/2 right-2.5 size-2 -translate-y-1/2 rounded-full border-2 border-c-surface-folder-border bg-background"
      />
      <h1 className="font-mono text-2xl font-black tracking-widest text-foreground uppercase [text-shadow:1px_1px_0_var(--c-surface-folder-border)]">
        Dev Tools
      </h1>
    </div>
  );
}
