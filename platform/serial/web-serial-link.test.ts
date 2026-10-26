import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WebSerialLink } from "@/platform/serial/web-serial-link";

const encode = (text: string) => new TextEncoder().encode(text);

/** A fake `SerialPort`: push bytes in, or error the read side. */
function createPort() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const written: string[] = [];
  const port = {
    readable: new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    }),
    writable: new WritableStream<Uint8Array>({
      write(chunk) {
        written.push(new TextDecoder().decode(chunk));
      },
    }),
    open: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
  return {
    port,
    written,
    push: (text: string) => controller.enqueue(encode(text)),
    pushBytes: (bytes: number[]) => controller.enqueue(new Uint8Array(bytes)),
    error: (e: Error) => controller.error(e),
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("WebSerialLink", () => {
  let serial: {
    requestPort: ReturnType<typeof vi.fn>;
    getPorts: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    serial = { requestPort: vi.fn(), getPorts: vi.fn(async () => []) };
    vi.stubGlobal("navigator", { serial });
    vi.stubGlobal("isSecureContext", true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is unsupported without Web Serial or a secure context", async () => {
    vi.stubGlobal("isSecureContext", false);
    const link = new WebSerialLink();
    expect(link.getStatus()).toBe("unsupported");
    await expect(link.connect(9600)).rejects.toThrow("not available");
  });

  it("connects through the picker and emits whole lines from fragments", async () => {
    const device = createPort();
    serial.requestPort.mockResolvedValue(device.port);
    const link = new WebSerialLink();
    const lines: string[] = [];
    link.onLine((line) => lines.push(line));

    await link.connect(9600);
    expect(device.port.open).toHaveBeenCalledWith({ baudRate: 9600 });
    expect(link.getStatus()).toBe("connected");

    device.push("OK MO");
    device.push("VE 12\r");
    device.push("\nDONE IDLE 12.00 UNK");
    device.push("NOWN\n");
    await tick();

    expect(lines).toEqual(["OK MOVE 12", "DONE IDLE 12.00 UNKNOWN"]);
  });

  it("decodes a multi-byte character split across chunks", async () => {
    const device = createPort();
    serial.requestPort.mockResolvedValue(device.port);
    const link = new WebSerialLink();
    const lines: string[] = [];
    link.onLine((line) => lines.push(line));
    await link.connect(9600);

    device.pushBytes([0xc3]);
    device.pushBytes([0xa9, 0x0a]);
    await tick();

    expect(lines).toEqual(["é"]);
  });

  it("writes text to the port", async () => {
    const device = createPort();
    serial.requestPort.mockResolvedValue(device.port);
    const link = new WebSerialLink();
    await link.connect(9600);

    await link.write("HOME");

    expect(device.written).toEqual(["HOME"]);
  });

  it("goes disconnected and reports the error on a read error", async () => {
    const device = createPort();
    serial.requestPort.mockResolvedValue(device.port);
    const link = new WebSerialLink();
    const errors: Error[] = [];
    link.onError((error) => errors.push(error));
    await link.connect(9600);

    device.error(new Error("NetworkError: The device has been lost."));
    await tick();

    expect(link.getStatus()).toBe("disconnected");
    expect(errors.map((e) => e.message)).toEqual([
      "NetworkError: The device has been lost.",
    ]);
  });

  it("rejects and ends disconnected when open() rejects", async () => {
    const device = createPort();
    device.port.open.mockRejectedValue(new Error("open failed"));
    serial.requestPort.mockResolvedValue(device.port);
    const link = new WebSerialLink();

    await expect(link.connect(9600)).rejects.toThrow("open failed");

    expect(link.getStatus()).toBe("disconnected");
  });

  it("surfaces a cancelled picker as a rejection and stays disconnected", async () => {
    serial.requestPort.mockRejectedValue(new Error("NotFoundError"));
    const link = new WebSerialLink();

    await expect(link.connect(9600)).rejects.toThrow("NotFoundError");

    expect(link.getStatus()).toBe("disconnected");
  });

  it("reuses a granted port via getPorts without showing the picker", async () => {
    const device = createPort();
    serial.getPorts.mockResolvedValue([device.port]);
    const link = new WebSerialLink();

    await link.connect(9600, { silent: true });

    expect(serial.requestPort).not.toHaveBeenCalled();
    expect(link.getStatus()).toBe("connected");
  });

  it("stays disconnected on a silent connect with no granted port", async () => {
    const link = new WebSerialLink();

    await link.connect(9600, { silent: true });

    expect(link.getStatus()).toBe("disconnected");
  });

  it("disconnect closes the port without reporting an error", async () => {
    const device = createPort();
    serial.requestPort.mockResolvedValue(device.port);
    const link = new WebSerialLink();
    const errors: Error[] = [];
    link.onError((error) => errors.push(error));
    await link.connect(9600);

    await link.disconnect();
    await tick();

    expect(device.port.close).toHaveBeenCalled();
    expect(link.getStatus()).toBe("disconnected");
    expect(errors).toEqual([]);
  });
});
