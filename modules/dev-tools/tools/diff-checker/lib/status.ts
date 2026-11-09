import type { CompareResult } from "./compare";

export type Status =
  | { state: "empty"; message: string }
  | { state: "waiting"; message: string; waitingFor: "original" | "changed" }
  | { state: "identical"; message: string }
  | { state: "differing"; message: string; count: number }
  | { state: "too-large"; message: string };

/** `result` is null while the inputs are empty/one-sided (no compare run). */
export function statusOf(
  original: string,
  changed: string,
  result: CompareResult | null,
): Status {
  if (!original && !changed)
    return { state: "empty", message: "Paste text into both sides to compare" };
  if (!original)
    return {
      state: "waiting",
      waitingFor: "original",
      message: "Waiting for Original text…",
    };
  if (!changed)
    return {
      state: "waiting",
      waitingFor: "changed",
      message: "Waiting for Changed text…",
    };
  if (!result || result.tooLarge)
    return { state: "too-large", message: "Too large to compare" };
  const count = result.added + result.removed + result.changed;
  if (count === 0)
    return { state: "identical", message: "Identical — no differences" };
  return {
    state: "differing",
    count,
    message: `${count} differing line${count === 1 ? "" : "s"}`,
  };
}
