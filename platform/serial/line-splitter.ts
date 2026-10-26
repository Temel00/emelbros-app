/**
 * Splits streamed text into complete lines. Serial replies arrive fragmented
 * mid-word and a `\r\n` pair can straddle two chunks, so callers carry the
 * unfinished tail (`pending`) between calls. A line ends at `\r` or `\n`;
 * empty lines (including the gap inside `\r\n`) are dropped.
 */
export function splitLines(
  pending: string,
  chunk: string,
): { lines: string[]; pending: string } {
  const parts = (pending + chunk).split(/[\r\n]/);
  const rest = parts.pop() ?? "";
  return { lines: parts.filter((line) => line !== ""), pending: rest };
}
