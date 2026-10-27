// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BeanImage } from "./bean-image";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const BLUR = "data:image/jpeg;base64,AAAA";

let container: HTMLDivElement;
let root: Root;

function render(bean: Parameters<typeof BeanImage>[0]["bean"]) {
  act(() => {
    root.render(<BeanImage bean={bean} sizes="144px" />);
  });
}

describe("BeanImage", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllEnvs();
  });

  it("renders the stored photo with its blur placeholder", () => {
    render({ name: "Ethiopia", photo_path: "b1/p.jpg", photo_blur: BLUR });

    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("Ethiopia bag");
    expect(img?.getAttribute("src")).toContain("coffee-bag-photos");
    expect(img?.getAttribute("style")).toContain(BLUR);
  });

  it("renders the silhouette when there is no photo", () => {
    render({ name: "Ethiopia", photo_path: null, photo_blur: null });

    expect(container.querySelector("img")).toBeNull();
    expect(
      container.querySelector('[role="img"][aria-label="No bag photo"]'),
    ).not.toBeNull();
  });
});
