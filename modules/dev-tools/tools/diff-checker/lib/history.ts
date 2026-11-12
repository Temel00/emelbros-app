export type Side = "original" | "changed";
export type Snapshot = { original: string; changed: string };
export type HistoryOptions = {
  /** Injectable clock (ms) for tests. */
  now?: () => number;
  mergeMs?: number;
  /** Cap on total characters across all steps. */
  maxChars?: number;
  /** Always keep at least this many of the newest steps. */
  minSteps?: number;
};
export type PushOptions = {
  /** Swap, clear and paste: own step, never merged. */
  isolate?: boolean;
};
export type Restored = {
  snapshot: Snapshot;
  /** The side the undone/redone step changed, so the UI can refocus it. */
  side: Side | null;
};

type Step = {
  snapshot: Snapshot;
  side: Side | null;
  time: number;
  isolated: boolean;
  size: number;
};

const sizeOf = (s: Snapshot) => s.original.length + s.changed.length;

/** One shared undo history over both boxes. Pure, in memory. */
export function createHistory(initial: Snapshot, options: HistoryOptions = {}) {
  const now = options.now ?? Date.now;
  const mergeMs = options.mergeMs ?? 500;
  const maxChars = options.maxChars ?? 2_000_000;
  const minSteps = options.minSteps ?? 3;

  // steps[0] is the baseline; `cursor` is the current step.
  const steps: Step[] = [
    {
      snapshot: initial,
      side: null,
      time: Number.NEGATIVE_INFINITY,
      isolated: true,
      size: sizeOf(initial),
    },
  ];
  let cursor = 0;
  let total = steps[0].size;

  const trim = () => {
    while (total > maxChars && steps.length > minSteps) {
      total -= steps.shift()!.size;
      cursor--;
    }
  };

  return {
    push(
      snapshot: Snapshot,
      side: Side,
      { isolate = false }: PushOptions = {},
    ) {
      // A new edit clears redo.
      for (const dropped of steps.splice(cursor + 1)) total -= dropped.size;
      const time = now();
      const top = steps[cursor];
      const step: Step = {
        snapshot,
        side,
        time,
        isolated: isolate,
        size: sizeOf(snapshot),
      };
      if (!isolate && !top.isolated && time - top.time <= mergeMs) {
        total += step.size - top.size;
        steps[cursor] = step;
      } else {
        steps.push(step);
        cursor++;
        total += step.size;
      }
      trim();
    },
    undo(): Restored | null {
      if (cursor === 0) return null;
      const side = steps[cursor].side;
      cursor--;
      return { snapshot: steps[cursor].snapshot, side };
    },
    redo(): Restored | null {
      if (cursor === steps.length - 1) return null;
      cursor++;
      return { snapshot: steps[cursor].snapshot, side: steps[cursor].side };
    },
    canUndo: () => cursor > 0,
    canRedo: () => cursor < steps.length - 1,
    /** Side changed by the current step (null at the baseline). */
    lastChanged: (): Side | null => steps[cursor].side,
  };
}

export type History = ReturnType<typeof createHistory>;
