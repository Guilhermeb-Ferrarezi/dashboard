import { describe, expect, test } from "bun:test";

import {
  inferCodexCodeLanguage,
  shouldRenderCompactCodexLiteral,
} from "./codex-markdown";

describe("codex markdown helpers", () => {
  test("infer language for documented http endpoints", () => {
    expect(inferCodexCodeLanguage("GET /vct/formacoes", null)).toBe("http");
  });

  test("infer language for shell commands", () => {
    expect(inferCodexCodeLanguage("/bin/sh -lc 'bun run build'", null)).toBe("bash");
  });

  test("render short literal blocks compactly when they have no explicit language", () => {
    expect(shouldRenderCompactCodexLiteral("XV", null)).toBe(true);
    expect(shouldRenderCompactCodexLiteral("GET /vct/formacoes", null)).toBe(true);
    expect(shouldRenderCompactCodexLiteral("const x = 1;\nconsole.log(x);", null)).toBe(false);
    expect(shouldRenderCompactCodexLiteral("GET /vct/formacoes", "http")).toBe(false);
  });
});
