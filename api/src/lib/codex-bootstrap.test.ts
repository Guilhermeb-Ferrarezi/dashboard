import { afterEach, describe, expect, mock, test } from "bun:test";

import { UserAccessToken } from "../models/UserAccessToken";
import { encryptSecret } from "./token-vault";
import { buildCodexAppServerArgs, resolveCodexAuthEnv, resolveCodexExecEnv } from "./codex";

describe("codex bootstrap args", () => {
  const originalFindOne = UserAccessToken.findOne;

  afterEach(() => {
    UserAccessToken.findOne = originalFindOne;
  });

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

  test("repassa o token codex do usuario e a base url dedicada para o modo exec", async () => {
    const originalPort = process.env.PORT;
    const originalInternalApiUrl = process.env.CODEX_INTERNAL_API_URL;
    delete process.env.CODEX_INTERNAL_API_URL;
    process.env.PORT = "4123";

    UserAccessToken.findOne = mock(() => ({
      sort: () => ({
        select: () => ({
          lean: async () => ({
            _id: "token-1",
            userId: "user-123",
            type: "codex",
            label: "Codex",
            encryptedToken: encryptSecret("codex_user_token"),
            revokedAt: null,
            lastUsedAt: null,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          }),
        }),
      }),
    })) as typeof UserAccessToken.findOne;

    const env = await resolveCodexExecEnv("user-123");

    expect(env.CODEX_ACCESS_TOKEN).toBeUndefined();
    expect(env.CODEX_INTERNAL_API_TOKEN).toBe("codex_user_token");
    expect(env.CODEX_INTERNAL_API_URL).toBe("http://127.0.0.1:4123/api");
    expect(env.CODEX_INTERNAL_USER_ID).toBe("user-123");

    process.env.PORT = originalPort;
    process.env.CODEX_INTERNAL_API_URL = originalInternalApiUrl;
  });
});
