// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSerialLink, setSerialLink } from "@/platform/serial";
import type { CoffeeGrindProfileRow } from "@/modules/coffee/queries";
import { CONFIRMATION_TIMEOUT_MS } from "@/modules/coffee/lib/use-grinder";

import { GrinderPanel } from "./grinder-panel";

vi.mock("@/modules/coffee/actions", () => ({}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const profiles = [
  {
    id: "p1",
    bean_id: "b1",
    label: "Espresso",
    description: null,
    grind_size: 7.5,
  },
] as unknown as CoffeeGrindProfileRow[];

let container: HTMLDivElement;
let root: Root;

async function mount(link: FakeSerialLink) {
  setSerialLink(link);
  await act(async () => {
    root.render(<GrinderPanel beanId="b1" profiles={profiles} />);
  });
}

const button = (name: string) =>
  [...container.querySelectorAll("button")].find((b) =>
    b.textContent?.includes(name),
  ) as HTMLButtonElement | undefined;

async function click(name: string) {
  await act(async () => {
    button(name)!.click();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("navigator", { serial: {} });
  vi.stubGlobal("isSecureContext", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GrinderPanel", () => {
  it("explains and disables when Web Serial is unsupported", async () => {
    vi.stubGlobal("navigator", {});
    await mount(new FakeSerialLink({ unsupported: true }));
    expect(container.textContent).toContain("needs Web Serial");
    expect(button("Send to machine")!.disabled).toBe(true);
  });

  it("disables Send until connected", async () => {
    await mount(new FakeSerialLink());
    expect(button("Send to machine")!.disabled).toBe(true);
    await click("Connect");
    expect(button("Send to machine")!.disabled).toBe(false);
  });

  it("silently reuses a granted port", async () => {
    await mount(new FakeSerialLink({ hasGrantedPort: true }));
    expect(container.textContent).toContain("connected");
    expect(button("Send to machine")!.disabled).toBe(false);
  });

  it("walks sending → accepted → done and shows machine state", async () => {
    const link = new FakeSerialLink({ hasGrantedPort: true });
    await mount(link);
    await click("Send to machine");
    expect(link.written).toEqual(["GRIND 7.50"]);
    expect(container.textContent).toContain("Sent");

    await act(async () => link.emitLine("OK MOVE 3 RESTORED"));
    expect(container.textContent).toContain("Accepted");

    await act(async () => link.emitLine("DONE IDLE 7.5 CONFIRMED"));
    expect(container.textContent).toContain("Done");
    expect(container.textContent).toContain("Position 7.5");
    expect(container.textContent).toContain("CONFIRMED");
  });

  it("shows a neutral note when no OK arrives", async () => {
    await mount(new FakeSerialLink({ hasGrantedPort: true }));
    await click("Send to machine");
    await act(async () => {
      vi.advanceTimersByTime(CONFIRMATION_TIMEOUT_MS + 1);
    });
    expect(container.textContent).toContain("Sent, no confirmation");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("fails on an ERR reply", async () => {
    const link = new FakeSerialLink({ hasGrantedPort: true });
    await mount(link);
    await click("Send to machine");
    await act(async () => link.emitLine("ERR 2 out of range"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "out of range",
    );
  });

  it("fails when the write is rejected", async () => {
    const link = new FakeSerialLink({ hasGrantedPort: true });
    await mount(link);
    link.writeError = new Error("port lost");
    await click("Send to machine");
    expect(container.textContent).toContain("Failed: port lost");
  });

  it("surfaces an unsolicited ERR while idle", async () => {
    const link = new FakeSerialLink({ hasGrantedPort: true });
    await mount(link);
    await act(async () => link.emitLine("ERR 9 stalled"));
    expect(container.textContent).toContain("Machine error: 9 stalled");
  });

  it("offers Home when the state is UNKNOWN and sends HOME", async () => {
    const link = new FakeSerialLink({ hasGrantedPort: true });
    await mount(link);
    expect(button("Home")).toBeUndefined();
    await act(async () => link.emitLine("OK MOVE 0 UNKNOWN"));
    await click("Home");
    expect(link.written).toEqual(["HOME"]);
  });
});
