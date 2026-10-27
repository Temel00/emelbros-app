import { createEmitter } from "@/platform/serial/emitter";
import { splitLines } from "@/platform/serial/line-splitter";
import {
  isSerialSupported,
  type ConnectOptions,
  type SerialLink,
  type SerialStatus,
} from "@/platform/serial/serial-link";

// The Web Serial API is not in lib.dom; declare the slice we use.
type SerialPortLike = {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
};
type SerialLike = {
  requestPort(): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
};

const serialApi = () => (navigator as unknown as { serial: SerialLike }).serial;

const toError = (value: unknown) =>
  value instanceof Error ? value : new Error(String(value));

/**
 * The real Web Serial link. Owns the port, the reader/writer locks, a
 * streaming `TextDecoder` and the line buffer. Android fires no
 * connect/disconnect events, so a lost device is detected only through a
 * failed read or write.
 */
export class WebSerialLink implements SerialLink {
  private status: SerialStatus = isSerialSupported()
    ? "disconnected"
    : "unsupported";
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private closing = false;
  private readonly lines = createEmitter<string>();
  private readonly statuses = createEmitter<SerialStatus>();
  private readonly errors = createEmitter<Error>();

  getStatus = () => this.status;
  onLine = this.lines.subscribe;
  onStatus = this.statuses.subscribe;
  onError = this.errors.subscribe;

  async connect(baud: number, options: ConnectOptions = {}): Promise<void> {
    if (this.status === "unsupported") {
      throw new Error("Web Serial is not available in this browser.");
    }
    if (this.status === "connecting" || this.status === "connected") return;

    this.setStatus("connecting");
    try {
      const port = options.silent
        ? (await serialApi().getPorts())[0]
        : await serialApi().requestPort();
      if (!port) {
        this.setStatus("disconnected");
        return;
      }
      await port.open({ baudRate: baud });
      if (!port.readable || !port.writable) {
        throw new Error("The serial port has no readable/writable stream.");
      }
      this.port = port;
      this.writer = port.writable.getWriter();
      this.closing = false;
      this.setStatus("connected");
      void this.readLoop(port.readable.getReader());
    } catch (error) {
      await this.release();
      this.setStatus("disconnected");
      throw toError(error);
    }
  }

  async disconnect(): Promise<void> {
    this.closing = true;
    await this.release();
    this.setStatus("disconnected");
  }

  async write(text: string): Promise<void> {
    if (this.status !== "connected" || !this.writer) {
      throw new Error("The serial link is not connected.");
    }
    try {
      await this.writer.write(new TextEncoder().encode(text));
    } catch (error) {
      await this.lose(toError(error));
      throw toError(error);
    }
  }

  private async readLoop(reader: ReadableStreamDefaultReader<Uint8Array>) {
    this.reader = reader;
    const decoder = new TextDecoder();
    let pending = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const split = splitLines(
          pending,
          decoder.decode(value, { stream: true }),
        );
        pending = split.pending;
        for (const line of split.lines) this.lines.emit(line);
      }
      if (!this.closing) await this.lose(new Error("The serial stream ended."));
    } catch (error) {
      if (!this.closing) await this.lose(toError(error));
    }
  }

  /** The device went away: report it, release everything, go disconnected. */
  private async lose(error: Error) {
    this.closing = true;
    this.errors.emit(error);
    await this.release();
    this.setStatus("disconnected");
  }

  private async release() {
    const { reader, writer, port } = this;
    this.reader = this.writer = this.port = null;
    try {
      await reader?.cancel();
    } catch {}
    try {
      reader?.releaseLock();
    } catch {}
    try {
      writer?.releaseLock();
    } catch {}
    try {
      await port?.close();
    } catch {}
  }

  private setStatus(status: SerialStatus) {
    if (status === this.status) return;
    this.status = status;
    this.statuses.emit(status);
  }
}
