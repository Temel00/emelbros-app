import { describe, expect, it } from "vitest";

import {
  formatTime,
  LINE_ENDINGS,
  showControl,
  toHex,
} from "@/modules/dev-tools/tools/bluetooth-serial/lib/format";

describe("bluetooth-serial format", () => {
  it("maps each line ending to its characters", () => {
    expect(LINE_ENDINGS).toEqual({
      none: "",
      LF: "\n",
      CR: "\r",
      CRLF: "\r\n",
    });
  });

  it("makes CR and LF visible", () => {
    expect(showControl("OK\r\n")).toBe("OK\\r\\n");
  });

  it("renders UTF-8 bytes as spaced hex", () => {
    expect(toHex("OK\n")).toBe("4f 4b 0a");
    expect(toHex("é")).toBe("c3 a9");
    expect(toHex("")).toBe("");
  });

  it("formats a timestamp to milliseconds", () => {
    expect(formatTime(new Date("2026-01-02T03:04:05.067Z"))).toBe(
      "03:04:05.067",
    );
  });
});
