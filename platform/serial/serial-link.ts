export type SerialStatus =
  "unsupported" | "disconnected" | "connecting" | "connected";

export type Unsubscribe = () => void;

export type ConnectOptions = {
  /**
   * Reopen a previously granted port without showing the picker. Resolves
   * into `disconnected` (no throw) when none is available. Without it,
   * `connect` shows the browser picker and so needs a user gesture.
   */
  silent?: boolean;
};

/**
 * A line-oriented serial connection. Callers never see bytes, streams or
 * locks: they write text and receive whole lines. It knows nothing about any
 * device protocol. Errors are surfaced, never swallowed: `connect` and
 * `write` reject, and a lost link reports through `onError` and goes to
 * `disconnected`. There is no retry or backoff.
 */
export interface SerialLink {
  getStatus(): SerialStatus;
  connect(baud: number, options?: ConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  write(text: string): Promise<void>;
  onLine(callback: (line: string) => void): Unsubscribe;
  onStatus(callback: (status: SerialStatus) => void): Unsubscribe;
  onError(callback: (error: Error) => void): Unsubscribe;
}

/** Web Serial needs both the API and a secure context. */
export function isSerialSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serial" in navigator &&
    typeof isSecureContext !== "undefined" &&
    isSecureContext
  );
}
