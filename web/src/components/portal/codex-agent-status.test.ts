// @ts-nocheck
import { describe, expect, test } from "bun:test";

import { formatExecutionMode } from "./codex-agent-status";

describe("codex agent status", () => {
  test("normaliza o modo workspace-write", () => {
    expect(formatExecutionMode("workspace-write")).toBe("workspace write");
  });

  test("mantem modos desconhecidos legiveis", () => {
    expect(formatExecutionMode("exec")).toBe("exec");
  });
});
