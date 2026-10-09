export const DRAFT_KEY = "dev-tools:svg-sandbox:draft";

export const STARTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">
  <rect x="10" y="10" width="80" height="50" fill="#f59e0b" />
  <circle cx="150" cy="40" r="25" fill="#38bdf8" />
  <text x="20" y="100" font-size="14">Hello SVG</text>
</svg>
`;

type DraftStorage = Pick<Storage, "getItem" | "setItem">;

// Storage can be missing or throw (private windows, blocked site data), so
// every access is guarded and the tool works without it.
function defaultStorage(): DraftStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** The saved draft, or the starter SVG when none/unreadable/empty. */
export function loadDraft(storage: DraftStorage | null = defaultStorage()) {
  try {
    return storage?.getItem(DRAFT_KEY) || STARTER_SVG;
  } catch {
    return STARTER_SVG;
  }
}

export function saveDraft(
  text: string,
  storage: DraftStorage | null = defaultStorage(),
) {
  try {
    storage?.setItem(DRAFT_KEY, text);
  } catch {
    // Quota or blocked storage: the draft just isn't persisted.
  }
}
