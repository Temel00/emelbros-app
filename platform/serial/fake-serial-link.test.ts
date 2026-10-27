import { afterEach, describe, expect, it } from "vitest";

import { FakeSerialLink } from "@/platform/serial/fake-serial-link";
import {
  getSerialLink,
  restoreSerialLink,
  setSerialLink,
} from "@/platform/serial/serial-store";
import type { SerialStatus } from "@/platform/serial/serial-link";

function record(link: FakeSerialLink) {
  const statuses: SerialStatus[] = [];
  const lines: string[] = [];
  const errors: Error[] = [];
  link.onStatus((status) => statuses.push(status));
  link.onLine((line) => lines.push(line));
  link.onError((error) => errors.push(error));
  return { statuses, lines, errors };
}

describe("FakeSerialLink lifecycle", () => {
  it("connects, writes, receives scripted lines, disconnects", async () => {
    const link = new FakeSerialLink({
      reply: (written) => (written === "PING" ? ["PONG"] : []),
    });
    const seen = record(link);

    await link.connect(9600);
    await link.write("PING");
    await link.disconnect();

    expect(seen.statuses).toEqual(["connecting", "connected", "disconnected"]);
    expect(link.written).toEqual(["PING"]);
    expect(seen.lines).toEqual(["PONG"]);
  });

  it("rejects connect and ends disconnected when open fails", async () => {
    const link = new FakeSerialLink();
    link.connectError = new Error("open failed");
    const seen = record(link);

    await expect(link.connect(9600)).rejects.toThrow("open failed");

    expect(link.getStatus()).toBe("disconnected");
    expect(seen.statuses).toEqual(["connecting", "disconnected"]);
  });

  it("reports a lost device and goes disconnected", async () => {
    const link = new FakeSerialLink();
    const seen = record(link);
    await link.connect(9600);

    link.fail(new Error("NetworkError: The device has been lost."));

    expect(link.getStatus()).toBe("disconnected");
    expect(seen.errors.map((e) => e.message)).toEqual([
      "NetworkError: The device has been lost.",
    ]);
    await expect(link.write("HOME")).rejects.toThrow("not connected");
  });

  it("drops the link when a write fails", async () => {
    const link = new FakeSerialLink();
    await link.connect(9600);
    link.writeError = new Error("write failed");

    await expect(link.write("HOME")).rejects.toThrow("write failed");
    expect(link.getStatus()).toBe("disconnected");
  });

  it("reuses a granted port silently, and stays disconnected without one", async () => {
    const without = new FakeSerialLink();
    await without.connect(9600, { silent: true });
    expect(without.getStatus()).toBe("disconnected");

    const granted = new FakeSerialLink({ hasGrantedPort: true });
    await granted.connect(9600, { silent: true });
    expect(granted.getStatus()).toBe("connected");
  });

  it("reports unsupported and refuses to connect", async () => {
    const link = new FakeSerialLink({ unsupported: true });
    expect(link.getStatus()).toBe("unsupported");
    await expect(link.connect(9600)).rejects.toThrow("not available");
  });
});

describe("serial store", () => {
  afterEach(() => {
    setSerialLink(new FakeSerialLink());
  });

  it("serves the swapped-in link", () => {
    const fake = new FakeSerialLink();
    setSerialLink(fake);
    expect(getSerialLink()).toBe(fake);
  });

  it("restoreSerialLink reopens a granted port and only acts when disconnected", async () => {
    const fake = new FakeSerialLink({ hasGrantedPort: true });
    setSerialLink(fake);

    await restoreSerialLink(9600);
    expect(fake.getStatus()).toBe("connected");

    await restoreSerialLink(9600);
    expect(fake.getStatus()).toBe("connected");
  });

  it("restoreSerialLink leaves the link disconnected when reopen fails", async () => {
    const fake = new FakeSerialLink({ hasGrantedPort: true });
    fake.connectError = new Error("open rejected");
    setSerialLink(fake);

    await restoreSerialLink(9600);

    expect(fake.getStatus()).toBe("disconnected");
  });
});
