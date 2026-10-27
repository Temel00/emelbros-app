export const ROAST_LEVELS = [
  "light",
  "medium-light",
  "medium",
  "medium-dark",
  "dark",
] as const;

export type RoastLevel = (typeof ROAST_LEVELS)[number];

export const GRIND_SIZE_MAX = 99.99;

export type Validated<T> =
  { ok: true; value: T } | { ok: false; error: string };

export type BeanInput = {
  name: string;
  roaster: string | null;
  origin: string | null;
  notes: string | null;
  roast_level: RoastLevel | null;
};

export type GrindProfileInput = {
  label: string;
  description: string | null;
  grind_size: number;
};

/** Trims; blank becomes `null`. */
function optional(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/** Checks a bean form's raw values and normalises them for the database. */
export function validateBean(raw: {
  name: string;
  roaster?: string | null;
  origin?: string | null;
  notes?: string | null;
  roastLevel?: string | null;
}): Validated<BeanInput> {
  const name = raw.name.trim();
  if (name === "") return { ok: false, error: "Name is required." };

  const roastLevel = optional(raw.roastLevel);
  if (roastLevel !== null && !ROAST_LEVELS.includes(roastLevel as RoastLevel)) {
    return { ok: false, error: "Pick a valid roast level." };
  }

  return {
    ok: true,
    value: {
      name,
      roaster: optional(raw.roaster),
      origin: optional(raw.origin),
      notes: optional(raw.notes),
      roast_level: roastLevel as RoastLevel | null,
    },
  };
}

/** Checks a grind profile form's raw values; `grindSize` arrives as typed. */
export function validateGrindProfile(raw: {
  label: string;
  description?: string | null;
  grindSize: string | number;
}): Validated<GrindProfileInput> {
  const label = raw.label.trim();
  if (label === "") return { ok: false, error: "Label is required." };

  const text = String(raw.grindSize).trim();
  const grindSize = text === "" ? NaN : Number(text);
  if (!Number.isFinite(grindSize)) {
    return { ok: false, error: "Grind size must be a number." };
  }
  if (grindSize < 0 || grindSize > GRIND_SIZE_MAX) {
    return {
      ok: false,
      error: `Grind size must be between 0 and ${GRIND_SIZE_MAX}.`,
    };
  }

  return {
    ok: true,
    value: {
      label,
      description: optional(raw.description),
      grind_size: Math.round(grindSize * 100) / 100,
    },
  };
}
