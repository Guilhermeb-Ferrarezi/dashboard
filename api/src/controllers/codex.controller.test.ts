import { describe, expect, test } from "bun:test";

import {
  resolveCodexAccountStatus,
  resolveCodexAccountStatusForAdmin,
  resolveCodexThreadList,
} from "./codex.controller";

describe("codex controller fallbacks", () => {
  test("retorna status desconectado quando o Codex falha ao carregar a conta", async () => {
    const account = await resolveCodexAccountStatus(async () => {
      throw new Error("codex indisponivel");
    });

    expect(account).toEqual({
      connected: false,
      authMode: null,
      requiresOpenaiAuth: true,
      planType: null,
      email: null,
      sharedAccountLabel: null,
      codexAccessTokenActive: false,
      codexAccessTokenRequired: false,
      codexAccessBlockedReason: null,
    });
  });

  test("segue usando a conta do Codex quando o acesso delegado esta ativo", async () => {
    let called = false;

    const account = await resolveCodexAccountStatusForAdmin(
      "admin-1",
      async () => {
        called = true;
        return {
          connected: true,
          authMode: "chatgpt",
          requiresOpenaiAuth: false,
          planType: "plus",
          email: "admin@santos.tech",
          sharedAccountLabel: null,
          codexAccessTokenActive: true,
          codexAccessTokenRequired: false,
          codexAccessBlockedReason: null,
        };
      },
      async () => ({
        codexAccessTokenActive: true,
        codexAccessTokenRequired: false,
        codexAccessBlockedReason: null,
        activeToken: null,
      }),
    );

    expect(called).toBe(true);
    expect(account).toEqual({
      connected: true,
      authMode: "chatgpt",
      requiresOpenaiAuth: false,
      planType: "plus",
      email: "admin@santos.tech",
      sharedAccountLabel: null,
      codexAccessTokenActive: true,
      codexAccessTokenRequired: false,
      codexAccessBlockedReason: null,
    });
  });

  test("retorna lista vazia quando o Codex falha ao carregar as threads", async () => {
    const threads = await resolveCodexThreadList("user-1", async () => {
      throw new Error("codex indisponivel");
    });

    expect(threads).toEqual([]);
  });
});
