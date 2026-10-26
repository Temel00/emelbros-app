export const LINE_ENDINGS = {
  none: "",
  LF: "\n",
  CR: "\r",
  CRLF: "\r\n",
} as const;

export type LineEnding = keyof typeof LINE_ENDINGS;

export const BAUD_RATES = [
  9600, 1200, 2400, 4800, 19200, 38400, 57600, 115200,
] as const;

/** Makes control characters visible so a log line shows what was really sent. */
export function showControl(text: string): string {
  return text.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}

/** Space-separated lowercase hex of the text's UTF-8 bytes. */
export function toHex(text: string): string {
  return Array.from(new TextEncoder().encode(text), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join(" ");
}

/** `HH:MM:SS.mmm` (UTC) of a date, for log timestamps. */
export function formatTime(date: Date): string {
  return date.toISOString().slice(11, 23);
}
