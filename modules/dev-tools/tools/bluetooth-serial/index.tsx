"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isSerialSupported, useSerialLink } from "@/platform/serial";

import {
  BAUD_RATES,
  formatTime,
  LINE_ENDINGS,
  showControl,
  toHex,
  type LineEnding,
} from "./lib/format";

type LogKind = "rx" | "tx" | "error" | "info";

type LogEntry = { id: number; kind: LogKind; time: string; text: string };

const KIND_STYLE: Record<LogKind, string> = {
  rx: "text-emerald-600 dark:text-emerald-400",
  tx: "text-sky-600 dark:text-sky-400",
  error: "text-destructive",
  info: "text-muted-foreground",
};

const KIND_LABEL: Record<LogKind, string> = {
  rx: "RX",
  tx: "TX",
  error: "ERR",
  info: "···",
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

const selectClass =
  "h-9 rounded-lg border-2 border-input bg-background px-2 text-sm outline-none focus-visible:border-ring disabled:opacity-50";

export default function BluetoothSerial() {
  const { status, link } = useSerialLink();
  const [baud, setBaud] = useState<number>(9600);
  const [ending, setEnding] = useState<LineEnding>("none");
  const [text, setText] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextId = useRef(0);
  const lastError = useRef("");
  const logEnd = useRef<HTMLDivElement>(null);

  const supported = isSerialSupported();
  const connected = status === "connected";
  const connecting = status === "connecting";

  const append = (kind: LogKind, message: string) => {
    // A failed write both rejects and reports a lost link; show it once.
    if (kind === "error") {
      if (message === lastError.current) return;
      lastError.current = message;
    }
    setLog((entries) => [
      ...entries,
      {
        id: nextId.current++,
        kind,
        time: formatTime(new Date()),
        text: message,
      },
    ]);
  };
  const appendRef = useRef(append);
  useEffect(() => {
    appendRef.current = append;
  });

  useEffect(() => {
    const offLine = link.onLine((line) =>
      appendRef.current("rx", `"${line}"  [${toHex(line)}]`),
    );
    const offError = link.onError((error) =>
      appendRef.current("error", errorMessage(error)),
    );
    const offStatus = link.onStatus((next) => {
      if (next === "connected") appendRef.current("info", "connected");
      if (next === "disconnected") appendRef.current("info", "disconnected");
    });
    return () => {
      offLine();
      offError();
      offStatus();
    };
  }, [link]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "end" });
  }, [log]);

  async function connect() {
    lastError.current = "";
    try {
      await link.connect(baud);
    } catch (error) {
      append("error", `Connect failed: ${errorMessage(error)}`);
    }
  }

  async function disconnect() {
    try {
      await link.disconnect();
    } catch (error) {
      append("error", `Disconnect failed: ${errorMessage(error)}`);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!connected) return;
    const out = text + LINE_ENDINGS[ending];
    try {
      await link.write(out);
      append("tx", `"${showControl(out)}"  [${toHex(out)}]`);
    } catch (error) {
      append("error", `Write failed: ${errorMessage(error)}`);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 p-4">
      {!supported && (
        <p
          role="alert"
          className="rounded-lg border-2 border-destructive p-3 text-sm"
        >
          Web Serial isn&apos;t available here. Use Chrome or Edge on a secure
          (HTTPS or localhost) page.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Baud
          <select
            className={selectClass}
            value={baud}
            disabled={connected || connecting}
            onChange={(e) => setBaud(Number(e.target.value))}
          >
            {BAUD_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Line ending
          <select
            className={selectClass}
            value={ending}
            onChange={(e) => setEnding(e.target.value as LineEnding)}
          >
            {Object.keys(LINE_ENDINGS).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        {connected ? (
          <Button variant="outline" onClick={disconnect}>
            Disconnect
          </Button>
        ) : (
          <Button onClick={connect} disabled={!supported || connecting}>
            {connecting ? "Connecting…" : "Connect"}
          </Button>
        )}
        <span className="text-muted-foreground" aria-live="polite">
          {status}
        </span>
      </div>

      <div
        className="min-h-64 flex-1 overflow-y-auto rounded-lg border-2 border-input p-2 font-mono text-xs"
        role="log"
        aria-label="Serial log"
      >
        {log.length === 0 && (
          <p className="text-muted-foreground">
            Nothing yet. Connect, then send something. Received lines show the
            text and its hex (line terminators are stripped).
          </p>
        )}
        {log.map((entry) => (
          <div
            key={entry.id}
            className={cn("break-all", KIND_STYLE[entry.kind])}
          >
            <span className="text-muted-foreground">{entry.time}</span>{" "}
            <span className="font-semibold">{KIND_LABEL[entry.kind]}</span>{" "}
            {entry.text}
          </div>
        ))}
        <div ref={logEnd} />
      </div>

      <form onSubmit={send} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Text to send"
          aria-label="Text to send"
          autoComplete="off"
          disabled={!connected}
        />
        <Button type="submit" disabled={!connected}>
          Send
        </Button>
        <Button type="button" variant="outline" onClick={() => setLog([])}>
          Clear
        </Button>
      </form>
    </div>
  );
}
