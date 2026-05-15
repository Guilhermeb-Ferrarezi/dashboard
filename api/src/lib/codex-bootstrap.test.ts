import { describe, expect, test } from "bun:test";

import { buildCodexAppServerArgs, resolveCodexAuthEnv } from "./codex";

describe("codex bootstrap args", () => {
  test("adiciona bypass por padrão", () => {
    expect(buildCodexAppServerArgs(undefined, "/app")).toEqual([
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

  test("não adiciona bypass quando desligado explicitamente", () => {
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

  test("nao repassa o token interno para o processo codex", () => {
    const originalToken = process.env.CODEX_ACCESS_TOKEN;
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";

    const env = resolveCodexAuthEnv();

    expect(env.CODEX_ACCESS_TOKEN).toBeUndefined();

    process.env.CODEX_ACCESS_TOKEN = originalToken;
  });
});
