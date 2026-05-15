import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  getCodexServiceTokenPath,
  readCodexServiceTokenFromRequest,
  resolveCodexServiceToken,
} from "./codex-service-token";

const originalEnv = {
  CODEX_HOME: process.env.CODEX_HOME,
  CODEX_ACCESS_TOKEN: process.env.CODEX_ACCESS_TOKEN,
  CODEX_WORKSPACE_ROOT: process.env.CODEX_WORKSPACE_ROOT,
};

afterEach(() => {
  process.env.CODEX_HOME = originalEnv.CODEX_HOME;
  process.env.CODEX_ACCESS_TOKEN = originalEnv.CODEX_ACCESS_TOKEN;
  process.env.CODEX_WORKSPACE_ROOT = originalEnv.CODEX_WORKSPACE_ROOT;
});

describe("codex service token", () => {
  test("resolve o token persistido quando nao existe env", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-service-token-"));
    process.env.CODEX_WORKSPACE_ROOT = root;
    delete process.env.CODEX_ACCESS_TOKEN;
    delete process.env.CODEX_HOME;

    const first = resolveCodexServiceToken();
    const second = resolveCodexServiceToken();

    expect(first).toBe(second);
    expect(fs.readFileSync(getCodexServiceTokenPath(), "utf8")).toContain(first);
  });

  test("prioriza o token do ambiente quando existe", () => {
    process.env.CODEX_ACCESS_TOKEN = "codex_env_token";

    expect(resolveCodexServiceToken()).toBe("codex_env_token");
  });

  test("lê token delegado do header ou bearer", () => {
    expect(
      readCodexServiceTokenFromRequest({
        "x-codex-access-token": "header-token",
      }),
    ).toBe("header-token");

    expect(
      readCodexServiceTokenFromRequest({
        authorization: "Bearer bearer-token",
      }),
    ).toBe("bearer-token");
  });
});
