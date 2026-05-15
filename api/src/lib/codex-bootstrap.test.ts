import { describe, expect, test } from "bun:test";

import { buildCodexAppServerArgs } from "./codex";

describe("codex bootstrap args", () => {
  test("não adiciona bypass por padrão", () => {
    expect(buildCodexAppServerArgs(false, "/app")).toEqual([
      "-C",
      "/app",
      "app-server",
      "--listen",
      "ws://127.0.0.1:4545",
      "-c",
      'cli_auth_credentials_store="file"',
      "-c",
      'forced_login_method="chatgpt"',
    ]);
  });

  test("adiciona bypass quando solicitado", () => {
    expect(buildCodexAppServerArgs(true, "/app")).toEqual([
      "--dangerously-bypass-approvals-and-sandbox",
      "-C",
      "/app",
      "app-server",
      "--listen",
      "ws://127.0.0.1:4545",
      "-c",
      'cli_auth_credentials_store="file"',
      "-c",
      'forced_login_method="chatgpt"',
    ]);
  });
});
