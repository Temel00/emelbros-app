import { createEmitter } from "@/platform/serial/emitter";
import type {
  ConnectOptions,
  SerialLink,
  SerialStatus,
} from "@/platform/serial/serial-link";

type FakeOptions = {
  /** Start `unsupported`, like a browser without Web Serial. */
  unsupported?: boolean;
  /** A port was granted on an earlier visit, so `silent` connects succeed. */
  hasGrantedPort?: boolean;
  /** Scripted device: lines to reply with for each written text. */
  reply?: (written: string) => string[];
};

/**
 * Test adapter for `SerialLink`: no hardware, scripted replies. `written`
 * records every `write`; `emitLine` and `fail` let a test play the device.
 */
export class FakeSerialLink implements SerialLink {
  readonly written: string[] = [];
  /** Set to make the next `connect` reject, e.g. an `open()` failure. */
  connectError: Error | null = null;
  /** Set to make the next `write` reject and drop the link. */
  writeError: Error | null = null;
  hasGrantedPort: boolean;

  private status: SerialStatus;
  private readonly reply: (written: string) => string[];
  private readonly lines = createEmitter<string>();
  private readonly statuses = createEmitter<SerialStatus>();
  private readonly errors = createEmitter<Error>();

  constructor(options: FakeOptions = {}) {
    this.status = options.unsupported ? "unsupported" : "disconnected";
    this.hasGrantedPort = options.hasGrantedPort ?? false;
    this.reply = options.reply ?? (() => []);
  }

  getStatus = () => this.status;
  onLine = this.lines.subscribe;
  onStatus = this.statuses.subscribe;
  onError = this.errors.subscribe;

  async connect(_baud: number, options: ConnectOptions = {}): Promise<void> {
    if (this.status === "unsupported") {
      throw new Error("Web Serial is not available in this browser.");
    }
    if (this.status === "connecting" || this.status === "connected") return;

    this.setStatus("connecting");
    if (this.connectError) {
      const error = this.connectError;
      this.connectError = null;
      this.setStatus("disconnected");
      throw error;
    }
    if (options.silent && !this.hasGrantedPort) {
      this.setStatus("disconnected");
      return;
    }
    this.hasGrantedPort = true;
    this.setStatus("connected");
  }

  async disconnect(): Promise<void> {
    this.setStatus("disconnected");
  }

  async write(text: string): Promise<void> {
    if (this.status !== "connected") {
      throw new Error("The serial link is not connected.");
    }
    if (this.writeError) {
      const error = this.writeError;
      this.writeError = null;
      this.fail(error);
      throw error;
    }
    this.written.push(text);
    for (const line of this.reply(text)) this.emitLine(line);
  }

  /** Play the device sending one line. */
  emitLine(line: string) {
    this.lines.emit(line);
  }

  /** Play the device being lost: reports the error, goes `disconnected`. */
  fail(error: Error) {
    this.errors.emit(error);
    this.setStatus("disconnected");
  }

  private setStatus(status: SerialStatus) {
    if (status === this.status) return;
    this.status = status;
    this.statuses.emit(status);
  }
}
