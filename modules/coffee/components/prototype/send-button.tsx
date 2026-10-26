"use client";

import { Bluetooth, Check, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { MachineState } from "./mock-data";

const STATUS: Record<MachineState, string> = {
  unsupported: "Not supported in this browser",
  disconnected: "Grinder not connected",
  connected: "Grinder connected",
  sending: "Sending…",
  sent: "Sent — grinder confirmed",
  failed: "Failed — grinder didn't accept it",
};

/** PROTOTYPE: the Send to machine control in every state. */
export function SendButton({
  state,
  label,
  onConnect,
  onSend,
  disabled,
}: {
  state: MachineState;
  label: string;
  onConnect: () => void;
  onSend: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p
        role="status"
        className={`flex items-center gap-1.5 text-xs ${
          state === "failed" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {state === "sending" && <Loader2 className="size-3 animate-spin" />}
        {state === "sent" && <Check className="size-3" />}
        {state === "failed" && <TriangleAlert className="size-3" />}
        {STATUS[state]}
      </p>
      {state === "unsupported" ? (
        <Button disabled className="w-full">
          Send to machine
        </Button>
      ) : state === "disconnected" ? (
        <Button variant="outline" className="w-full" onClick={onConnect}>
          <Bluetooth /> Connect grinder
        </Button>
      ) : (
        <Button
          className="w-full"
          disabled={disabled || state === "sending"}
          onClick={onSend}
        >
          {state === "sending"
            ? "Sending…"
            : state === "failed"
              ? "Retry"
              : `Send ${label}`}
        </Button>
      )}
    </div>
  );
}
