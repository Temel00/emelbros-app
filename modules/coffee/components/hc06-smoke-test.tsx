"use client";

// PROTOTYPE, throwaway (issue #218): raw Web Serial smoke test for the HC-06.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Line = { cls: string; text: string };

const EOLS: Record<string, string> = {
  none: "",
  LF: "\n",
  CR: "\r",
  CRLF: "\r\n",
};
const BAUDS = [9600, 1200, 2400, 4800, 19200, 38400, 57600, 115200];

const show = (s: string) => s.replace(/\r/g, "\\r").replace(/\n/g, "\\n");

export function Hc06SmokeTest() {
  const supportEl = useRef<HTMLParagraphElement>(null);
  const [connected, setConnected] = useState(false);
  const [baud, setBaud] = useState(9600);
  const [eol, setEol] = useState("none");
  const [text, setText] = useState("GRIND 1.00");
  const [lines, setLines] = useState<Line[]>([]);
  const port = useRef<any>(null);
  const reader = useRef<any>(null);
  const writer = useRef<any>(null);
  const keepReading = useRef(false);
  const logEnd = useRef<HTMLDivElement>(null);

  const log = (cls: string, msg: string) =>
    setLines((l) => [
      ...l,
      { cls, text: `${new Date().toISOString().slice(11, 23)} ${msg}` },
    ]);

  useEffect(() => {
    if (supportEl.current)
      supportEl.current.textContent = `'serial' in navigator: ${"serial" in navigator} · isSecureContext: ${window.isSecureContext} · ${location.href}`;
  }, []);
  useEffect(() => {
    logEnd.current?.scrollIntoView();
  }, [lines]);

  async function readLoop() {
    while (port.current?.readable && keepReading.current) {
      reader.current = port.current.readable.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.current.read();
          if (done) break;
          const txt = new TextDecoder().decode(value);
          const hex = [...(value as Uint8Array)]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ");
          log("text-green-500", `RX ${value.length}B "${show(txt)}" [${hex}]`);
        }
      } catch (e: any) {
        log("text-red-500", `read error: ${e.name}: ${e.message}`);
      } finally {
        reader.current.releaseLock();
      }
    }
  }

  async function connect() {
    try {
      // No filter: lists every paired serial port incl. Bluetooth SPP.
      port.current = await (navigator as any).serial.requestPort();
      const t0 = performance.now();
      await port.current.open({ baudRate: baud });
      log(
        "text-muted-foreground",
        `opened @${baud} in ${Math.round(performance.now() - t0)}ms; info=${JSON.stringify(port.current.getInfo())}`,
      );
      writer.current = port.current.writable.getWriter();
      keepReading.current = true;
      setConnected(true);
      void readLoop();
    } catch (e: any) {
      log("text-red-500", `connect failed: ${e.name}: ${e.message}`);
    }
  }

  async function disconnect() {
    keepReading.current = false;
    try {
      await reader.current?.cancel();
    } catch {}
    try {
      writer.current?.releaseLock();
    } catch {}
    try {
      await port.current?.close();
      log("text-muted-foreground", "closed");
    } catch (e: any) {
      log("text-red-500", `close: ${e.name}: ${e.message}`);
    }
    port.current = reader.current = writer.current = null;
    setConnected(false);
  }

  async function send(t: string) {
    const out = t + EOLS[eol];
    try {
      await writer.current.write(new TextEncoder().encode(out));
      log("text-sky-500", `TX "${show(out)}"`);
    } catch (e: any) {
      log("text-red-500", `write error: ${e.name}: ${e.message}`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p ref={supportEl} className="text-xs text-muted-foreground" />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label>
          Baud{" "}
          <select
            className="rounded border bg-background p-1"
            value={baud}
            onChange={(e) => setBaud(Number(e.target.value))}
          >
            {BAUDS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          Line ending{" "}
          <select
            className="rounded border bg-background p-1"
            value={eol}
            onChange={(e) => setEol(e.target.value)}
          >
            {Object.keys(EOLS).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <Button onClick={connect} disabled={connected}>
          Connect
        </Button>
        <Button variant="outline" onClick={disconnect} disabled={!connected}>
          Disconnect
        </Button>
        <span className="text-muted-foreground">
          {connected ? "connected" : "disconnected"}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border bg-background p-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connected && send(text)}
        />
        <Button onClick={() => send(text)} disabled={!connected}>
          Send
        </Button>
        <Button
          variant="outline"
          onClick={() => send("HOME")}
          disabled={!connected}
        >
          HOME
        </Button>
        <Button variant="outline" onClick={() => setLines([])}>
          Clear
        </Button>
      </div>
      <div className="h-80 overflow-auto whitespace-pre-wrap rounded border bg-black p-2 font-mono text-xs">
        {lines.map((l, i) => (
          <div key={i} className={l.cls}>
            {l.text}
          </div>
        ))}
        <div ref={logEnd} />
      </div>
    </div>
  );
}
