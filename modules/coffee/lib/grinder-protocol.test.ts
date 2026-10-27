import { describe, expect, it } from "vitest";

import { grindCommand, homeCommand, parseReply } from "./grinder-protocol";

describe("grinder commands", () => {
  it("formats GRIND with two decimals", () => {
    expect(grindCommand(12)).toBe("GRIND 12.00");
    expect(grindCommand(7.5)).toBe("GRIND 7.50");
    expect(grindCommand(3.456)).toBe("GRIND 3.46");
  });

  it("formats HOME", () => {
    expect(homeCommand()).toBe("HOME");
  });
});

describe("parseReply", () => {
  it("parses OK MOVE", () => {
    expect(parseReply("OK MOVE 4.5 RESTORED")).toEqual({
      kind: "ok",
      from: 4.5,
      state: "RESTORED",
    });
  });

  it("parses DONE IDLE", () => {
    expect(parseReply("DONE IDLE 12.00 CONFIRMED")).toEqual({
      kind: "done",
      position: 12,
      state: "CONFIRMED",
    });
  });

  it("parses ERR with and without a message", () => {
    expect(parseReply("ERR 3 out of range")).toEqual({
      kind: "err",
      code: "3",
      message: "out of range",
    });
    expect(parseReply("ERR")).toEqual({ kind: "err", code: "", message: "" });
  });

  it("ignores other and malformed lines", () => {
    expect(parseReply("PROFILE A steps=10")).toBeNull();
    expect(parseReply("OK MOVE x UNKNOWN")).toBeNull();
    expect(parseReply("DONE IDLE 3 BOGUS")).toBeNull();
    expect(parseReply("")).toBeNull();
  });
});
