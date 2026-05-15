import { describe, expect, test } from "bun:test";

import { buildCodexAppServerArgs, resolveCodexAuthEnv, resolveCodexExecEnv } from "./codex";

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

  test("repassa token e base url dedicados para o modo exec", () => {
    const originalToken = process.env.CODEX_ACCESS_TOKEN;
    const originalPort = process.env.PORT;
    const originalInternalApiUrl = process.env.CODEX_INTERNAL_API_URL;
    delete process.env.CODEX_INTERNAL_API_URL;
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";
    process.env.PORT = "4123";

    const env = resolveCodexExecEnv();

    expect(env.CODEX_ACCESS_TOKEN).toBeUndefined();
    expect(env.CODEX_INTERNAL_API_TOKEN).toBe("codex_service_token");
    expect(env.CODEX_INTERNAL_API_URL).toBe("http://127.0.0.1:4123/api");

    process.env.CODEX_ACCESS_TOKEN = originalToken;
    process.env.PORT = originalPort;
    process.env.CODEX_INTERNAL_API_URL = originalInternalApiUrl;
  });
});
