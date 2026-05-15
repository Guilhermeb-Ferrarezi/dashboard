import { describe, expect, test } from "bun:test";

import { buildCodexTimelineEntryId } from "./codex";

describe("codex timeline ids", () => {
  test("namespace item ids by turn id", () => {
    expect(buildCodexTimelineEntryId("turn-123", "item-456")).toBe("turn-123:item-456");
  });
});
