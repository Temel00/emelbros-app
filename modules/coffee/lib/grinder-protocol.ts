/**
 * The grinder's serial protocol, in one file. The Arduino sketch is being
 * rewritten, so this is the only place that knows command syntax, the
 * terminator, or reply shapes (`platform/serial` knows no protocol).
 */

export const GRINDER_BAUD = 9600;

/** Appended to every command. The current sketch needs none. */
export const TERMINATOR = "";

export type MachineState = "UNKNOWN" | "RESTORED" | "CONFIRMED";

export type GrinderEvent =
  | { kind: "ok"; from: number; state: MachineState }
  | { kind: "done"; position: number; state: MachineState }
  | { kind: "err"; code: string; message: string };

/** `GRIND X.XX`, two decimals. */
export function grindCommand(grindSize: number): string {
  return `GRIND ${grindSize.toFixed(2)}${TERMINATOR}`;
}

export function homeCommand(): string {
  return `HOME${TERMINATOR}`;
}

const isState = (value: string | undefined): value is MachineState =>
  value === "UNKNOWN" || value === "RESTORED" || value === "CONFIRMED";

/**
 * Reads one reply line. Lines that aren't an `ok | done | err` event (e.g.
 * `PROFILE A steps=...`) return `null`.
 */
export function parseReply(line: string): GrinderEvent | null {
  const parts = line.trim().split(/\s+/);

  if (parts[0] === "OK" && parts[1] === "MOVE") {
    const from = Number(parts[2]);
    if (parts[2] === undefined || Number.isNaN(from) || !isState(parts[3])) {
      return null;
    }
    return { kind: "ok", from, state: parts[3] };
  }

  if (parts[0] === "DONE" && parts[1] === "IDLE") {
    const position = Number(parts[2]);
    if (
      parts[2] === undefined ||
      Number.isNaN(position) ||
      !isState(parts[3])
    ) {
      return null;
    }
    return { kind: "done", position, state: parts[3] };
  }

  if (parts[0] === "ERR") {
    return {
      kind: "err",
      code: parts[1] ?? "",
      message: parts.slice(2).join(" "),
    };
  }

  return null;
}
