"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  isSerialSupported,
  restoreSerialLink,
  useSerialLink,
} from "@/platform/serial";

import {
  GRINDER_BAUD,
  grindCommand,
  homeCommand,
  parseReply,
  type MachineState,
} from "./grinder-protocol";

export type SendPhase =
  "sending" | "sent" | "accepted" | "done" | "no-confirmation" | "failed";

export type SendStatus = { key: string; phase: SendPhase; message?: string };

export type MachineReport = { position: number | null; state: MachineState };

/** How long to wait for `OK` before showing "Sent, no confirmation". */
export const CONFIRMATION_TIMEOUT_MS = 2000;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const IN_FLIGHT: SendPhase[] = [
  "sending",
  "sent",
  "accepted",
  "no-confirmation",
];

/**
 * Sends grind and home commands over the shared serial link and tracks the
 * per-send status: `sending → sent → accepted → done`, with `no-confirmation`
 * if no `OK` arrives in time and `failed` on `ERR` or a rejected write.
 */
export function useGrinder() {
  const { status, link } = useSerialLink();
  const supported = isSerialSupported();
  const [send, setSend] = useState<SendStatus | null>(null);
  const [machine, setMachine] = useState<MachineReport | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const sendRef = useRef<SendStatus | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((next: SendStatus | null) => {
    sendRef.current = next;
    setSend(next);
  }, []);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    if (supported) void restoreSerialLink(GRINDER_BAUD);
  }, [supported]);

  useEffect(() => {
    const offLine = link.onLine((line) => {
      const event = parseReply(line);
      if (!event) return;
      const current = sendRef.current;
      const active =
        current !== null && IN_FLIGHT.includes(current.phase) ? current : null;

      if (event.kind === "ok") {
        setMachine((previous) => ({
          position: previous?.position ?? null,
          state: event.state,
        }));
        if (active) {
          clearTimer();
          update({ key: active.key, phase: "accepted" });
        }
      } else if (event.kind === "done") {
        setMachine({ position: event.position, state: event.state });
        if (active) {
          clearTimer();
          update({ key: active.key, phase: "done" });
        }
      } else if (active) {
        clearTimer();
        update({
          key: active.key,
          phase: "failed",
          message: [event.code, event.message].filter(Boolean).join(" "),
        });
      } else {
        setNotice(
          `Machine error: ${[event.code, event.message].filter(Boolean).join(" ")}`,
        );
      }
    });
    return () => {
      offLine();
      clearTimer();
    };
  }, [link, update]);

  const run = useCallback(
    async (key: string, command: string) => {
      clearTimer();
      update({ key, phase: "sending" });
      try {
        await link.write(command);
      } catch (error) {
        update({ key, phase: "failed", message: errorMessage(error) });
        return;
      }
      // An `OK`/`DONE` may already have arrived while the write resolved.
      if (sendRef.current?.key === key && sendRef.current.phase === "sending") {
        update({ key, phase: "sent" });
        timer.current = setTimeout(() => {
          if (
            sendRef.current?.key === key &&
            sendRef.current.phase === "sent"
          ) {
            update({ key, phase: "no-confirmation" });
          }
        }, CONFIRMATION_TIMEOUT_MS);
      }
    },
    [link, update],
  );

  const connect = useCallback(async () => {
    setConnectError(null);
    try {
      await link.connect(GRINDER_BAUD);
    } catch (error) {
      setConnectError(errorMessage(error));
    }
  }, [link]);

  return {
    supported,
    status,
    send,
    machine,
    notice,
    connectError,
    dismissNotice: () => setNotice(null),
    connect,
    disconnect: () => link.disconnect(),
    sendGrind: (key: string, grindSize: number) =>
      run(key, grindCommand(grindSize)),
    sendHome: () => run("home", homeCommand()),
  };
}
