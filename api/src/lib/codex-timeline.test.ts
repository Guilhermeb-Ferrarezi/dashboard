import { describe, expect, test } from "bun:test";

import {
  buildCodexTimelineEntryId,
  createCodexFallbackTurnId,
  resolveCodexTurnId,
} from "./codex";

describe("codex timeline ids", () => {
  test("namespace item ids by turn id", () => {
    expect(buildCodexTimelineEntryId("turn-123", "item-456")).toBe("turn-123:item-456");
  });

  test("uses a unique fallback turn id when codex events omit turn ids", () => {
    const firstFallback = createCodexFallbackTurnId("exec-turn");
    const secondFallback = createCodexFallbackTurnId("exec-turn");

    expect(firstFallback).toStartWith("exec-turn:");
    expect(secondFallback).toStartWith("exec-turn:");
    expect(firstFallback).not.toBe(secondFallback);
    expect(resolveCodexTurnId(undefined, null, firstFallback)).toBe(firstFallback);
    expect(resolveCodexTurnId("", null, firstFallback)).toBe(firstFallback);
    expect(resolveCodexTurnId("codex-turn", firstFallback, secondFallback)).toBe("codex-turn");
    expect(resolveCodexTurnId(undefined, "current-turn", firstFallback)).toBe("current-turn");
  });
});
